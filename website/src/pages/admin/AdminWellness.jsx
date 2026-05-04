import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  AdminSelect,
  EmptyState,
  StatusBadge,
  formatDate,
  getName,
} from './AdminLayout'
import { createResource, listResource, readSavedUser } from '../../lib/api'

const sessionTypes = ['training', 'conditioning', 'match']
const injuryStatuses = ['none', 'minor', 'moderate', 'injured']

const blankLog = {
  user_id: '',
  session_type: 'training',
  fatigue_level: '',
  rpe: '',
  sleep_quality: '',
  energy_level: '',
  injury_status: 'none',
}

const scoreTone = (value, warningAt, dangerAt) => {
  const score = Number(value) || 0
  if (score >= dangerAt) return 'error'
  if (score >= warningAt) return 'warning'
  return 'success'
}

const AdminWellness = ({ currentPath = '#trainer/wellness' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const [logs, setLogs] = useState([])
  const [players, setPlayers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(blankLog)
  const [error, setError] = useState('')

  const playerIds = useMemo(() => new Set(players.map((player) => String(player.id))), [players])

  const load = async () => {
    const [logRows, playerRows, memberRows, trainerLinkRows] = await Promise.all([
      listResource('performance-logs', { limit: 100 }),
      listResource('players'),
      isTrainerView ? listResource('team-members', { limit: 100 }) : Promise.resolve([]),
      isTrainerView ? listResource('team-trainers', { limit: 100 }) : Promise.resolve([]),
    ])

    let scopedPlayers = playerRows

    if (isTrainerView) {
      const trainerTeamIds = new Set(
        trainerLinkRows
          .filter((link) => String(link.trainer_id) === String(currentUser?.id))
          .map((link) => String(link.team_id)),
      )
      const scopedPlayerIds = new Set(
        memberRows
          .filter((membership) => trainerTeamIds.has(String(membership.team_id)))
          .map((membership) => String(membership.player_id)),
      )

      scopedPlayers = playerRows.filter((player) => scopedPlayerIds.has(String(player.id)))
    }

    const scopedPlayerIds = new Set(scopedPlayers.map((player) => String(player.id)))
    const wellnessRows = logRows.filter((log) => (
      scopedPlayerIds.has(String(log.user_id))
      && (
        log.fatigue_level !== null
        || log.rpe !== null
        || log.sleep_quality !== null
        || log.energy_level !== null
        || log.injury_status !== 'none'
      )
    ))

    setPlayers(scopedPlayers)
    setLogs(wellnessRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const openCreate = () => {
    setForm(blankLog)
    setModalOpen(true)
  }

  const saveLog = async (event) => {
    event.preventDefault()

    try {
      await createResource('performance-logs', {
        user_id: form.user_id,
        session_type: form.session_type,
        action_type: 'run',
        result: 'normal',
        minutes_played: 0,
        fatigue_level: form.fatigue_level ? Number(form.fatigue_level) : null,
        rpe: form.rpe ? Number(form.rpe) : null,
        sleep_quality: form.sleep_quality ? Number(form.sleep_quality) : null,
        energy_level: form.energy_level ? Number(form.energy_level) : null,
        injury_status: form.injury_status,
      })
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminLayout title="Wellness Log" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-stat-grid">
        <AdminCard className="admin-stat-card">
          <span>Players</span>
          <strong>{players.length}</strong>
        </AdminCard>
        <AdminCard className="admin-stat-card">
          <span>Wellness Logs</span>
          <strong>{logs.length}</strong>
        </AdminCard>
        <AdminCard className="admin-stat-card">
          <span>Flagged Injuries</span>
          <strong>{logs.filter((log) => log.injury_status && log.injury_status !== 'none').length}</strong>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>Recovery Check-ins</h2>
            <p className="admin-muted">Review fatigue, RPE, sleep, energy, and injury status from player logs.</p>
          </div>
          <AdminButton onClick={openCreate}>
            <Plus size={17} />
            Add Wellness Log
          </AdminButton>
        </div>

        <div className="admin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Session</th>
                <th>Fatigue</th>
                <th>RPE</th>
                <th>Sleep</th>
                <th>Energy</th>
                <th>Injury</th>
                <th>Logged</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{getName(players, log.user_id)}</td>
                  <td>{log.session_type || '-'}</td>
                  <td><StatusBadge tone={scoreTone(log.fatigue_level, 4, 5)}>{log.fatigue_level || '-'}</StatusBadge></td>
                  <td><StatusBadge tone={scoreTone(log.rpe, 7, 9)}>{log.rpe || '-'}</StatusBadge></td>
                  <td>{log.sleep_quality || '-'}</td>
                  <td>{log.energy_level || '-'}</td>
                  <td>
                    <StatusBadge tone={log.injury_status && log.injury_status !== 'none' ? 'warning' : 'success'}>
                      {log.injury_status || 'none'}
                    </StatusBadge>
                  </td>
                  <td>{formatDate(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <EmptyState>No wellness logs yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminModal open={modalOpen} title="Add Wellness Log" onClose={() => setModalOpen(false)}>
        <form className="admin-form admin-form-grid" onSubmit={saveLog}>
          <AdminField label="Player">
            <AdminSelect required value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}>
              <option value="">Select player</option>
              {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Session">
            <AdminSelect value={form.session_type} onChange={(event) => setForm((current) => ({ ...current, session_type: event.target.value }))}>
              {sessionTypes.map((type) => <option key={type}>{type}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Fatigue (1-5)">
            <AdminInput required type="number" min="1" max="5" value={form.fatigue_level} onChange={(event) => setForm((current) => ({ ...current, fatigue_level: event.target.value }))} />
          </AdminField>
          <AdminField label="RPE (1-10)">
            <AdminInput required type="number" min="1" max="10" value={form.rpe} onChange={(event) => setForm((current) => ({ ...current, rpe: event.target.value }))} />
          </AdminField>
          <AdminField label="Sleep Quality (1-5)">
            <AdminInput type="number" min="1" max="5" value={form.sleep_quality} onChange={(event) => setForm((current) => ({ ...current, sleep_quality: event.target.value }))} />
          </AdminField>
          <AdminField label="Energy (1-5)">
            <AdminInput type="number" min="1" max="5" value={form.energy_level} onChange={(event) => setForm((current) => ({ ...current, energy_level: event.target.value }))} />
          </AdminField>
          <AdminField label="Injury Status">
            <AdminSelect value={form.injury_status} onChange={(event) => setForm((current) => ({ ...current, injury_status: event.target.value }))}>
              {injuryStatuses.map((status) => <option key={status}>{status}</option>)}
            </AdminSelect>
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Save Wellness Log</AdminButton>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminWellness
