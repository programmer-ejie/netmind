import { useEffect, useMemo, useState } from 'react'
import { Activity, Users } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  BarSet,
  EmptyState,
  StatusBadge,
  formatDate,
  initials,
  moneylessNumber,
} from './AdminLayout'
import { listResource } from '../../lib/api'

const AdminDashboard = ({ currentPath = '#admin' }) => {
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

  const chartData = useMemo(() => {
    if (state.loading) return []

    const grouped = state.logs.reduce((acc, log) => {
      const key = log.action_type || 'overall'
      acc[key] = (acc[key] || 0) + (Number(log.value) || 1)
      return acc
    }, {})

    return Object.entries(grouped).map(([label, value]) => ({ label, value })).slice(0, 8)
  }, [state.logs])

  const topPlayers = useMemo(() => (
    state.players
      .map((player) => {
        const logs = state.logs.filter((log) => String(log.user_id) === String(player.id))
        const score = logs.reduce((sum, log) => sum + (Number(log.value) || 1), 0)
        return { ...player, score, logs: logs.length }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  ), [state.players, state.logs])

  const recentActivity = useMemo(() => {
    const assignments = state.assignments.slice(0, 3).map((item) => ({
      time: formatDate(item.created_at),
      text: `Training ${item.status || 'pending'} for player #${item.player_id}`,
      tone: item.status === 'completed' ? 'secondary' : 'warning',
    }))
    const attendance = state.attendance.slice(0, 3).map((item) => ({
      time: formatDate(item.session_date),
      text: `Attendance marked ${item.status} for player #${item.player_id}`,
      tone: item.status === 'present' ? 'primary' : 'error',
    }))

    return [...assignments, ...attendance].slice(0, 6)
  }, [state.assignments, state.attendance])

  return (
    <AdminLayout title="NetMind Dashboard" currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}

      <div className="admin-grid">
        <AdminCard className="admin-chart-card">
          <div className="admin-card-header">
            <h2>Performance Forecast</h2>
            <select aria-label="Chart period" defaultValue="This Week">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Season</option>
            </select>
          </div>
          {state.loading ? (
            <div className="admin-skeleton-bars" aria-label="Loading chart">
              {Array.from({ length: 8 }).map((_, index) => (
                <span key={index} style={{ height: `${32 + (index % 4) * 14}%` }} />
              ))}
            </div>
          ) : chartData.length ? (
            <BarSet data={chartData} />
          ) : (
            <EmptyState>No performance logs yet.</EmptyState>
          )}
        </AdminCard>

        <div className="admin-side-stack">
          <AdminCard>
            <div className="admin-metric-head">
              <div className="admin-metric-icon secondary">
                <Users size={22} />
              </div>
              <h2>Players</h2>
            </div>
            <div className="admin-progress-row">
              <span>Active accounts</span>
              <strong>{state.loading ? '...' : moneylessNumber(state.players.length)}</strong>
            </div>
            <div className="admin-progress">
              <span style={{ width: state.loading ? '38%' : `${Math.min(100, state.players.length * 28)}%` }} />
            </div>
          </AdminCard>

          <AdminCard>
            <div className="admin-metric-head">
              <div className="admin-metric-icon error">
                <Activity size={22} />
              </div>
              <h2>Performance Logs</h2>
            </div>
            <div className="admin-income">
              <strong>{state.loading ? '...' : moneylessNumber(state.logs.length)}</strong>
              <span>{state.loading ? 'Loading' : 'Live'}</span>
            </div>
          </AdminCard>
        </div>

        <AdminCard className="admin-table-card">
          <div className="admin-card-header">
            <h2>Top Players</h2>
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

        <AdminCard className="admin-activity-card">
          <h2>Daily activities</h2>
          {state.loading ? (
            <div className="admin-skeleton-list">
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : recentActivity.length ? (
            <ul className="admin-timeline">
              {recentActivity.map((item, index) => (
                <li key={`${item.text}-${index}`}>
                  <time>{item.time}</time>
                  <span className={item.tone} />
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No recent activity.</EmptyState>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
