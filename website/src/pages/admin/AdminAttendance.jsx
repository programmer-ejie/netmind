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

const attendanceStatuses = ['present', 'late', 'absent', 'excused']
const sessionTypes = ['practice', 'training', 'match', 'drill']

const blankLog = {
  player_id: '',
  team_id: '',
  session_type: 'training',
  session_date: new Date().toISOString().slice(0, 10),
  status: 'present',
  late_minutes: '',
  reason: '',
}

const AdminAttendance = ({ currentPath = '#trainer/attendance' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const [logs, setLogs] = useState([])
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(blankLog)
  const [error, setError] = useState('')

  const teamByPlayer = useMemo(() => {
    const map = new Map()
    memberships.forEach((membership) => map.set(String(membership.player_id), membership.team_id))
    return map
  }, [memberships])

  const load = async () => {
    const [logRows, playerRows, teamRows, memberRows, trainerLinkRows] = await Promise.all([
      listResource('attendance-logs', { limit: 100 }),
      listResource('players'),
      listResource('teams', { limit: 100 }),
      listResource('team-members', { limit: 100 }),
      isTrainerView ? listResource('team-trainers', { limit: 100 }) : Promise.resolve([]),
    ])

    if (isTrainerView) {
      const trainerTeamIds = new Set(
        trainerLinkRows
          .filter((link) => String(link.trainer_id) === String(currentUser?.id))
          .map((link) => String(link.team_id)),
      )
      const scopedMemberships = memberRows.filter((membership) => trainerTeamIds.has(String(membership.team_id)))
      const scopedPlayerIds = new Set(scopedMemberships.map((membership) => String(membership.player_id)))

      setLogs(logRows.filter((log) => (
        trainerTeamIds.has(String(log.team_id)) || scopedPlayerIds.has(String(log.player_id))
      )))
      setPlayers(playerRows.filter((player) => scopedPlayerIds.has(String(player.id))))
      setTeams(teamRows.filter((team) => trainerTeamIds.has(String(team.id))))
      setMemberships(scopedMemberships)
      return
    }

    setLogs(logRows)
    setPlayers(playerRows)
    setTeams(teamRows)
    setMemberships(memberRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const openCreate = () => {
    setForm(blankLog)
    setModalOpen(true)
  }

  const updatePlayer = (playerId) => {
    setForm((current) => ({
      ...current,
      player_id: playerId,
      team_id: teamByPlayer.get(String(playerId)) || current.team_id,
    }))
  }

  const createLog = async (event) => {
    event.preventDefault()

    try {
      await createResource('attendance-logs', {
        ...form,
        late_minutes: form.late_minutes ? Number(form.late_minutes) : 0,
        reason: form.reason || null,
        marked_by: currentUser?.id || null,
      })
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminLayout title="Attendance" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>Attendance Logs</h2>
            <p className="admin-muted">Track player availability for training, drills, and matches.</p>
          </div>
          <AdminButton onClick={openCreate}>
            <Plus size={17} />
            Mark Attendance
          </AdminButton>
        </div>

        <div className="admin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Session</th>
                <th>Date</th>
                <th>Status</th>
                <th>Late</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.name || getName(players, log.player_id)}</td>
                  <td>{getName(teams, log.team_id)}</td>
                  <td>{log.session_type || '-'}</td>
                  <td>{formatDate(log.session_date)}</td>
                  <td><StatusBadge tone={log.status === 'present' ? 'success' : 'warning'}>{log.status}</StatusBadge></td>
                  <td>{log.late_minutes ? `${log.late_minutes} min` : '-'}</td>
                  <td>{log.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <EmptyState>No attendance logs yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminModal open={modalOpen} title="Mark Attendance" onClose={() => setModalOpen(false)}>
        <form className="admin-form admin-form-grid" onSubmit={createLog}>
          <AdminField label="Player">
            <AdminSelect required value={form.player_id} onChange={(event) => updatePlayer(event.target.value)}>
              <option value="">Select player</option>
              {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Team">
            <AdminSelect required value={form.team_id} onChange={(event) => setForm((current) => ({ ...current, team_id: event.target.value }))}>
              <option value="">Select team</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Session">
            <AdminSelect value={form.session_type} onChange={(event) => setForm((current) => ({ ...current, session_type: event.target.value }))}>
              {sessionTypes.map((type) => <option key={type}>{type}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Date">
            <AdminInput required type="date" value={form.session_date} onChange={(event) => setForm((current) => ({ ...current, session_date: event.target.value }))} />
          </AdminField>
          <AdminField label="Status">
            <AdminSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              {attendanceStatuses.map((status) => <option key={status}>{status}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Late Minutes">
            <AdminInput type="number" min="0" value={form.late_minutes} onChange={(event) => setForm((current) => ({ ...current, late_minutes: event.target.value }))} />
          </AdminField>
          <AdminField label="Reason" className="admin-form-span">
            <AdminInput value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Save Attendance</AdminButton>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminAttendance
