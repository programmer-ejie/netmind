const express = require("express");
const { body, validationResult } = require("express-validator");
const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const router = express.Router();

function assertValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array().map((error) => error.msg).join(", "));
  }
}

function parseData(value) {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function parseNotification(row) {
  return {
    ...row,
    data: parseData(row.data),
    is_read: Boolean(row.is_read),
  };
}

router.get("/notifications", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT *
    FROM notifications
    WHERE recipient_user_id = ?
    ORDER BY created_at DESC
    LIMIT 100`,
    [req.user.id]
  );

  res.json({ data: rows.map(parseNotification) });
}));

router.patch("/notifications/:id/read", asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE notifications
    SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    WHERE id = ? AND recipient_user_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!result.affectedRows) {
    throw new ApiError(404, "Notification not found");
  }

  const [notification] = await query("SELECT * FROM notifications WHERE id = ?", [req.params.id]);
  res.json(parseNotification(notification));
}));

router.post("/notifications/read-all", asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE notifications
    SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    WHERE recipient_user_id = ? AND is_read = FALSE`,
    [req.user.id]
  );

  res.json({ updated: result.affectedRows });
}));

router.post(
  "/push-subscriptions",
  [
    body("push_token").optional().isString(),
    body("endpoint").optional().isString(),
    body("platform").optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    assertValid(req);

    const pushToken = req.body.push_token || req.body.endpoint;
    if (!pushToken) {
      throw new ApiError(400, "push_token or endpoint is required");
    }

    await query(
      `INSERT INTO push_subscriptions (user_id, platform, push_token, endpoint)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (endpoint) DO UPDATE SET
        platform = EXCLUDED.platform,
        push_token = EXCLUDED.push_token,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, req.body.platform || null, req.body.push_token || null, req.body.endpoint || pushToken]
    );

    res.status(201).json({ ok: true });
  })
);

module.exports = router;
