const express = require("express");
const cors = require("cors");
require("dotenv").config({ quiet: true });

const analyticsRoutes = require("./routes/analyticsRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const authRoutes = require("./routes/authRoutes");
const crudRoutes = require("./routes/crudRoutes");
const profileRoutes = require("./routes/profileRoutes");
const wellnessRoutes = require("./routes/wellnessRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "NetMind API is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", profileRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", wellnessRoutes);
app.use("/api", workflowRoutes);
app.use("/api", crudRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
