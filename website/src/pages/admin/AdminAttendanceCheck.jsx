import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, CalendarDays, CheckCircle2, Clock3, UserX, Users, X } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
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
  const [inputPlayer, setInputPlayer] = useState(null)
  const [inputMode, setInputMode] = useState('add')
  const [trainerInput, setTrainerInput] = useState({ highest_jump: '', strongest_spike: '' })
  const [savingInput, setSavingInput] = useState(false)

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
  const hasInputValue = (value) => value !== null && value !== undefined && value !== ''
  const hasTrainerInputValue = (input) => Boolean(input) && (
    hasInputValue(input.highest_jump) || hasInputValue(input.strongest_spike)
  )
  const formatTrainerValue = (value, unit) => (hasInputValue(value) ? `${value} ${unit}` : '--')

  const openTrainerInput = (player) => {
    const hasTrainerInput = hasTrainerInputValue(player.trainer_input)

    setInputPlayer(player)
    setInputMode(hasTrainerInput ? 'view' : 'add')
    setTrainerInput({
      highest_jump: player.trainer_input?.highest_jump ?? '',
      strongest_spike: player.trainer_input?.strongest_spike ?? '',
    })
    setError('')
  }

  const saveTrainerInput = async (event) => {
    event.preventDefault()
    if (!inputPlayer || savingInput) return

    try {
      setSavingInput(true)
      const payload = await apiRequest(
        `/training-schedules/${scheduleId}/players/${inputPlayer.player_id}/trainer-input`,
        {
          method: 'POST',
          body: {
            highest_jump: trainerInput.highest_jump,
            strongest_spike: trainerInput.strongest_spike,
          },
        }
      )

      setPlayers((current) => current.map((player) => (
        String(player.player_id) === String(inputPlayer.player_id)
          ? {
              ...player,
              trainer_input: {
                highest_jump: payload.highest_jump,
                strongest_spike: payload.strongest_spike,
              },
            }
          : player
      )))
      setInputPlayer(null)
      setInputMode('add')
      setTrainerInput({ highest_jump: '', strongest_spike: '' })
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingInput(false)
    }
  }

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
            <span>Highest Jump</span>
            <span>Strongest Spike</span>
            <span>Status</span>
          </div>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : players.map((player) => {
            const hasTrainerInput = hasTrainerInputValue(player.trainer_input)

            return (
              <article
                className="admin-attendance-player-row is-clickable"
                key={player.player_id}
                role="button"
                tabIndex={0}
                onClick={() => openTrainerInput(player)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openTrainerInput(player)
                  }
                }}
                aria-label={`${hasTrainerInput ? 'View' : 'Add'} trainer input for ${player.name}`}
              >
                <div className="admin-attendance-player-main">
                  <strong>{player.name}</strong>
                  <small>{player.email || 'Player'}</small>
                </div>
                <span>{player.position || '-'}</span>
                <span>{player.jersey_number ? `#${player.jersey_number}` : '-'}</span>
                <span>{formatTrainerValue(player.trainer_input?.highest_jump, 'in')}</span>
                <span>{formatTrainerValue(player.trainer_input?.strongest_spike, 'km/h')}</span>
                {hasTrainerInput ? (
                  <StatusBadge tone="success">Done</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">Pending</StatusBadge>
                )}
              </article>
            )
          })}
        </div>
        {!players.length && !loading && <EmptyState>No players found for this team.</EmptyState>}
      </AdminCard>

      {inputPlayer && (
        <div
          className="admin-offcanvas-backdrop"
          role="presentation"
          onMouseDown={() => {
            if (!savingInput) setInputPlayer(null)
          }}
        >
          <aside
            className="admin-offcanvas admin-trainer-input-offcanvas"
            aria-label="Trainer attendance input"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-offcanvas-header">
              <div>
                <p className="admin-kicker">{inputMode === 'view' ? 'Trainer Input Review' : 'Trainer Input'}</p>
                <h2>{inputPlayer.name}</h2>
                <small>{formatDate(schedule?.session_date)} - {schedule?.session_type || 'training'}</small>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setInputPlayer(null)}
                aria-label="Close trainer input"
                disabled={savingInput}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-password-tip">
              <Activity size={18} />
              <p>Tip: enter the best verified measurement from this session. Highest jump is vertical reach output, and strongest spike is the fastest recorded attack speed.</p>
            </div>

            <form className="admin-form admin-trainer-input-form" onSubmit={saveTrainerInput}>
              <AdminField label="Highest Jump" className="admin-trainer-input-field">
                <div className="admin-unit-input">
                  <AdminInput
                    disabled={savingInput || inputMode === 'view'}
                    min="0"
                    step="0.1"
                    type="number"
                    value={trainerInput.highest_jump}
                    onChange={(event) => setTrainerInput((current) => ({ ...current, highest_jump: event.target.value }))}
                    placeholder="32"
                  />
                  <span>inches</span>
                </div>
              </AdminField>
              <AdminField label="Strongest Spike" className="admin-trainer-input-field">
                <div className="admin-unit-input">
                  <AdminInput
                    disabled={savingInput || inputMode === 'view'}
                    min="0"
                    step="0.1"
                    type="number"
                    value={trainerInput.strongest_spike}
                    onChange={(event) => setTrainerInput((current) => ({ ...current, strongest_spike: event.target.value }))}
                    placeholder="78"
                  />
                  <span>km/h</span>
                </div>
              </AdminField>
              <div className="admin-profile-offcanvas-actions">
                <AdminButton
                  type="button"
                  variant={inputMode === 'view' ? 'danger' : 'secondary'}
                  onClick={() => setInputPlayer(null)}
                  disabled={savingInput}
                >
                  {inputMode === 'view' ? 'Close' : 'Cancel'}
                </AdminButton>
                {inputMode !== 'view' && (
                  <AdminButton type="submit" disabled={savingInput}>{savingInput ? 'Saving...' : 'Save Input'}</AdminButton>
                )}
              </div>
            </form>
          </aside>
        </div>
      )}

      {savingInput && (
        <div className="admin-sync-backdrop" role="presentation">
          <section className="admin-sync-modal" role="status" aria-live="polite">
            <div className="admin-sync-spinner" />
            <h2>Saving Trainer Input</h2>
            <p>Saving the player&apos;s highest jump and strongest spike for this attendance session.</p>
          </section>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminAttendanceCheck
