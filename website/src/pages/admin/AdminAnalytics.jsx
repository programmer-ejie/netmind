import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ClipboardCheck, Trophy } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  AdminField,
  AdminSelect,
  BarSet,
  EmptyState,
  StatCard,
  StatusBadge,
  formatDate,
  getName,
  moneylessNumber,
  parseRankings,
} from './AdminLayout'
import { listResource } from '../../lib/api'

const metricOptions = [
  { value: 'positive_results', label: 'Positive Results' },
  { value: 'average_value', label: 'Average Value' },
  { value: 'errors', label: 'Errors' },
  { value: 'total_logs', label: 'Total Logs' },
]

const goodResults = new Set(['kill', 'ace', 'perfect', 'assist', 'stuff'])

const AdminAnalytics = ({ currentPath = '#admin/analytics' }) => {
  const [metric, setMetric] = useState('positive_results')
  const [state, setState] = useState({
    players: [],
    teams: [],
    rankings: [],
    attendance: [],
    comparisons: [],
    logs: [],
    error: '',
  })

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [players, teams, rankings, attendance, comparisons, logs] = await Promise.all([
          listResource('players'),
          listResource('teams', { limit: 100 }),
          listResource('team-rankings', { limit: 100 }),
          listResource('attendance-logs', { limit: 100 }),
          listResource('player-comparisons', { limit: 100 }),
          listResource('performance-logs', { limit: 100 }),
        ])

        if (alive) setState({ players, teams, rankings, attendance, comparisons, logs, error: '' })
      } catch (err) {
        if (alive) setState((current) => ({ ...current, error: err.message }))
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  const comparisonData = useMemo(() => {
    const comparison = state.comparisons.find((item) => item.metric_name === metric) || state.comparisons[0]
    const rankings = parseRankings(comparison?.rankings)

    if (rankings.length) {
      return rankings.slice(0, 8).map((row) => ({
        label: row.name || `#${row.player_id}`,
        value: Number(row[metric]) || Number(row.average_value) || Number(row.total_logs) || 0,
      }))
    }

    const grouped = state.players.map((player) => {
      const logs = state.logs.filter((log) => String(log.user_id) === String(player.id))
      const positives = logs.filter((log) => goodResults.has(log.result)).length
      const errors = logs.filter((log) => log.result === 'error').length
      const avg = logs.reduce((sum, log) => sum + (Number(log.value) || 0), 0) / Math.max(logs.length, 1)
      const values = {
        positive_results: positives,
        average_value: avg,
        errors,
        total_logs: logs.length,
      }

      return { label: player.name, value: values[metric] || 0 }
    })

    return grouped.sort((a, b) => b.value - a.value).slice(0, 8)
  }, [metric, state.comparisons, state.logs, state.players])

  const attendanceStats = useMemo(() => {
    const counts = state.attendance.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1
      return acc
    }, {})
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    const colors = ['#635bff', '#14e9e2', '#36c76c', '#ffb900', '#ff6692']
    let start = 0
    const segments = Object.entries(counts).map(([label, value], index) => {
      const size = total ? (value / total) * 100 : 0
      const segment = `${colors[index % colors.length]} ${start}% ${start + size}%`
      start += size
      return { label, value, color: colors[index % colors.length], segment }
    })

    return { counts, total, segments }
  }, [state.attendance])

  return (
    <AdminLayout title="Analytics" currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}

      <div className="admin-stat-grid">
        <StatCard icon={BarChart3} label="Comparison Rows" value={moneylessNumber(comparisonData.length)} />
        <StatCard icon={Trophy} label="Ranked Teams" value={moneylessNumber(state.rankings.length)} tone="secondary" />
        <StatCard icon={ClipboardCheck} label="Attendance Logs" value={moneylessNumber(state.attendance.length)} tone="success" />
      </div>

      <div className="admin-grid admin-page-grid">
        <AdminCard className="admin-chart-card">
          <div className="admin-card-header">
            <div>
              <h2>Player Comparison</h2>
              <p className="admin-muted">Uses player_comparisons, with performance logs as fallback.</p>
            </div>
            <AdminField label="Metric" className="admin-compact-field">
              <AdminSelect value={metric} onChange={(event) => setMetric(event.target.value)}>
                {metricOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>
          {comparisonData.length ? <BarSet data={comparisonData} /> : <EmptyState>No comparison data yet.</EmptyState>}
        </AdminCard>

        <AdminCard className="admin-activity-card">
          <div className="admin-card-header">
            <h2>Attendance Report</h2>
            <StatusBadge tone="secondary">{attendanceStats.total} logs</StatusBadge>
          </div>
          {attendanceStats.total ? (
            <>
              <div
                className="admin-pie"
                style={{ background: `conic-gradient(${attendanceStats.segments.map((item) => item.segment).join(', ')})` }}
                aria-label="Attendance pie chart"
              />
              <div className="admin-pie-legend">
                {attendanceStats.segments.map((item) => (
                  <span key={item.label}>
                    <i style={{ background: item.color }} />
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <EmptyState>No attendance logs yet.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-table-card">
          <div className="admin-card-header">
            <h2>Team Rankings</h2>
          </div>
          <div className="admin-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Win %</th>
                  <th>Point Diff</th>
                  <th>Calculated</th>
                </tr>
              </thead>
              <tbody>
                {state.rankings
                  .slice()
                  .sort((a, b) => Number(a.ranking_position) - Number(b.ranking_position))
                  .map((ranking) => (
                    <tr key={ranking.id}>
                      <td>#{ranking.ranking_position}</td>
                      <td>{getName(state.teams, ranking.team_id)}</td>
                      <td>{ranking.wins || 0}</td>
                      <td>{ranking.losses || 0}</td>
                      <td>{Number(ranking.win_percentage || 0).toFixed(1)}%</td>
                      <td>{ranking.point_difference || 0}</td>
                      <td>{formatDate(ranking.calculated_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!state.rankings.length && <EmptyState>No team rankings yet.</EmptyState>}
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  )
}

export default AdminAnalytics
