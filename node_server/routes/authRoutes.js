const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { pool, query } = require("../config/db");
const { protect } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { sendTemporaryPasswordEmail } = require("../utils/emailService");

const router = express.Router();

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

function generateTemporaryPassword(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const bytes = crypto.randomBytes(length);

  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

router.post(
  "/register-coach",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
  ],
  asyncHandler(async (req, res) => {
    assertValid(req);

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);

    if (existing.length) {
      throw new ApiError(409, "Email is already registered");
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'coach')",
        [name, email, passwordHash]
      );
      const [rows] = await connection.execute(
        "SELECT id, name, email, role, position, jersey_number, is_active, created_at FROM users WHERE id = ?",
        [result.insertId]
      );
      const user = rows[0];

      try {
        await sendTemporaryPasswordEmail({
          to: email,
          name,
          password: temporaryPassword,
        });
      } catch {
        throw new ApiError(502, "Unable to send the temporary password email. Check Gmail sender settings.");
      }

      await connection.commit();

      res.status(201).json({
        message: "Coach account created. Temporary password sent to email.",
        user,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").isIn(["coach", "trainer", "player"]).withMessage("Role must be coach, trainer, or player"),
    body("position").optional({ nullable: true }).isIn(["OH", "OPP", "MB", "S", "L"]),
  ],
  asyncHandler(async (req, res) => {
    assertValid(req);

    const { name, email, password, role, position = null, jersey_number = null } = req.body;
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);

    if (existing.length) {
      throw new ApiError(409, "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      "INSERT INTO users (name, email, password_hash, role, position, jersey_number) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, passwordHash, role, position, jersey_number]
    );
    const rows = await query(
      "SELECT id, name, email, role, position, jersey_number, is_active, created_at FROM users WHERE id = ?",
      [result.insertId]
    );
    const user = rows[0];

    res.status(201).json({
      user,
      token: signToken(user),
    });
  })
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(async (req, res) => {
    assertValid(req);

    const rows = await query("SELECT * FROM users WHERE email = ? AND is_active = TRUE", [req.body.email]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) {
      throw new ApiError(401, "Invalid email or password");
    }

    delete user.password_hash;

    res.json({
      user,
      token: signToken(user),
    });
  })
);

router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;
