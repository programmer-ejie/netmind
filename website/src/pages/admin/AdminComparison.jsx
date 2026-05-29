import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Scale, Table2, TrendingUp, Users } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  AdminField,
  AdminSelect,
  EmptyState,
  StatCard,
  TableSkeletonRows,
  getName,
  moneylessNumber,
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

  if (!visibleRows.length) return <EmptyState>No comparison data yet.</EmptyState>

  return (
    <div className="admin-comparison-bars" role="img" aria-label="Player comparison bar chart">
      {visibleRows.map((row, index) => {
        const value = metricValue(row, metric)
        const width = Math.max(4, (value / max) * 100)

        return (
          <div className="admin-comparison-bar-row" key={row.id}>
            <span>{row.name}</span>
            <div>
              <i style={{ width: `${width}%`, background: chartColors[index % chartColors.length] }} />
            </div>
            <strong>{formatNumber(value)}</strong>
          </div>
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

const AdminComparison = ({ currentPath = '#coach/comparison' }) => {
  const currentUser = readSavedUser()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedMetric, setSelectedMetric] = useState('score')
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
  const leader = rows[0]
  const averageScore = rows.length ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length : 0
  const totalLogs = rows.reduce((sum, row) => sum + row.logs, 0)

  useEffect(() => {
    if (selectedTeamId && !coachTeams.some((team) => String(team.id) === String(selectedTeamId))) {
      setSelectedTeamId('')
    }
  }, [coachTeams, selectedTeamId])

  return (
    <AdminLayout title="Comparison" currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}

      <div className="admin-comparison-hero">
        <div>
          <p className="admin-kicker">Coach Comparison</p>
          <h2>Compare team and individual performance</h2>
          <span>Review player scores, positive results, errors, averages, and logged activity with visual charts and a detailed table.</span>
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

      <div className="admin-stat-grid">
        <StatCard icon={Users} label="Compared Players" value={state.loading ? '...' : moneylessNumber(rows.length)} />
        <StatCard icon={Table2} label="Performance Logs" value={state.loading ? '...' : moneylessNumber(totalLogs)} tone="secondary" />
        <StatCard icon={TrendingUp} label="Average Score" value={state.loading ? '...' : formatNumber(averageScore)} tone="success" />
        <StatCard icon={Scale} label="Current Leader" value={state.loading ? '...' : (leader?.name || '-')} tone="primary" />
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
            <ComparisonBarChart rows={rows} metric={selectedMetric} />
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
            <ComparisonRadar rows={rows} />
          )}
        </AdminCard>
      </div>

      <AdminCard className="admin-table-card admin-comparison-table-card">
        <div className="admin-card-header">
          <div>
            <h3>Detailed comparison table</h3>
            <p className="admin-muted">Use this table to compare individual performance statistics by player and team.</p>
          </div>
        </div>

        <div className="admin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Position</th>
                <th>Score</th>
                <th>Positive</th>
                <th>Errors</th>
                <th>Average</th>
                <th>Logs</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                <TableSkeletonRows rows={5} columns={9} />
              ) : rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.team}</td>
                  <td>{row.position}</td>
                  <td>{formatNumber(row.score)}</td>
                  <td>{formatNumber(row.positive)}</td>
                  <td>{formatNumber(row.errors)}</td>
                  <td>{formatNumber(row.average)}</td>
                  <td>{moneylessNumber(row.logs)}</td>
                  <td className={row.trend >= 0 ? 'admin-positive-cell' : 'admin-negative-cell'}>
                    {row.trend > 0 ? '+' : ''}{formatNumber(row.trend)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9"><EmptyState>No player comparison data yet.</EmptyState></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminLayout>
  )
}

export default AdminComparison
