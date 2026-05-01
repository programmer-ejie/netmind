const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required" });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const users = await query(
    "SELECT id, name, email, role, position, jersey_number, is_active, created_at FROM users WHERE id = ? AND is_active = TRUE",
    [decoded.id]
  );

  if (!users.length) {
    return res.status(401).json({ message: "User is no longer active" });
  }

  req.user = users[0];
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission for this action" });
  }

  next();
};

module.exports = {
  protect,
  authorize,
};
