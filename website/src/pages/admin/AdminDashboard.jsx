import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardCheck, Shield, UserRound, Users } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  EmptyState,
  StatCard,
  StatusBadge,
  formatDate,
  initials,
  moneylessNumber,
} from './AdminLayout'
import { listResource } from '../../lib/api'

const areaColors = ['#12aabd', '#ff6692', '#36c76c', '#ffb900']
const activityRowsPerPage = 4

const formatShortDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const percentile = (values, position) => {
  if (!values.length) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const index = (sorted.length - 1) * position
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[index]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

const BumpChart = ({ labels, series }) => {
  const width = 720
  const height = 300
  const padding = { top: 24, right: 26, bottom: 48, left: 46 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const rankCount = Math.max(series.length, 1)
  const rankRows = labels.map((_, labelIndex) => (
    series
      .map((item) => ({ label: item.label, value: Number(item.values[labelIndex] || 0) }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .map((item, index) => ({ ...item, rank: item.value ? index + 1 : rankCount }))
  ))
  const rankFor = (label, labelIndex) => (
    rankRows[labelIndex].find((item) => item.label === label)?.rank || rankCount
  )
  const xFor = (index) => padding.left + (labels.length <= 1 ? innerWidth / 2 : (index / (labels.length - 1)) * innerWidth)
  const yFor = (rank) => padding.top + (rankCount <= 1 ? innerHeight / 2 : ((rank - 1) / (rankCount - 1)) * innerHeight)

  return (
    <div className="admin-bump-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Action type bump chart">
        {Array.from({ length: rankCount }, (_, index) => index + 1).map((rank) => (
          <g key={rank}>
            <line x1={padding.left} x2={width - padding.right} y1={yFor(rank)} y2={yFor(rank)} className="admin-bump-grid" />
            <text x={18} y={yFor(rank)} dominantBaseline="middle">#{rank}</text>
          </g>
        ))}
        {series.map((item, seriesIndex) => {
          const color = areaColors[seriesIndex % areaColors.length]
          const points = labels.map((_, labelIndex) => `${xFor(labelIndex)},${yFor(rankFor(item.label, labelIndex))}`).join(' ')

          return (
            <g key={item.label}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {labels.map((label, labelIndex) => (
                <circle key={`${item.label}-${label}`} cx={xFor(labelIndex)} cy={yFor(rankFor(item.label, labelIndex))} r="5" fill={color}>
                  <title>{`${item.label} ${label}: rank #${rankFor(item.label, labelIndex)}, value ${item.values[labelIndex] || 0}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
        {labels.map((label, index) => (
          <text key={label} x={xFor(index)} y={height - 18} textAnchor="middle">{label}</text>
        ))}
      </svg>
      <div className="admin-line-legend">
        {series.map((item, index) => (
          <span key={item.label}>
            <i style={{ background: areaColors[index % areaColors.length] }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const BoxChart = ({ stats }) => {
  const width = 360
  const height = 190
  const minX = 48
  const maxX = width - 34
  const y = 88
  const maxValue = Math.max(stats.max, 1)
  const xFor = (value) => minX + (Number(value || 0) / maxValue) * (maxX - minX)

  return (
    <div className="admin-box-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Player performance score distribution">
        <line x1={xFor(stats.min)} x2={xFor(stats.max)} y1={y} y2={y} className="admin-box-whisker" />
        <line x1={xFor(stats.min)} x2={xFor(stats.min)} y1={y - 24} y2={y + 24} className="admin-box-whisker" />
        <line x1={xFor(stats.max)} x2={xFor(stats.max)} y1={y - 24} y2={y + 24} className="admin-box-whisker" />
        <rect x={xFor(stats.q1)} y={y - 34} width={Math.max(8, xFor(stats.q3) - xFor(stats.q1))} height="68" rx="8" className="admin-box-range" />
        <line x1={xFor(stats.median)} x2={xFor(stats.median)} y1={y - 38} y2={y + 38} className="admin-box-median" />
        <circle cx={xFor(stats.average)} cy={y} r="6" className="admin-box-average">
          <title>{`Average: ${stats.average.toFixed(1)}`}</title>
        </circle>
        <text x={minX} y="158" textAnchor="middle">Min {stats.min}</text>
        <text x={xFor(stats.median)} y="158" textAnchor="middle">Median {stats.median.toFixed(1)}</text>
        <text x={maxX} y="158" textAnchor="middle">Max {stats.max}</text>
      </svg>
      <div className="admin-box-summary">
        <span><b>{stats.q1.toFixed(1)}</b> Q1</span>
        <span><b>{stats.q3.toFixed(1)}</b> Q3</span>
        <span><b>{stats.average.toFixed(1)}</b> Avg</span>
      </div>
    </div>
  )
}

const AdminDashboard = ({ currentPath = '#coach' }) => {
  const [state, setState] = useState({
    teams: [],
    players: [],
    trainers: [],
    logs: [],
    assignments: [],
    attendance: [],
    loading: true,
    error: '',
  })
  const [activityPage, setActivityPage] = useState(1)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [teams, players, trainers, logs, assignments, attendance] = await Promise.all([
          listResource('teams', { limit: 100 }),
          listResource('players'),
          listResource('trainers'),
          listResource('performance-logs', { limit: 100 }),
          listResource('training-assignments', { limit: 100 }),
          listResource('attendance-logs', { limit: 100 }),
        ])

        if (alive) {
          setState({ teams, players, trainers, logs, assignments, attendance, loading: false, error: '' })
        }
      } catch (error) {
        if (alive) setState((current) => ({ ...current, loading: false, error: error.message }))
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  const bumpChartData = useMemo(() => {
    if (state.loading) return []

    const labels = Array.from(new Set(
      state.logs
        .map((log) => formatShortDate(log.created_at || log.session_date))
        .filter(Boolean),
    )).slice(-7)
    const actions = Object.entries(state.logs.reduce((acc, log) => {
      const action = log.action_type || 'overall'
      acc[action] = (acc[action] || 0) + Number(log.value || 1)
      return acc
    }, {}))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([action]) => action)

    return {
      labels,
      series: actions.map((action) => ({
        label: action,
        values: labels.map((label) => state.logs
          .filter((log) => formatShortDate(log.created_at || log.session_date) === label && (log.action_type || 'overall') === action)
          .reduce((sum, log) => sum + Number(log.value || 1), 0)),
      })),
    }
  }, [state.logs])

  const topPlayers = useMemo(() => (
    state.players
      .map((player) => {
        const logs = state.logs.filter((log) => String(log.user_id) === String(player.id))
        const score = logs.reduce((sum, log) => sum + (Number(log.value) || 1), 0)
        return { ...player, score, logs: logs.length }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  ), [state.players, state.logs])

  const playerScoreStats = useMemo(() => {
    const scores = state.players.map((player) => {
      const logs = state.logs.filter((log) => String(log.user_id) === String(player.id))
      return logs.reduce((sum, log) => sum + (Number(log.value) || 1), 0)
    })

    return {
      min: Math.min(...scores, 0),
      q1: percentile(scores, 0.25),
      median: percentile(scores, 0.5),
      q3: percentile(scores, 0.75),
      max: Math.max(...scores, 0),
      average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
    }
  }, [state.players, state.logs])

  const recentActivity = useMemo(() => {
    const playerName = (id) => state.players.find((player) => String(player.id) === String(id))?.name || `Player #${id}`
    const assignments = state.assignments.slice(0, 3).map((item) => ({
      time: formatDate(item.created_at),
      action: 'Training',
      detail: item.status || 'pending',
      subject: playerName(item.player_id),
      tone: item.status === 'completed' ? 'secondary' : 'warning',
      sortDate: item.created_at,
    }))
    const attendance = state.attendance.slice(0, 3).map((item) => ({
      time: formatDate(item.session_date),
      action: 'Attendance',
      detail: item.status || 'marked',
      subject: playerName(item.player_id),
      tone: item.status === 'present' ? 'primary' : 'error',
      sortDate: item.session_date,
    }))
    const performance = state.logs.slice(0, 6).map((item) => ({
      time: formatDate(item.created_at),
      action: item.action_type || 'Performance',
      detail: item.result || 'logged',
      subject: playerName(item.user_id),
      tone: item.result === 'error' ? 'error' : 'primary',
      sortDate: item.created_at,
    }))

    return [...assignments, ...attendance, ...performance]
      .sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0))
  }, [state.assignments, state.attendance, state.logs, state.players])

  const activityPageCount = Math.max(1, Math.ceil(recentActivity.length / activityRowsPerPage))
  const pagedRecentActivity = useMemo(() => {
    const start = (activityPage - 1) * activityRowsPerPage
    return recentActivity.slice(start, start + activityRowsPerPage)
  }, [activityPage, recentActivity])

  useEffect(() => {
    if (activityPage > activityPageCount) {
      setActivityPage(activityPageCount)
    }
  }, [activityPage, activityPageCount])

  const dashboardNote = state.loading
    ? 'Loading your current team activity.'
    : `${moneylessNumber(state.teams.length)} teams, ${moneylessNumber(state.players.length)} players, and ${moneylessNumber(state.logs.length)} performance logs are currently tracked.`
  const performanceNote = state.logs.length
    ? 'Performance logs are grouped by action type so you can quickly spot where the team is most active.'
    : 'Add match inputs to populate this forecast with live team activity.'

  return (
    <AdminLayout title="Coach Dashboard" currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}

      <div className="admin-dashboard-hero">
        <div>
          <p className="admin-kicker">Team Operations</p>
          <h2>Dashboard Overview</h2>
          <span>{dashboardNote}</span>
        </div>
        <div className="admin-dashboard-hero-stats">
          <span>
            <strong>{state.loading ? '...' : moneylessNumber(state.teams.length)}</strong>
            <small>Teams</small>
          </span>
          <span>
            <strong>{state.loading ? '...' : moneylessNumber(state.trainers.length)}</strong>
            <small>Trainers</small>
          </span>
        </div>
      </div>

      <div className="admin-stat-grid">
        <StatCard icon={Shield} label="Teams" value={state.loading ? '...' : moneylessNumber(state.teams.length)} />
        <StatCard icon={Users} label="Players" value={state.loading ? '...' : moneylessNumber(state.players.length)} tone="secondary" />
        <StatCard icon={UserRound} label="Trainers" value={state.loading ? '...' : moneylessNumber(state.trainers.length)} tone="success" />
        <StatCard icon={ClipboardCheck} label="Attendance Logs" value={state.loading ? '...' : moneylessNumber(state.attendance.length)} tone="success" />
      </div>

      <div className="admin-grid">
        <AdminCard className="admin-chart-card admin-analytics-card admin-dashboard-card admin-dashboard-chart-card">
          <div className="admin-card-header">
            <div>
              <h2>Performance Forecast</h2>
              <p className="admin-muted">{performanceNote}</p>
            </div>
            <StatusBadge tone="secondary">{state.loading ? 'Loading' : `${state.logs.length} inputs`}</StatusBadge>
          </div>
          {state.loading ? (
            <div className="admin-skeleton-bars" aria-label="Loading chart">
              {Array.from({ length: 8 }).map((_, index) => (
                <span key={index} style={{ height: `${32 + (index % 4) * 14}%` }} />
              ))}
            </div>
          ) : bumpChartData.labels?.length && bumpChartData.series?.length ? (
            <BumpChart labels={bumpChartData.labels} series={bumpChartData.series} />
          ) : (
            <EmptyState>No performance logs yet.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-activity-card admin-analytics-card admin-dashboard-card admin-dashboard-box-card">
          <div className="admin-card-header">
            <div>
              <h2>Score Distribution</h2>
              <p className="admin-muted">Box chart of player performance scores.</p>
            </div>
          </div>
          {state.loading ? (
            <div className="admin-skeleton-list">
              {Array.from({ length: 4 }).map((_, index) => <span key={index} />)}
            </div>
          ) : state.players.length ? (
            <BoxChart stats={playerScoreStats} />
          ) : (
            <EmptyState>No player scores yet.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-table-card admin-analytics-card admin-dashboard-card admin-dashboard-table-card">
          <div className="admin-card-header">
            <div>
              <h2>Top Players</h2>
              <p className="admin-muted">Ranked by total inputted performance value.</p>
            </div>
            <StatusBadge tone="success">{state.loading ? 'Loading' : 'Live data'}</StatusBadge>
          </div>
          <div className="admin-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Logs</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {state.loading && Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`loading-player-${index}`}>
                    <td><span className="admin-skeleton-line wide" /></td>
                    <td><span className="admin-skeleton-line" /></td>
                    <td><span className="admin-skeleton-line short" /></td>
                    <td><span className="admin-skeleton-line short" /></td>
                  </tr>
                ))}
                {!state.loading && topPlayers.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <span className="admin-player">
                        <b>{initials(player.name)}</b>
                        <span>
                          <strong>{player.name}</strong>
                          <small>{player.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>{player.position || '-'}</td>
                    <td>{player.logs}</td>
                    <td>{moneylessNumber(player.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!state.loading && !topPlayers.length && <EmptyState />}
          </div>
        </AdminCard>

        <AdminCard className="admin-activity-card admin-analytics-card admin-dashboard-card admin-dashboard-activity-card">
          <div className="admin-card-header">
            <div>
              <h2>Daily activities</h2>
              <p className="admin-muted">Recent training and attendance movement.</p>
            </div>
          </div>
          {state.loading ? (
            <div className="admin-skeleton-list">
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : recentActivity.length ? (
            <>
              <ul className="admin-timeline">
                {pagedRecentActivity.map((item, index) => (
                  <li key={`${item.action}-${item.subject}-${item.sortDate}-${index}`}>
                    <time>{item.time}</time>
                    <span className={item.tone}>{item.action.slice(0, 1).toUpperCase()}</span>
                    <p>
                      <strong>{item.action}</strong>
                      <small>{item.detail} • {item.subject}</small>
                    </p>
                  </li>
                ))}
              </ul>
              <div className="admin-pagination">
                <button
                  type="button"
                  className="admin-pagination-button"
                  onClick={() => setActivityPage((page) => Math.max(1, page - 1))}
                  disabled={activityPage === 1}
                  aria-label="Previous activity page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Page {activityPage} of {activityPageCount}</span>
                <button
                  type="button"
                  className="admin-pagination-button"
                  onClick={() => setActivityPage((page) => Math.min(activityPageCount, page + 1))}
                  disabled={activityPage === activityPageCount}
                  aria-label="Next activity page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <EmptyState>No recent activity.</EmptyState>
          )}
        </AdminCard>

      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
