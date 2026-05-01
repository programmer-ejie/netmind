# NetMind

Node.js + MySQL backend for a volleyball analytics app.

## Run

```bash
cd node_server
npm install
npm run db:init
npm run dev
```

If PowerShell blocks `npm`, use `npm.cmd run dev`.

## Environment

Create `node_server/.env` with:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=netmind
JWT_SECRET=change_me
JWT_EXPIRE=7d
```

## Main API

Route catalog:

```text
GET /api/routes
```

Auth:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

CRUD resources:

```text
/api/users
/api/teams
/api/team-members
/api/team-trainers
/api/coach-trainers
/api/seasons
/api/matches
/api/team-rankings
/api/drills
/api/training-assignments
/api/drill-performance-logs
/api/performance-logs
/api/attendance-logs
/api/injury-logs
/api/lineups
/api/player-comparisons
```

Each CRUD resource supports:

```text
GET    /api/<resource>
GET    /api/<resource>/:id
POST   /api/<resource>
PATCH  /api/<resource>/:id
DELETE /api/<resource>/:id
```

Extra volleyball actions:

```text
GET  /api/players
GET  /api/coaches
GET  /api/trainers
GET  /api/teams/:teamId/roster
GET  /api/teams/:teamId/dashboard
GET  /api/teams/:teamId/members
POST /api/teams/:teamId/members
GET  /api/teams/:teamId/trainers
POST /api/teams/:teamId/trainers
GET  /api/teams/:teamId/seasons
POST /api/teams/:teamId/seasons
GET  /api/teams/:teamId/matches
POST /api/teams/:teamId/matches
PATCH /api/matches/:matchId/score
POST /api/drills/:drillId/assign
GET  /api/players/:playerId/training-assignments
PATCH /api/training-assignments/:assignmentId/status
POST /api/training-assignments/:assignmentId/logs
GET  /api/players/:playerId/performance-logs
POST /api/players/:playerId/performance-logs
GET  /api/teams/:teamId/attendance
POST /api/attendance-logs/bulk
GET  /api/players/:playerId/summary
GET  /api/players/:playerId/injuries
POST /api/players/:playerId/injuries
PATCH /api/injury-logs/:injuryId/recover
GET  /api/teams/:teamId/lineups
POST /api/teams/:teamId/lineups
GET  /api/teams/:teamId/rankings
POST /api/seasons/:seasonId/rankings/recalculate
GET  /api/teams/:teamId/player-comparisons
POST /api/teams/:teamId/player-comparisons/generate
POST /api/matches/:matchId/finalize-ranking
```
