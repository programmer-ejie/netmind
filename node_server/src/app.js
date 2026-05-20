const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");
const { protect } = require("./middleware/auth");
const { authorizeKnownApiAccess } = require("./middleware/authorization");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const defaultCorsOrigins = [
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
];

function createCorsMiddleware() {
  const allowedCorsOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigins = new Set(allowedCorsOrigins.length ? allowedCorsOrigins : defaultCorsOrigins);

  return cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  });
}

const publicApiRoutes = [
  { method: "GET", pattern: /^\/profile-pictures\/[^/]+$/ },
  { method: "GET", pattern: /^\/team-logos\/[^/]+$/ },
  { method: "GET", pattern: /^\/attendance-qr\/[^/]+$/ },
];

function protectPrivateApiRoutes(req, res, next) {
  const isPublicRoute = publicApiRoutes.some(
    (route) => route.method === req.method && route.pattern.test(req.path)
  );

  if (isPublicRoute) {
    return next();
  }

  return protect(req, res, next);
}

function createApp() {
  const app = express();

  app.use(createCorsMiddleware());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({ message: "NetMind API is running" });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", apiRoutes.auth);
  app.use("/api", protectPrivateApiRoutes);
  app.use("/api", authorizeKnownApiAccess());
  app.use("/api", apiRoutes.profile);
  app.use("/api", apiRoutes.analytics);
  app.use("/api", apiRoutes.wellness);
  app.use("/api", apiRoutes.workflow);
  app.use("/api", apiRoutes.notifications);
  app.use("/api", apiRoutes.crud);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
  createCorsMiddleware,
  protectPrivateApiRoutes,
};
