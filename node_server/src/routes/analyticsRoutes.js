const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get("/teams/:teamId/roster", asyncHandler(analyticsController.getTeamRoster));
router.get("/teams/:teamId/dashboard", asyncHandler(analyticsController.getTeamDashboard));
router.get("/players/:playerId/summary", asyncHandler(analyticsController.getPlayerSummary));
router.post("/matches/:matchId/finalize-ranking", asyncHandler(analyticsController.finalizeMatchRanking));

module.exports = router;
