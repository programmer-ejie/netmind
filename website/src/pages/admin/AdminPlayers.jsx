import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Edit3, Plus, Trash2 } from 'lucide-react'
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
  initials,
  positions,
} from './AdminLayout'
import { apiRequest, deleteResource, listResource, readSavedUser, registerUser, updateResource } from '../../lib/api'

const blankCreate = {
  name: '',
  email: '',
  password: '',
  position: 'OH',
  jersey_number: '',
  team_id: '',
}

const AdminPlayers = ({ currentPath = '#coach/players' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const isPlayerDetails = currentPath.includes('player-details')
  const pageTitle = isPlayerDetails ? 'Player Details' : isTrainerView ? 'My Players' : 'Players'
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [statsModal, setStatsModal] = useState(false)
  const [createForm, setCreateForm] = useState(blankCreate)
  const [editForm, setEditForm] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  const teamByPlayer = useMemo(() => {
    const map = new Map()
    memberships.forEach((membership) => map.set(String(membership.player_id), membership.team_id))
    return map
  }, [memberships])

  const load = async () => {
    const [playerRows, teamRows, memberRows, trainerLinkRows] = await Promise.all([
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

      setPlayers(playerRows.filter((player) => scopedPlayerIds.has(String(player.id))))
      setTeams(teamRows.filter((team) => trainerTeamIds.has(String(team.id))))
      setMemberships(scopedMemberships)
      return
    }

    setPlayers(playerRows)
    setTeams(teamRows)
    setMemberships(memberRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const createPlayer = async (event) => {
    event.preventDefault()

    try {
      const player = await registerUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: 'player',
        position: createForm.position,
        jersey_number: createForm.jersey_number ? Number(createForm.jersey_number) : null,
      })

      if (createForm.team_id) {
        await apiRequest(`/teams/${createForm.team_id}/members`, {
          method: 'POST',
          body: { player_id: player.id, joined_at: new Date().toISOString().slice(0, 10) },
        })
      }

      setCreateModal(false)
      setCreateForm(blankCreate)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const openEdit = (player) => {
    setEditForm({
      id: player.id,
      name: player.name || '',
      email: player.email || '',
      position: player.position || 'OH',
      jersey_number: player.jersey_number || '',
      is_active: player.is_active ?? true,
    })
    setEditModal(true)
  }

  const savePlayer = async (event) => {
    event.preventDefault()

    try {
      await updateResource('users', editForm.id, {
        name: editForm.name,
        email: editForm.email,
        position: editForm.position,
        jersey_number: editForm.jersey_number ? Number(editForm.jersey_number) : null,
        is_active: Boolean(editForm.is_active),
      })
      setEditModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removePlayer = async (player) => {
    if (!window.confirm(`Delete ${player.name}?`)) return

    try {
      await deleteResource('users', player.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const openStats = async (player) => {
    setStatsModal(true)
    setStats({ loading: true, player })

    try {
      const [summary, logs] = await Promise.all([
        apiRequest(`/players/${player.id}/summary`),
        apiRequest(`/players/${player.id}/performance-logs`),
      ])
      setStats({ ...summary, logs, loading: false })
    } catch (err) {
      setStats({ loading: false, error: err.message, player })
    }
  }

  return (
    <AdminLayout title={pageTitle} currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>All Players</h2>
            <p className="admin-muted">
              {isTrainerView ? 'Review players assigned to your teams.' : 'Create, edit, delete, and inspect player stats.'}
            </p>
          </div>
          {!isTrainerView && (
            <AdminButton onClick={() => setCreateModal(true)}>
              <Plus size={17} />
              Create Player
            </AdminButton>
          )}
        </div>

        <div className="admin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Position</th>
                <th>Jersey</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
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
                  <td>{getName(teams, teamByPlayer.get(String(player.id)))}</td>
                  <td>{player.position || '-'}</td>
                  <td>{player.jersey_number || '-'}</td>
                  <td>
                    <StatusBadge tone={player.is_active ? 'success' : 'warning'}>
                      {player.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <AdminButton variant="secondary" onClick={() => openStats(player)} aria-label="View stats">
                        <BarChart3 size={15} />
                      </AdminButton>
                      {!isTrainerView && (
                        <>
                          <AdminButton variant="secondary" onClick={() => openEdit(player)} aria-label="Edit player">
                            <Edit3 size={15} />
                          </AdminButton>
                          <AdminButton variant="danger" onClick={() => removePlayer(player)} aria-label="Delete player">
                            <Trash2 size={15} />
                          </AdminButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!players.length && <EmptyState>No player accounts yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminModal open={createModal} title="Create Player" onClose={() => setCreateModal(false)}>
        <form className="admin-form admin-form-grid" onSubmit={createPlayer}>
          <AdminField label="Full Name">
            <AdminInput required value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
          </AdminField>
          <AdminField label="Email">
            <AdminInput required type="email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} />
          </AdminField>
          <AdminField label="Password">
            <AdminInput required type="password" minLength="6" value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} />
          </AdminField>
          <AdminField label="Position">
            <AdminSelect value={createForm.position} onChange={(event) => setCreateForm((current) => ({ ...current, position: event.target.value }))}>
              {positions.map((position) => <option key={position}>{position}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Jersey">
            <AdminInput type="number" value={createForm.jersey_number} onChange={(event) => setCreateForm((current) => ({ ...current, jersey_number: event.target.value }))} />
          </AdminField>
          <AdminField label="Team">
            <AdminSelect value={createForm.team_id} onChange={(event) => setCreateForm((current) => ({ ...current, team_id: event.target.value }))}>
              <option value="">No team yet</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
            </AdminSelect>
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setCreateModal(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Create Player</AdminButton>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={editModal} title="Edit Player" onClose={() => setEditModal(false)}>
        {editForm && (
          <form className="admin-form admin-form-grid" onSubmit={savePlayer}>
            <AdminField label="Full Name">
              <AdminInput required value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
            </AdminField>
            <AdminField label="Email">
              <AdminInput required type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
            </AdminField>
            <AdminField label="Position">
              <AdminSelect value={editForm.position} onChange={(event) => setEditForm((current) => ({ ...current, position: event.target.value }))}>
                {positions.map((position) => <option key={position}>{position}</option>)}
              </AdminSelect>
            </AdminField>
            <AdminField label="Jersey">
              <AdminInput type="number" value={editForm.jersey_number} onChange={(event) => setEditForm((current) => ({ ...current, jersey_number: event.target.value }))} />
            </AdminField>
            <label className="admin-check-field admin-form-span">
              <input
                type="checkbox"
                checked={Boolean(editForm.is_active)}
                onChange={(event) => setEditForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Active account
            </label>
            <div className="admin-form-actions admin-form-span">
              <AdminButton type="button" variant="secondary" onClick={() => setEditModal(false)}>Cancel</AdminButton>
              <AdminButton type="submit">Save Player</AdminButton>
            </div>
          </form>
        )}
      </AdminModal>

      <AdminModal open={statsModal} title="Player Stats" onClose={() => setStatsModal(false)}>
        {stats?.loading && <EmptyState>Loading stats...</EmptyState>}
        {stats?.error && <div className="admin-alert">{stats.error}</div>}
        {stats && !stats.loading && !stats.error && (
          <div className="admin-stats-modal">
            <div className="admin-stat-grid compact">
              <AdminCard>
                <span className="admin-muted">Assignments</span>
                <strong>{stats.training?.total_assignments || 0}</strong>
              </AdminCard>
              <AdminCard>
                <span className="admin-muted">Completed</span>
                <strong>{stats.training?.completed || 0}</strong>
              </AdminCard>
              <AdminCard>
                <span className="admin-muted">Avg RPE</span>
                <strong>{Number(stats.wellness?.avg_rpe || 0).toFixed(1)}</strong>
              </AdminCard>
            </div>
            <div className="admin-table">
              <table className="admin-native-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Result</th>
                    <th>Total</th>
                    <th>Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.actions || []).map((action, index) => (
                    <tr key={`${action.action_type}-${action.result}-${index}`}>
                      <td>{action.action_type}</td>
                      <td>{action.result || '-'}</td>
                      <td>{action.total}</td>
                      <td>{Number(action.average_value || 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!stats.actions?.length && <EmptyState>No performance logs for this player.</EmptyState>}
            </div>
            <p className="admin-muted">Last logged: {formatDate(stats.wellness?.last_logged_at)}</p>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminPlayers
