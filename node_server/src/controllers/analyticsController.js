const analyticsService = require("../services/analyticsService");

async function getTeamRoster(req, res) {
  res.json(await analyticsService.getTeamRoster(req.params.teamId));
}

async function getTeamDashboard(req, res) {
  res.json(await analyticsService.getTeamDashboard(req.params.teamId));
}

async function getPlayerSummary(req, res) {
  res.json(await analyticsService.getPlayerSummary(req.params.playerId, req.query.season_id));
}

async function finalizeMatchRanking(req, res) {
  const ranking = await analyticsService.finalizeMatchRanking(
    req.params.matchId,
    req.body.ranking_position || 1
  );

  res.json(ranking);
}

module.exports = {
  finalizeMatchRanking,
  getPlayerSummary,
  getTeamDashboard,
  getTeamRoster,
};
