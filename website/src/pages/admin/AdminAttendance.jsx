import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { CalendarDays, ClipboardCheck, Info, Plus, QrCode } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  AdminSelect,
  AdminTextarea,
  EmptyState,
  formatDate,
  getName,
  initials,
} from './AdminLayout'
import { API_BASE, apiRequest, createResource, listResource, readSavedUser } from '../../lib/api'
import { toLocalDateKey } from '../../lib/dateKeys'

const blankSchedule = {
  team_id: '',
  session_type: 'training',
  session_date: toLocalDateKey(),
  description: '',
}

const isPastSchedule = (schedule) => {
  const sessionDate = toLocalDateKey(schedule?.session_date)
  return Boolean(sessionDate) && sessionDate < toLocalDateKey()
}

const getTeamLogoSrc = (team) => {
  if (team?.team_logo_file_id) return `${API_BASE}/team-logos/${team.team_logo_file_id}`
  return team?.logo_url || ''
}

const AdminAttendance = ({ currentPath = '#trainer/attendance' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const [schedules, setSchedules] = useState([])
  const [teams, setTeams] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [activeSchedule, setActiveSchedule] = useState(null)
  const [form, setForm] = useState(blankSchedule)
  const [qrState, setQrState] = useState({ loading: false, image: '', token: '', expiresAt: '', error: '' })
  const [qrCache, setQrCache] = useState(() => new Map())
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [failedLogoIds, setFailedLogoIds] = useState(() => new Set())
  const [error, setError] = useState('')

  const teamById = useMemo(() => {
    const map = new Map()
    teams.forEach((team) => map.set(String(team.id), team))
    return map
  }, [teams])

  const load = useCallback(async () => {
    const teamParams = {
      limit: 100,
      ...(currentUser?.role === 'coach' && currentUser?.id ? { coach_id: currentUser.id } : {}),
    }
    const [scheduleRows, teamRows, trainerLinkRows] = await Promise.all([
      listResource('training-schedules', { limit: 100 }),
      listResource('teams', teamParams),
      isTrainerView ? listResource('team-trainers', { limit: 100 }) : Promise.resolve([]),
    ])

    if (isTrainerView) {
      const trainerTeamIds = new Set(
        trainerLinkRows
          .filter((link) => String(link.trainer_id) === String(currentUser?.id))
          .map((link) => String(link.team_id)),
      )

      setSchedules(scheduleRows.filter((schedule) => trainerTeamIds.has(String(schedule.team_id))))
      setTeams(teamRows.filter((team) => trainerTeamIds.has(String(team.id))))
      return
    }

    const coachTeamIds = new Set(teamRows.map((team) => String(team.id)))
    setSchedules(scheduleRows.filter((schedule) => coachTeamIds.has(String(schedule.team_id))))
    setTeams(teamRows)
  }, [currentUser?.id, currentUser?.role, isTrainerView])

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [load])

  const openCreate = () => {
    setForm(blankSchedule)
    setModalOpen(true)
  }

  const createSchedule = async (event) => {
    event.preventDefault()

    try {
      await createResource('training-schedules', {
        ...form,
        session_type: 'training',
        created_by: currentUser?.id || null,
      })
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (!qrState.expiresAt) return undefined

    const tick = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(qrState.expiresAt).getTime() - Date.now()) / 1000)))
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [qrState.expiresAt])

  const getQrRemainingSeconds = (expiresAt) => (
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )

  const formatQrCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return `${minutes}:${String(remainder).padStart(2, '0')}`
  }

  const generateQr = useCallback(async (schedule) => {
    if (!schedule || isPastSchedule(schedule)) {
      setQrState({ loading: false, image: '', token: '', expiresAt: '', error: 'QR codes are disabled for past training dates.' })
      return
    }

    setQrState({ loading: true, image: '', token: '', expiresAt: '', error: '' })
    setRemainingSeconds(0)

    try {
      const payload = await apiRequest(`/training-schedules/${schedule.id}/qr-token`, {
        method: 'POST',
        body: { created_by: currentUser?.id || null },
      })
      const image = await QRCode.toDataURL(payload.check_in_url, {
        width: 260,
        margin: 2,
        color: {
          dark: '#193746',
          light: '#ffffff',
        },
      })

      const nextQrState = {
        loading: false,
        image,
        token: payload.token,
        expiresAt: payload.expires_at,
        error: '',
      }

      setQrState(nextQrState)
      setQrCache((current) => {
        const next = new Map(current)
        next.set(String(schedule.id), nextQrState)
        return next
      })
    } catch (err) {
      setQrState({ loading: false, image: '', token: '', expiresAt: '', error: err.message })
    }
  }, [currentUser?.id])

  const openQr = (schedule) => {
    if (isPastSchedule(schedule)) return

    setActiveSchedule(schedule)
    setQrModalOpen(true)
    const cached = qrCache.get(String(schedule.id))

    if (cached?.expiresAt && getQrRemainingSeconds(cached.expiresAt) > 0) {
      setQrState(cached)
      setRemainingSeconds(getQrRemainingSeconds(cached.expiresAt))
      return
    }

    generateQr(schedule)
  }

  const activeTeam = activeSchedule ? teamById.get(String(activeSchedule.team_id)) : null
  const qrExpired = Boolean(qrState.expiresAt) && remainingSeconds <= 0

  return (
    <AdminLayout title="Training Schedule" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard className="admin-dashboard-card admin-schedule-header-card">
        <div className="admin-card-header">
          <div>
            <h2>Training Schedule</h2>
            <p className="admin-muted">Plan team sessions by date.</p>
          </div>
          <AdminButton onClick={openCreate}>
            <Plus size={17} />
            Add Schedule
          </AdminButton>
        </div>
      </AdminCard>

      <AdminCard className="admin-dashboard-card admin-schedule-list-card">
        <div className="admin-schedule-grid">
          {schedules.map((schedule) => {
            const team = teamById.get(String(schedule.team_id))
            const teamName = team?.team_name || getName(teams, schedule.team_id, 'Team')
            const logoSrc = getTeamLogoSrc(team)
            const showLogo = logoSrc && !failedLogoIds.has(String(team.id))
            const pastSchedule = isPastSchedule(schedule)

            return (
              <article className="admin-schedule-card" key={schedule.id}>
                <div className="admin-schedule-card-top">
                  <span className="admin-schedule-date">
                    <CalendarDays size={15} />
                    {formatDate(schedule.session_date)}
                  </span>
                </div>
                <div className="admin-schedule-team">
                  {showLogo ? (
                    <img
                      className="admin-schedule-logo"
                      src={logoSrc}
                      alt={`${teamName} logo`}
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setFailedLogoIds((current) => {
                          const next = new Set(current)
                          next.add(String(team.id))
                          return next
                        })
                      }}
                    />
                  ) : (
                    <span className="admin-schedule-logo fallback" style={{ background: team?.team_color || '#12aabd' }}>
                      {initials(teamName)}
                    </span>
                  )}
                  <div>
                    <small>Team</small>
                    <h3>{teamName}</h3>
                  </div>
                </div>
                <div className="admin-schedule-actions">
                  <AdminButton
                    variant="secondary"
                    onClick={() => openQr(schedule)}
                    disabled={pastSchedule}
                    title={pastSchedule ? 'QR disabled because this training date has passed' : 'Generate QR'}
                    aria-label={pastSchedule ? `QR disabled for past training date for ${teamName}` : `Generate QR for ${teamName}`}
                  >
                    <QrCode size={17} />
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    onClick={() => { window.location.hash = `${isTrainerView ? 'trainer' : 'coach'}/attendance/${schedule.id}/check` }}
                    aria-label={`Check attendance for ${teamName}`}
                  >
                    <ClipboardCheck size={17} />
                  </AdminButton>
                </div>
              </article>
            )
          })}
        </div>
        {!schedules.length && <EmptyState>No training schedules yet.</EmptyState>}
      </AdminCard>

      <AdminModal open={modalOpen} title="Training Schedule" onClose={() => setModalOpen(false)}>
        <form className="admin-form admin-form-grid" onSubmit={createSchedule}>
          <div className="admin-password-tip admin-form-span">
            <Info size={18} />
            <p>Select the team, add a short description, then set the training date before saving the schedule.</p>
          </div>

          <AdminField label="Team">
            <AdminSelect required value={form.team_id} onChange={(event) => setForm((current) => ({ ...current, team_id: event.target.value }))}>
              <option value="">Select team</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Date">
            <AdminInput required type="date" value={form.session_date} onChange={(event) => setForm((current) => ({ ...current, session_date: event.target.value }))} />
          </AdminField>
          <AdminField label="Description" className="admin-form-span">
            <AdminTextarea
              placeholder="Input schedule details"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Save</AdminButton>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={qrModalOpen}
        title="Training QR"
        subtitle={activeTeam ? `${activeTeam.team_name} - ${formatDate(activeSchedule?.session_date)}` : ''}
        className="admin-qr-modal"
        onClose={() => setQrModalOpen(false)}
      >
        <div className="admin-qr-panel">
          <div className="admin-password-tip">
            <Info size={18} />
            <p>This QR stays active until the countdown expires. Players can scan it in the app to check in for attendance.</p>
          </div>

          <div className={`admin-qr-code ${qrExpired ? 'expired' : ''}`}>
            {qrState.loading && <span>Generating QR...</span>}
            {qrState.image && <img src={qrState.image} alt="Training attendance QR code" />}
            {qrExpired && (
              <div className="admin-qr-expired">
                <strong>QR expired</strong>
                <AdminButton type="button" onClick={() => generateQr(activeSchedule)}>Generate Again</AdminButton>
              </div>
            )}
          </div>

          {qrState.error && <div className="admin-alert">{qrState.error}</div>}
          {!qrExpired && qrState.expiresAt && (
            <p className="admin-qr-countdown">Expires in {formatQrCountdown(remainingSeconds)}</p>
          )}
        </div>
      </AdminModal>

    </AdminLayout>
  )
}

export default AdminAttendance
