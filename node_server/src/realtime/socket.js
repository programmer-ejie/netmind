const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { query } = require("../config/db");
const { setSocketServer } = require("../services/notificationService");

const userRoom = (userId) => `user:${userId}`;

function getCorsOptions() {
  const origins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin: origins.length
      ? origins
      : [
          "http://localhost:3000",
          "http://localhost:5000",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:8081",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:5000",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5174",
          "http://127.0.0.1:8081",
        ],
  };
}

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return next(new Error("Authentication token is required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query(
      "SELECT id, name, email, role FROM users WHERE id = ? AND is_active = TRUE",
      [decoded.id]
    );

    if (!users.length) return next(new Error("User is no longer active"));

    socket.user = users[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

function setupSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: getCorsOptions(),
  });

  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    socket.join(userRoom(socket.user.id));
    socket.emit("notifications:connected", { userId: socket.user.id });
  });

  setSocketServer(io);
  return io;
}

module.exports = {
  setupSocketServer,
  userRoom,
};
