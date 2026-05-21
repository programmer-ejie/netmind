const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { performance } = require("perf_hooks");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { pool, query } = require("../config/db");
const { protect } = require("../middleware/auth");
const {
  createRateLimiter,
  envNumber,
  getClientIp,
  normalizeRateKeyPart,
} = require("../middleware/rateLimit");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { sendTemporaryPasswordEmail } = require("../utils/emailService");

const router = express.Router();
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

const authEmailKey = (req) => `${getClientIp(req)}:${normalizeRateKeyPart(req.body?.email) || "no-email"}`;
const registrationLimiter = createRateLimiter({
  name: "auth-register",
  windowMs: envNumber("REGISTER_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
  max: envNumber("REGISTER_RATE_LIMIT_MAX", 20),
  keyGenerator: authEmailKey,
  message: "Too many registration attempts. Try again later.",
});
const loginLimiter = createRateLimiter({
  name: "auth-login",
  windowMs: envNumber("LOGIN_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  max: envNumber("LOGIN_RATE_LIMIT_MAX", 10),
  keyGenerator: authEmailKey,
  message: "Too many login attempts. Try again later.",
});

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
}

function assertValid(req) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array().map((error) => error.msg).join(", "));
  }
}

function authTiming(label, start, parts = {}) {
  if (process.env.AUTH_TIMING !== "true") return;

  console.log(`[auth:${label}]`, {
    total_ms: Math.round(performance.now() - start),
    ...parts,
  });
}

function generateTemporaryPassword(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const bytes = crypto.randomBytes(length);

  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function logEmailFailure(context, error) {
  const port = Number(process.env.EMAIL_PORT || 465);
  const secure = process.env.EMAIL_SECURE
    ? String(process.env.EMAIL_SECURE).toLowerCase() === "true"
    : true;

  console.error(`[email:${context}:failed]`, {
    reason: error?.response || error?.message || "Unknown SMTP error",
    smtp: {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port,
      secure,
      user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : undefined,
      forceIpv4: process.env.EMAIL_FORCE_IPV4 !== "false",
    },
    code: error?.code,
    command: error?.command,
    responseCode: error?.responseCode,
    response: error?.response,
    attempts: error?.smtpAttempts,
    message: error?.message,
    syscall: error?.syscall,
    address: error?.address,
    port: error?.port,
    cause: error?.cause?.message,
  });
}

router.post(
  "/register-coach",
  registrationLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
  ],
  asyncHandler(async (req, res) => {
    const startedAt = performance.now();
    let dbCheckMs = 0;
    let hashMs = 0;
    let dbInsertMs = 0;
    let emailMs = 0;

    assertValid(req);

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const dbCheckStartedAt = performance.now();
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    dbCheckMs = Math.round(performance.now() - dbCheckStartedAt);

    if (existing.length) {
      authTiming("register-coach:duplicate", startedAt, { db_check_ms: dbCheckMs });
      throw new ApiError(409, "Email is already registered");
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashStartedAt = performance.now();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    hashMs = Math.round(performance.now() - hashStartedAt);
    const connection = await pool.getConnection();
    let user;

    try {
      const dbInsertStartedAt = performance.now();
      await connection.beginTransaction();

      const [result] = await connection.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'coach')",
        [name, email, passwordHash]
      );
      const [rows] = await connection.execute(
        "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE id = ?",
        [result.insertId]
      );
      user = rows[0];

      await connection.commit();
      dbInsertMs = Math.round(performance.now() - dbInsertStartedAt);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    try {
      const emailStartedAt = performance.now();
      await sendTemporaryPasswordEmail({
        to: email,
        name,
        password: temporaryPassword,
      });
      emailMs = Math.round(performance.now() - emailStartedAt);
    } catch (error) {
      logEmailFailure("temporary-password-coach", error);

      if (user?.id) {
        await query("DELETE FROM users WHERE id = ? AND role = 'coach'", [user.id]);
      }

      throw new ApiError(502, "Unable to send the temporary password email. Check Gmail sender settings.");
    }

    authTiming("register-coach", startedAt, {
      db_check_ms: dbCheckMs,
      hash_ms: hashMs,
      db_insert_ms: dbInsertMs,
      email_ms: emailMs,
    });

    res.status(201).json({
      message: "Coach account created. Temporary password sent to email.",
      user,
    });
  })
);

router.post(
  "/register-trainer",
  registrationLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("coach_id").optional({ nullable: true }).isInt().withMessage("Coach ID must be a number"),
  ],
  asyncHandler(async (req, res) => {
    const startedAt = performance.now();
    let dbCheckMs = 0;
    let hashMs = 0;
    let dbInsertMs = 0;
    let emailMs = 0;

    assertValid(req);

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const coachId = req.body.coach_id || null;
    const dbCheckStartedAt = performance.now();
    const existing = await query(
      "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE email = ?",
      [email]
    );
    dbCheckMs = Math.round(performance.now() - dbCheckStartedAt);

    if (existing.length) {
      if (existing[0].role === "trainer" && coachId) {
        await query(
          `INSERT INTO coach_trainers (coach_id, trainer_id)
          VALUES (?, ?)
          ON CONFLICT (coach_id, trainer_id)
          DO UPDATE SET created_at = CURRENT_TIMESTAMP`,
          [coachId, existing[0].id]
        );

        authTiming("register-trainer:linked-existing", startedAt, { db_check_ms: dbCheckMs });
        return res.json({
          message: "Trainer account already exists and is now linked to this coach.",
          user: existing[0],
        });
      }

      authTiming("register-trainer:duplicate", startedAt, { db_check_ms: dbCheckMs });
      throw new ApiError(409, "Email is already registered");
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashStartedAt = performance.now();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    hashMs = Math.round(performance.now() - hashStartedAt);
    const connection = await pool.getConnection();
    let user;

    try {
      const dbInsertStartedAt = performance.now();
      await connection.beginTransaction();

      const [result] = await connection.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'trainer')",
        [name, email, passwordHash]
      );
      const [rows] = await connection.execute(
        "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE id = ?",
        [result.insertId]
      );
      user = rows[0];

      if (coachId) {
        await connection.execute(
          `INSERT INTO coach_trainers (coach_id, trainer_id)
          VALUES (?, ?)
          ON CONFLICT (coach_id, trainer_id)
          DO UPDATE SET created_at = CURRENT_TIMESTAMP`,
          [coachId, user.id]
        );
      }

      await connection.commit();
      dbInsertMs = Math.round(performance.now() - dbInsertStartedAt);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    try {
      const emailStartedAt = performance.now();
      await sendTemporaryPasswordEmail({
        to: email,
        name,
        password: temporaryPassword,
      });
      emailMs = Math.round(performance.now() - emailStartedAt);
    } catch (error) {
      logEmailFailure("temporary-password-trainer", error);

      if (user?.id) {
        await query("DELETE FROM users WHERE id = ? AND role = 'trainer'", [user.id]);
      }

      throw new ApiError(502, "Unable to send the temporary password email. Check Gmail sender settings.");
    }

    authTiming("register-trainer", startedAt, {
      db_check_ms: dbCheckMs,
      hash_ms: hashMs,
      db_insert_ms: dbInsertMs,
      email_ms: emailMs,
    });

    res.status(201).json({
      message: "Trainer account created. Temporary password sent to email.",
      user,
    });
  })
);

router.post(
  "/register-player",
  registrationLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("position").optional({ nullable: true }).isIn(["OH", "OPP", "MB", "S", "L"]),
  ],
  asyncHandler(async (req, res) => {
    const startedAt = performance.now();
    let dbCheckMs = 0;
    let hashMs = 0;
    let dbInsertMs = 0;
    let emailMs = 0;

    assertValid(req);

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const position = req.body.position || null;
    const jerseyNumber = req.body.jersey_number || null;
    const dbCheckStartedAt = performance.now();
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    dbCheckMs = Math.round(performance.now() - dbCheckStartedAt);

    if (existing.length) {
      authTiming("register-player:duplicate", startedAt, { db_check_ms: dbCheckMs });
      throw new ApiError(409, "Email is already registered");
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashStartedAt = performance.now();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    hashMs = Math.round(performance.now() - hashStartedAt);
    const connection = await pool.getConnection();
    let user;

    try {
      const dbInsertStartedAt = performance.now();
      await connection.beginTransaction();

      const [result] = await connection.execute(
        "INSERT INTO users (name, email, password_hash, role, position, jersey_number) VALUES (?, ?, ?, 'player', ?, ?)",
        [name, email, passwordHash, position, jerseyNumber]
      );
      const [rows] = await connection.execute(
        "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE id = ?",
        [result.insertId]
      );
      user = rows[0];

      await connection.commit();
      dbInsertMs = Math.round(performance.now() - dbInsertStartedAt);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    try {
      const emailStartedAt = performance.now();
      await sendTemporaryPasswordEmail({
        to: email,
        name,
        password: temporaryPassword,
      });
      emailMs = Math.round(performance.now() - emailStartedAt);
    } catch (error) {
      logEmailFailure("temporary-password-player", error);

      if (user?.id) {
        await query("DELETE FROM users WHERE id = ? AND role = 'player'", [user.id]);
      }

      throw new ApiError(502, "Unable to send the temporary password email. Check Gmail sender settings.");
    }

    authTiming("register-player", startedAt, {
      db_check_ms: dbCheckMs,
      hash_ms: hashMs,
      db_insert_ms: dbInsertMs,
      email_ms: emailMs,
    });

    res.status(201).json({
      message: "Player account created. Temporary password sent to email.",
      user,
    });
  })
);

router.post(
  "/register",
  registrationLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").isIn(["coach", "trainer", "player"]).withMessage("Role must be coach, trainer, or player"),
    body("position").optional({ nullable: true }).isIn(["OH", "OPP", "MB", "S", "L"]),
  ],
  asyncHandler(async (req, res) => {
    const startedAt = performance.now();
    let dbCheckMs = 0;
    let hashMs = 0;

    assertValid(req);

    const { name, email, password, role, position = null, jersey_number = null } = req.body;
    const dbCheckStartedAt = performance.now();
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    dbCheckMs = Math.round(performance.now() - dbCheckStartedAt);

    if (existing.length) {
      authTiming("register:duplicate", startedAt, { db_check_ms: dbCheckMs });
      throw new ApiError(409, "Email is already registered");
    }

    const hashStartedAt = performance.now();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    hashMs = Math.round(performance.now() - hashStartedAt);
    const result = await query(
      "INSERT INTO users (name, email, password_hash, role, position, jersey_number) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, passwordHash, role, position, jersey_number]
    );
    const rows = await query(
      "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE id = ?",
      [result.insertId]
    );
    const user = rows[0];

    authTiming("register", startedAt, {
      db_check_ms: dbCheckMs,
      hash_ms: hashMs,
    });

    res.status(201).json({
      user,
      token: signToken(user),
    });
  })
);

router.post(
  "/login",
  loginLimiter,
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(async (req, res) => {
    const startedAt = performance.now();
    let dbMs = 0;
    let compareMs = 0;
    let tokenMs = 0;

    assertValid(req);

    const email = req.body.email.trim().toLowerCase();
    const dbStartedAt = performance.now();
    const rows = await query(
      `SELECT id, name, email, password_hash, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at
      FROM users
      WHERE email = ? AND is_active = TRUE
      LIMIT 1`,
      [email]
    );
    dbMs = Math.round(performance.now() - dbStartedAt);
    const user = rows[0];

    const compareStartedAt = performance.now();
    const passwordMatches = user
      ? await bcrypt.compare(req.body.password, user.password_hash)
      : false;
    compareMs = Math.round(performance.now() - compareStartedAt);

    if (!user || !passwordMatches) {
      authTiming("login:failed", startedAt, { db_ms: dbMs, compare_ms: compareMs });
      throw new ApiError(401, "Invalid email or password");
    }

    const shouldRehash = bcrypt.getRounds(user.password_hash) !== BCRYPT_ROUNDS;
    const userId = user.id;
    delete user.password_hash;
    const tokenStartedAt = performance.now();
    const token = signToken(user);
    tokenMs = Math.round(performance.now() - tokenStartedAt);

    authTiming("login", startedAt, {
      db_ms: dbMs,
      compare_ms: compareMs,
      token_ms: tokenMs,
    });

    res.json({
      user,
      token,
    });

    if (shouldRehash) {
      setImmediate(async () => {
        try {
          const updatedHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
          await query("UPDATE users SET password_hash = ? WHERE id = ?", [updatedHash, userId]);
        } catch (error) {
          if (process.env.AUTH_TIMING === "true") {
            console.error("[auth:rehash-failed]", error.message);
          }
        }
      });
    }
  })
);

router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;
