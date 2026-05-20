const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const { request } = require("../testSupport/httpApp");
const { errorHandler } = require("../middleware/errorHandler");

process.env.NODE_ENV = "test";

function loadAnalyticsRouter(query) {
  const dbPath = require.resolve("../config/db");
  const routePath = require.resolve("../routes/analyticsRoutes");
  const srcRoutePath = require.resolve("../src/routes/analyticsRoutes");
  const controllerPath = require.resolve("../src/controllers/analyticsController");
  const servicePath = require.resolve("../src/services/analyticsService");

  delete require.cache[routePath];
  delete require.cache[srcRoutePath];
  delete require.cache[controllerPath];
  delete require.cache[servicePath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { query },
  };

  return require("../routes/analyticsRoutes");
}

function createApp(router) {
  const app = express();

  app.use(express.json());
  app.use(router);
  app.use(errorHandler);

  return app;
}

test("analytics roster returns team members ordered for display", async () => {
  const calls = [];
  const router = loadAnalyticsRouter(async (sql, params) => {
    calls.push({ sql, params });
    return [{ id: 9, name: "Mika", jersey_number: 4 }];
  });

  const response = await request(createApp(router), { path: "/teams/12/roster" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ id: 9, name: "Mika", jersey_number: 4 }]);
  assert.match(calls[0].sql, /FROM team_members tm/);
  assert.match(calls[0].sql, /ORDER BY u\.jersey_number IS NULL/);
  assert.deepEqual(calls[0].params, ["12"]);
});

test("analytics dashboard combines team, record, attendance, and rankings", async () => {
  const calls = [];
  const results = [
    [{ id: 3, team_name: "NetMind" }],
    [{ matches_played: 4, wins: 3, losses: 1 }],
    [{ status: "present", total: 8 }],
    [{ ranking_position: 1, season_name: "Summer" }],
  ];
  const router = loadAnalyticsRouter(async (sql, params) => {
    calls.push({ sql, params });
    return results.shift();
  });

  const response = await request(createApp(router), { path: "/teams/3/dashboard" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    team: { id: 3, team_name: "NetMind" },
    record: { matches_played: 4, wins: 3, losses: 1 },
    attendance: [{ status: "present", total: 8 }],
    rankings: [{ ranking_position: 1, season_name: "Summer" }],
  });
  assert.deepEqual(calls.map((call) => call.params), [["3"], ["3"], ["3"], ["3"]]);
});

test("player summary applies optional season filter to performance queries", async () => {
  const calls = [];
  const results = [
    [{ id: 21, name: "Kai", role: "player" }],
    [{ action_type: "serve", result: "success", total: 7 }],
    [{ avg_rpe: 6, avg_energy_level: 8 }],
    [{ avg_fatigue: 3, avg_sleep_hours: 7.5, last_checkin_date: "2026-05-19" }],
    [{ total_assignments: 5, completed: 4, overdue: 1 }],
    [{ avg_success_rate: 82, total_reps: 120 }],
    [{ id: 2, injury_type: "ankle" }],
  ];
  const router = loadAnalyticsRouter(async (sql, params) => {
    calls.push({ sql, params });
    return results.shift();
  });

  const response = await request(createApp(router), {
    path: "/players/21/summary?season_id=6",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.wellness, {
    avg_rpe: 6,
    avg_energy_level: 8,
    avg_fatigue: 3,
    avg_sleep_hours: 7.5,
    last_checkin_date: "2026-05-19",
  });
  assert.deepEqual(response.body.active_injuries, [{ id: 2, injury_type: "ankle" }]);
  assert.match(calls[1].sql, /WHERE user_id = \? AND season_id = \?/);
  assert.match(calls[2].sql, /WHERE user_id = \? AND season_id = \?/);
  assert.deepEqual(calls[1].params, ["21", "6"]);
  assert.deepEqual(calls[2].params, ["21", "6"]);
});

test("finalize ranking rejects matches that cannot be ranked", async () => {
  const router = loadAnalyticsRouter(async () => [{ id: 15, season_id: null, result: "win" }]);

  const response = await request(createApp(router), {
    method: "POST",
    path: "/matches/15/finalize-ranking",
    body: { ranking_position: 2 },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    message: "Match must exist and include season_id plus result",
  });
});

test("finalize ranking upserts a ranking summary and returns the stored ranking", async () => {
  const calls = [];
  const results = [
    [{ id: 15, team_id: 4, season_id: 2, result: "win" }],
    [{ wins: 5, losses: 1, win_percentage: 83.33, points_for: 410, points_against: 350, point_difference: 60 }],
    { affectedRows: 1 },
    [{ team_id: 4, season_id: 2, ranking_position: 2, wins: 5 }],
  ];
  const router = loadAnalyticsRouter(async (sql, params) => {
    calls.push({ sql, params });
    return results.shift();
  });

  const response = await request(createApp(router), {
    method: "POST",
    path: "/matches/15/finalize-ranking",
    body: { ranking_position: 2 },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { team_id: 4, season_id: 2, ranking_position: 2, wins: 5 });
  assert.match(calls[2].sql, /INSERT INTO team_rankings/);
  assert.deepEqual(calls[2].params, [4, 2, 2, 5, 1, 83.33, 410, 350, 60]);
  assert.deepEqual(calls[3].params, [4, 2]);
});
