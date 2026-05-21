import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, UserX, Users } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  EmptyState,
  ListSkeleton,
  StatusBadge,
  formatDate,
} from './AdminLayout'
import { apiRequest, readSavedUser } from '../../lib/api'

const AdminAttendanceCheck = ({ scheduleId, currentPath = `#trainer/attendance/${scheduleId}/check` }) => {
  const currentUser = readSavedUser()
  const [schedule, setSchedule] = useState(null)
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        setLoading(true)
        const payload = await apiRequest(`/training-schedules/${scheduleId}/attendance-check`)

        if (alive) {
          setSchedule(payload.schedule)
          setTeam(payload.team)
          setPlayers(payload.players || [])
          setError('')
        }
      } catch (err) {
        if (alive) setError(err.message)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [scheduleId])

  const checkedCount = players.filter((player) => player.checked_in).length
  const totalPlayers = players.length
  const notCheckedCount = Math.max(totalPlayers - checkedCount, 0)
  const checkedPercent = totalPlayers ? Math.round((checkedCount / totalPlayers) * 100) : 0
  const teamName = team?.team_name || 'Team'

  return (
    <AdminLayout title="Attendance Check" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard className="admin-player-stats-page admin-attendance-check-page">
        <div className="admin-card-header admin-player-stats-page-header">
          <div className="admin-player-stats-title">
            <button
              type="button"
              className="admin-team-back"
              onClick={() => { window.location.hash = `${currentUser?.role === 'trainer' ? 'trainer' : 'coach'}/attendance` }}
              aria-label="Back to Training Schedule"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2>Attendance Check</h2>
              <p className="admin-muted">
                {loading ? 'Loading attendance...' : `${teamName} - ${formatDate(schedule?.session_date)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="admin-attendance-overview">
          <div className="admin-attendance-visual-card">
            <div
              className="admin-attendance-ring"
              style={{ background: `conic-gradient(var(--admin-primary) ${checkedPercent}%, var(--admin-soft) 0)` }}
              aria-label={`${checkedPercent}% checked in`}
            >
              <span>{checkedPercent}%</span>
            </div>
            <div>
              <h3>Checked In</h3>
              <p className="admin-muted">{checkedCount} of {totalPlayers} players have checked in.</p>
            </div>

            <div className="admin-attendance-kpis">
              <div>
                <span className="admin-metric-icon primary"><Users size={18} /></span>
                <small>Total Players</small>
                <strong>{totalPlayers}</strong>
              </div>
              <div>
                <span className="admin-metric-icon success"><CheckCircle2 size={18} /></span>
                <small>Checked In</small>
                <strong>{checkedCount}</strong>
              </div>
              <div>
                <span className="admin-metric-icon error"><UserX size={18} /></span>
                <small>Not Checked In</small>
                <strong>{notCheckedCount}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-attendance-session-meta">
          <span><Clock3 size={15} />{schedule?.session_type || 'training'}</span>
          <span><CalendarDays size={15} />{formatDate(schedule?.session_date)}</span>
        </div>

        <div className="admin-attendance-table">
          <div className="admin-attendance-table-head">
            <span>Player</span>
            <span>Position</span>
            <span>Jersey</span>
            <span>Status</span>
          </div>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : players.map((player) => {
            return (
              <article className="admin-attendance-player-row" key={player.player_id}>
                <div className="admin-attendance-player-main">
                  <strong>{player.name}</strong>
                  <small>{player.email || 'Player'}</small>
                </div>
                <span>{player.position || '-'}</span>
                <span>{player.jersey_number ? `#${player.jersey_number}` : '-'}</span>
                {player.checked_in ? (
                  <StatusBadge tone="success">Checked In</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">Not Checked In</StatusBadge>
                )}
              </article>
            )
          })}
        </div>
        {!players.length && !loading && <EmptyState>No players found for this team.</EmptyState>}
      </AdminCard>
    </AdminLayout>
  )
}

export default AdminAttendanceCheck
