import { useEffect, useMemo, useState } from 'react'
import { BarChart3, GitBranch, Scale, Table2, Target, TrendingUp, Users } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  AdminField,
  AdminSelect,
  EmptyState,
  StatCard,
  getName,
  moneylessNumber,
  positions,
} from './AdminLayout'
import { listResource, readSavedUser } from '../../lib/api'

const comparisonMetrics = [
  { value: 'score', label: 'Overall Score' },
  { value: 'positive', label: 'Positive Results' },
  { value: 'average', label: 'Average Value' },
  { value: 'logs', label: 'Total Logs' },
  { value: 'errors', label: 'Errors' },
]

const positiveResults = new Set(['kill', 'ace', 'perfect', 'assist', 'stuff'])
const chartColors = ['#12aabd', '#ff6692', '#36c76c', '#ffb900', '#635bff', '#2f4050']
const positionProfiles = {
  OH: {
    title: 'Outside hitter',
    rule: 'Prioritize balanced scoring, positive actions, and recent upward trend.',
    weights: { score: 0.52, positive: 0.24, average: 0.16, trend: 0.08, errors: -0.18 },
  },
  OPP: {
    title: 'Opposite hitter',
    rule: 'Prioritize scoring power, positive attack results, and low error cost.',
    weights: { score: 0.56, positive: 0.28, average: 0.12, trend: 0.04, errors: -0.2 },
  },
  MB: {
    title: 'Middle blocker',
    rule: 'Prioritize efficient positive actions and fewer errors.',
    weights: { score: 0.42, positive: 0.3, average: 0.18, trend: 0.04, errors: -0.26 },
  },
  S: {
    title: 'Setter',
    rule: 'Prioritize average value, consistency, positive actions, and low errors.',
    weights: { score: 0.34, positive: 0.24, average: 0.3, trend: 0.06, errors: -0.22 },
  },
  L: {
    title: 'Libero',
    rule: 'Prioritize consistency, low errors, and stable recent trend.',
    weights: { score: 0.3, positive: 0.2, average: 0.24, trend: 0.08, errors: -0.32 },
  },
}

const listAllResource = async (resource, params = {}) => {
  const limit = params.limit || 100
  const rows = []
  let page = 1

  while (true) {
    const pageRows = await listResource(resource, { ...params, limit, page })
    rows.push(...pageRows)

    if (pageRows.length < limit) break
    page += 1
  }

  return rows
}

const metricValue = (row, metric) => Number(row[metric] || 0)

const formatNumber = (value) => {
  const number = Number(value || 0)
  return Number.isInteger(number) ? moneylessNumber(number) : number.toFixed(1)
}

const getLogTime = (log) => {
  const value = log.session_date || log.created_at
  const time = value ? new Date(value).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

const normalizeScore = (value, max) => (max ? (Number(value || 0) / max) * 100 : 0)

const buildPositionFitRows = (rows, position) => {
  const profile = positionProfiles[position] || positionProfiles.OH
  const max = {
    score: Math.max(...rows.map((row) => row.score), 1),
    positive: Math.max(...rows.map((row) => row.positive), 1),
    average: Math.max(...rows.map((row) => row.average), 1),
    trend: Math.max(...rows.map((row) => Math.max(row.trend, 0)), 1),
    errors: Math.max(...rows.map((row) => row.errors), 1),
  }

  return rows
    .map((row) => {
      const positionBonus = String(row.position).toUpperCase() === position ? 12 : 0
      const fitScore = (
        normalizeScore(row.score, max.score) * profile.weights.score
        + normalizeScore(row.positive, max.positive) * profile.weights.positive
        + normalizeScore(row.average, max.average) * profile.weights.average
        + normalizeScore(Math.max(row.trend, 0), max.trend) * profile.weights.trend
        + normalizeScore(row.errors, max.errors) * profile.weights.errors
        + positionBonus
      )

      return {
        ...row,
        fitScore: Math.max(0, Math.min(100, Math.round(fitScore))),
        positionMatch: String(row.position).toUpperCase() === position,
      }
    })
    .sort((a, b) => b.fitScore - a.fitScore)
}

const buildPlayerRows = ({ players, logs, teamMembers, teamIds, teams }) => {
  const scopedMembers = teamMembers.filter((member) => teamIds.has(String(member.team_id)))
  const playerTeamById = Object.fromEntries(scopedMembers.map((member) => [String(member.player_id), String(member.team_id)]))
  const playerIds = new Set(Object.keys(playerTeamById))

  return players
    .filter((player) => playerIds.has(String(player.id)))
    .map((player) => {
      const playerLogs = logs.filter((log) => String(log.user_id) === String(player.id))
      const totalValue = playerLogs.reduce((sum, log) => sum + (Number(log.value) || 1), 0)
      const positive = playerLogs
        .filter((log) => positiveResults.has(String(log.result || '').toLowerCase()))
        .reduce((sum, log) => sum + (Number(log.value) || 1), 0)
      const errors = playerLogs
        .filter((log) => String(log.result || '').toLowerCase() === 'error')
        .reduce((sum, log) => sum + (Number(log.value) || 1), 0)
      const average = playerLogs.length ? totalValue / playerLogs.length : 0
      const sortedLogs = [...playerLogs].sort((a, b) => getLogTime(a) - getLogTime(b))
      const midpoint = Math.ceil(sortedLogs.length / 2)
      const early = sortedLogs.slice(0, midpoint).reduce((sum, log) => sum + (Number(log.value) || 1), 0)
      const recent = sortedLogs.slice(midpoint).reduce((sum, log) => sum + (Number(log.value) || 1), 0)
      const score = Math.max(0, Math.round((positive * 2) + average + totalValue - errors))
      const trend = recent - early

      return {
        id: player.id,
        name: player.name,
        position: player.position || '-',
        team: getName(teams, playerTeamById[String(player.id)], 'Unassigned'),
        logs: playerLogs.length,
        totalValue,
        positive,
        errors,
        average,
        score,
        trend,
      }
    })
}

function ComparisonBarChart({ rows, metric }) {
  const visibleRows = rows.slice(0, 8)
  const max = Math.max(...visibleRows.map((row) => metricValue(row, metric)), 1)
  const podiumRows = visibleRows.slice(0, 3)

  if (!visibleRows.length) return <EmptyState>No comparison data yet.</EmptyState>

  return (
    <div className="admin-comparison-rank-figure" role="img" aria-label="Player comparison ranking figure">
      <div className="admin-comparison-podium">
        {podiumRows.map((row, index) => {
          const value = metricValue(row, metric)
          const percent = Math.max(4, (value / max) * 100)

          return (
            <article className={`rank-${index + 1}`} key={row.id}>
              <span>{index + 1}</span>
              <strong>{row.name}</strong>
              <small>{row.team} - {row.position}</small>
              <b>{formatNumber(value)}</b>
              <i style={{ height: `${Math.max(34, percent)}%`, background: chartColors[index % chartColors.length] }} />
            </article>
          )
        })}
      </div>
      {visibleRows.map((row, index) => {
        const value = metricValue(row, metric)
        const width = Math.max(4, (value / max) * 100)
        const ringStyle = {
          background: `conic-gradient(${chartColors[index % chartColors.length]} ${width}%, color-mix(in oklab, var(--admin-soft) 70%, var(--admin-border)) 0)`,
        }

        return (
          <article className="admin-comparison-rank-card" key={row.id}>
            <div className="admin-comparison-rank-number">{index + 1}</div>
            <div className="admin-comparison-rank-player">
              <strong>{row.name}</strong>
              <span>{row.team} - {row.position}</span>
            </div>
            <div className="admin-comparison-rank-ring" style={ringStyle}>
              <span>{Math.round(width)}%</span>
            </div>
            <div className="admin-comparison-rank-bar">
              <i style={{ width: `${width}%`, background: chartColors[index % chartColors.length] }} />
            </div>
            <b>{formatNumber(value)}</b>
          </article>
        )
      })}
    </div>
  )
}

function ComparisonRadar({ rows }) {
  const topRows = rows.slice(0, 5)
  const size = 300
  const center = size / 2
  const radius = 104
  const max = Math.max(...topRows.map((row) => row.score), 1)
  const pointFor = (index, scale = 1) => {
    const angle = ((Math.PI * 2) / Math.max(topRows.length, 1)) * index - Math.PI / 2
    return {
      x: center + Math.cos(angle) * radius * scale,
      y: center + Math.sin(angle) * radius * scale,
    }
  }
  const points = topRows.map((row, index) => {
    const point = pointFor(index, row.score / max)
    return `${point.x},${point.y}`
  }).join(' ')

  if (topRows.length < 3) {
    return <EmptyState>At least three players are needed for the visual profile.</EmptyState>
  }

  return (
    <div className="admin-comparison-radar" role="img" aria-label="Top player comparison radar">
      <svg viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            className="admin-comparison-radar-grid"
            key={scale}
            points={topRows.map((_, index) => {
              const point = pointFor(index, scale)
              return `${point.x},${point.y}`
            }).join(' ')}
          />
        ))}
        {topRows.map((row, index) => {
          const outer = pointFor(index, 1)
          const label = pointFor(index, 1.18)
          const point = pointFor(index, row.score / max)

          return (
            <g key={row.id}>
              <line x1={center} y1={center} x2={outer.x} y2={outer.y} className="admin-comparison-radar-axis" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">
                {row.name.split(' ')[0]}
              </text>
              <circle cx={point.x} cy={point.y} r="5" className="admin-comparison-radar-point">
                <title>{`${row.name}: ${row.score}`}</title>
              </circle>
            </g>
          )
        })}
        <polygon points={points} className="admin-comparison-radar-area" />
      </svg>
    </div>
  )
}

function PositionFitFigure({ rows }) {
  if (!rows.length) return <EmptyState>Select players or add performance logs to generate position fit recommendations.</EmptyState>

  return (
    <div className="admin-position-fit-board">
      {positions.map((position, index) => {
        const profile = positionProfiles[position] || { title: position, rule: 'Ranked using weighted performance indicators.' }
        const candidates = rows.filter((row) => String(row.position).toUpperCase() === position)
        const best = buildPositionFitRows(candidates, position)[0]

        return (
          <article className={`admin-position-fit-slot ${best ? 'has-player' : 'is-empty'}`} key={position}>
            <div className="admin-position-fit-slot-head">
              <span style={{ background: chartColors[index % chartColors.length] }}>{position}</span>
              <div>
                <strong>{profile.title}</strong>
                <small>{best ? `${candidates.length} player${candidates.length === 1 ? '' : 's'} in this position` : 'No player in this position'}</small>
              </div>
            </div>
            {best ? (
              <>
                <div className="admin-position-fit-slot-player">
                  <strong>{best.name}</strong>
                  <small>{best.team} - top {position} fit</small>
                  <b>{best.fitScore}</b>
                </div>
                <i>
                  <span style={{ width: `${best.fitScore}%`, background: chartColors[index % chartColors.length] }} />
                </i>
              </>
            ) : (
              <p>No player in this position</p>
            )}
          </article>
        )
      })}
    </div>
  )
}

function DecisionTreeRecommendation({ rows, position }) {
  const profile = positionProfiles[position] || positionProfiles.OH
  const best = rows[0]
  const second = rows[1]

  if (!best) return <EmptyState>No recommendation available yet.</EmptyState>

  const confidence = best.fitScore >= 78 ? 'High' : best.fitScore >= 58 ? 'Moderate' : 'Low'
  const decision = [
    `Position: ${profile.title}`,
    `Top fit score: ${best.fitScore}`,
    best.positionMatch ? 'Position match: yes' : 'Position match: no',
    best.trend > 0 ? `Trend: improving by +${formatNumber(best.trend)}` : best.trend < 0 ? `Trend: down by ${formatNumber(Math.abs(best.trend))}` : 'Trend: stable',
    best.errors > 0 ? `Risk check: ${formatNumber(best.errors)} errors` : 'Risk check: no recorded errors',
  ]

  return (
    <div className="admin-decision-tree">
      <div className="admin-decision-tree-result">
        <Target size={22} />
        <span>Recommended player</span>
        <strong>{best.name}</strong>
        <small>{confidence} confidence{second ? ` - next option: ${second.name}` : ''}</small>
      </div>
      <ol>
        {decision.map((item) => <li key={item}>{item}</li>)}
      </ol>
      <p>{profile.rule}</p>
    </div>
  )
}

function DetailedComparisonFigure({ rows }) {
  const maxScore = Math.max(...rows.map((row) => row.score), 1)

  if (!rows.length) return <EmptyState>No player comparison data yet.</EmptyState>

  return (
    <figure className="admin-comparison-detail-figure" aria-label="Detailed player comparison figure">
      {rows.map((row, index) => {
        const scoreWidth = Math.max(4, (row.score / maxScore) * 100)
        const trendTone = row.trend > 0 ? 'positive' : row.trend < 0 ? 'negative' : 'neutral'

        return (
          <article className="admin-comparison-detail-item" key={row.id}>
            <div className="admin-comparison-detail-rank" style={{ background: chartColors[index % chartColors.length] }}>
              {index + 1}
            </div>
            <div className="admin-comparison-detail-player">
              <strong>{row.name}</strong>
              <span>{row.team} - {row.position}</span>
            </div>
            <div className="admin-comparison-detail-score">
              <div>
                <small>Score</small>
                <b>{formatNumber(row.score)}</b>
              </div>
              <i>
                <span style={{ width: `${scoreWidth}%`, background: chartColors[index % chartColors.length] }} />
              </i>
            </div>
            <div className="admin-comparison-detail-stats">
              <span><small>Positive</small><b>{formatNumber(row.positive)}</b></span>
              <span><small>Errors</small><b>{formatNumber(row.errors)}</b></span>
              <span><small>Average</small><b>{formatNumber(row.average)}</b></span>
              <span><small>Logs</small><b>{moneylessNumber(row.logs)}</b></span>
            </div>
            <div className={`admin-comparison-detail-trend ${trendTone}`}>
              {row.trend > 0 ? '+' : ''}{formatNumber(row.trend)}
            </div>
          </article>
        )
      })}
    </figure>
  )
}

const AdminComparison = ({ currentPath = '#coach/comparison' }) => {
  const currentUser = readSavedUser()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedMetric, setSelectedMetric] = useState('score')
  const selectedPosition = 'OH'
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
  const [state, setState] = useState({
    teams: [],
    players: [],
    teamMembers: [],
    logs: [],
    loading: true,
    error: '',
  })

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [teams, players, teamMembers, logs] = await Promise.all([
          listAllResource('teams'),
          listAllResource('players'),
          listAllResource('team-members'),
          listAllResource('performance-logs'),
        ])

        if (alive) setState({ teams, players, teamMembers, logs, loading: false, error: '' })
      } catch (error) {
        if (alive) setState((current) => ({ ...current, loading: false, error: error.message }))
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [currentUser?.id])

  const coachTeams = useMemo(() => (
    state.teams.filter((team) => String(team.coach_id) === String(currentUser?.id))
  ), [currentUser?.id, state.teams])
  const activeTeamIds = useMemo(() => (
    selectedTeamId
      ? new Set([String(selectedTeamId)])
      : new Set(coachTeams.map((team) => String(team.id)))
  ), [coachTeams, selectedTeamId])
  const rows = useMemo(() => (
    buildPlayerRows({
      players: state.players,
      logs: state.logs,
      teamMembers: state.teamMembers,
      teamIds: activeTeamIds,
      teams: state.teams,
    }).sort((a, b) => metricValue(b, selectedMetric) - metricValue(a, selectedMetric))
  ), [activeTeamIds, selectedMetric, state.logs, state.players, state.teamMembers, state.teams])
  const visibleRows = useMemo(() => (
    selectedPlayerIds.length
      ? rows.filter((row) => selectedPlayerIds.includes(String(row.id)))
      : rows
  ), [rows, selectedPlayerIds])
  const leader = visibleRows[0]
  const positionFitRows = useMemo(() => (
    buildPositionFitRows(visibleRows, selectedPosition)
  ), [selectedPosition, visibleRows])
  const averageScore = visibleRows.length ? visibleRows.reduce((sum, row) => sum + row.score, 0) / visibleRows.length : 0
  const totalLogs = visibleRows.reduce((sum, row) => sum + row.logs, 0)
  const selectedPlayersLabel = selectedPlayerIds.length
    ? `${selectedPlayerIds.length} selected`
    : 'All players'

  useEffect(() => {
    if (selectedTeamId && !coachTeams.some((team) => String(team.id) === String(selectedTeamId))) {
      setSelectedTeamId('')
    }
  }, [coachTeams, selectedTeamId])

  useEffect(() => {
    const availablePlayerIds = new Set(rows.map((row) => String(row.id)))
    setSelectedPlayerIds((current) => current.filter((id) => availablePlayerIds.has(String(id))))
  }, [rows])

  const togglePlayer = (playerId) => {
    const id = String(playerId)
    setSelectedPlayerIds((current) => (
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    ))
  }

  return (
    <AdminLayout title="Comparison" currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}

      <div className="admin-comparison-hero">
        <div>
          <p className="admin-kicker">Coach Comparison</p>
          <h2>Performance comparison</h2>
          <span>Compare players by score, positive actions, errors, averages, logged activity, and trend movement.</span>
        </div>
        <div className="admin-comparison-filters">
          <AdminField label="Team">
            <AdminSelect value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}>
              <option value="">All teams</option>
              {coachTeams.map((team) => (
                <option key={team.id} value={team.id}>{team.team_name}</option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label="Metric">
            <AdminSelect value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value)}>
              {comparisonMetrics.map((metric) => (
                <option key={metric.value} value={metric.value}>{metric.label}</option>
              ))}
            </AdminSelect>
          </AdminField>
        </div>
      </div>

      <AdminCard className="admin-comparison-player-filter-card">
        <div className="admin-card-header">
          <div>
            <h3>Players to compare</h3>
            <p className="admin-muted">{selectedPlayersLabel}. Select specific players or clear to compare everyone in the current team scope.</p>
          </div>
          <button
            className="admin-comparison-clear"
            disabled={!selectedPlayerIds.length}
            onClick={() => setSelectedPlayerIds([])}
            type="button"
          >
            Clear
          </button>
        </div>
        <div className="admin-comparison-player-checklist">
          {state.loading ? (
            Array.from({ length: 6 }).map((_, index) => <span className="admin-skeleton-line" key={`comparison-player-skeleton-${index}`} />)
          ) : rows.length ? rows.map((row) => {
            const checked = selectedPlayerIds.includes(String(row.id))

            return (
              <label className={`admin-comparison-player-option ${checked ? 'selected' : ''}`} key={row.id}>
                <input
                  checked={checked}
                  onChange={() => togglePlayer(row.id)}
                  type="checkbox"
                />
                <span>
                  <strong>{row.name}</strong>
                  <small>{row.team} - {row.position}</small>
                </span>
                <b>{formatNumber(row.score)}</b>
              </label>
            )
          }) : (
            <EmptyState>No players available for this team.</EmptyState>
          )}
        </div>
      </AdminCard>

      <div className="admin-stat-grid admin-comparison-stat-grid">
        <StatCard icon={Users} label="Compared Players" value={state.loading ? '...' : moneylessNumber(visibleRows.length)} />
        <StatCard icon={Table2} label="Performance Logs" value={state.loading ? '...' : moneylessNumber(totalLogs)} tone="secondary" />
        <StatCard icon={TrendingUp} label="Average Score" value={state.loading ? '...' : formatNumber(averageScore)} tone="success" />
        <StatCard icon={Scale} label="Current Leader" value={state.loading ? '...' : (leader?.name || '-')} tone="primary" />
      </div>

      <div className="admin-position-decision-grid">
        <AdminCard className="admin-position-fit-card">
          <div className="admin-card-header">
            <div>
              <h3>Most fitted for position</h3>
              <p className="admin-muted">Top player per position, using only players already assigned to that position.</p>
            </div>
            <Target size={22} />
          </div>
          <PositionFitFigure rows={visibleRows} />
        </AdminCard>

        <AdminCard className="admin-decision-tree-card">
          <div className="admin-card-header">
            <div>
              <h3>Decision tree recommendation</h3>
              <p className="admin-muted">Simple rule-based explanation for the recommended player.</p>
            </div>
            <GitBranch size={22} />
          </div>
          <DecisionTreeRecommendation rows={positionFitRows} position={selectedPosition} />
        </AdminCard>
      </div>

      <div className="admin-comparison-grid">
        <AdminCard className="admin-chart-card admin-comparison-chart-card">
          <div className="admin-card-header">
            <div>
              <h3>Player ranking</h3>
              <p className="admin-muted">{comparisonMetrics.find((metric) => metric.value === selectedMetric)?.label}</p>
            </div>
            <BarChart3 size={22} />
          </div>
          {state.loading ? (
            <div className="admin-skeleton-list">
              {Array.from({ length: 6 }).map((_, index) => <span key={`comparison-bar-skeleton-${index}`} />)}
            </div>
          ) : (
            <ComparisonBarChart rows={visibleRows} metric={selectedMetric} />
          )}
        </AdminCard>

        <AdminCard className="admin-chart-card admin-comparison-radar-card">
          <div className="admin-card-header">
            <div>
              <h3>Top player profile</h3>
              <p className="admin-muted">Overall score shape for the leading players.</p>
            </div>
            <Scale size={22} />
          </div>
          {state.loading ? (
            <div className="admin-performance-radar-skeleton" />
          ) : (
            <ComparisonRadar rows={visibleRows} />
          )}
        </AdminCard>
      </div>

      <AdminCard className="admin-comparison-detail-card">
        <div className="admin-card-header">
          <div>
            <h3>Detailed comparison figure</h3>
            <p className="admin-muted">Use this visual figure to compare individual performance statistics by player and team.</p>
          </div>
        </div>

        {state.loading ? (
          <div className="admin-comparison-detail-skeleton">
            {Array.from({ length: 5 }).map((_, index) => <span key={`comparison-detail-skeleton-${index}`} />)}
          </div>
        ) : (
          <DetailedComparisonFigure rows={visibleRows} />
        )}
      </AdminCard>
    </AdminLayout>
  )
}

export default AdminComparison
