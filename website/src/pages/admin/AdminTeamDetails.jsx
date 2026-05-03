import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, UserPlus } from 'lucide-react'
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
  initials,
  positions,
} from './AdminLayout'
import { apiRequest, getResource, listResource, registerUser } from '../../lib/api'

const blankPlayer = {
  name: '',
  email: '',
  password: '',
  position: 'OH',
  jersey_number: '',
}

const AdminTeamDetails = ({ teamId, currentPath = '#admin/teams' }) => {
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [assignedTrainers, setAssignedTrainers] = useState([])
  const [trainers, setTrainers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [selectedTrainer, setSelectedTrainer] = useState('')
  const [playerForm, setPlayerForm] = useState(blankPlayer)
  const [playerModal, setPlayerModal] = useState(false)
  const [error, setError] = useState('')

  const assignedTrainerIds = useMemo(
    () => new Set(assignedTrainers.map((trainer) => String(trainer.trainer_id))),
    [assignedTrainers],
  )
  const availableTrainers = trainers.filter((trainer) => !assignedTrainerIds.has(String(trainer.id)))
  const assignedBy = coaches[0]?.id || team?.coach_id || 1

  const load = async () => {
    if (!teamId) return

    const [teamRow, memberRows, trainerRows, allTrainers, coachRows] = await Promise.all([
      getResource('teams', teamId),
      apiRequest(`/teams/${teamId}/members`),
      apiRequest(`/teams/${teamId}/trainers`),
      listResource('trainers'),
      listResource('coaches'),
    ])

    setTeam(teamRow)
    setPlayers(memberRows)
    setAssignedTrainers(trainerRows)
    setTrainers(allTrainers)
    setCoaches(coachRows)
    setSelectedTrainer('')
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [teamId])

  const assignTrainer = async (event) => {
    event.preventDefault()
    if (!selectedTrainer) return

    try {
      await apiRequest(`/teams/${teamId}/trainers`, {
        method: 'POST',
        body: { trainer_id: selectedTrainer, assigned_by: assignedBy },
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const addPlayer = async (event) => {
    event.preventDefault()

    try {
      const player = await registerUser({
        ...playerForm,
        role: 'player',
        jersey_number: playerForm.jersey_number ? Number(playerForm.jersey_number) : null,
      })
      await apiRequest(`/teams/${teamId}/members`, {
        method: 'POST',
        body: { player_id: player.id, joined_at: new Date().toISOString().slice(0, 10) },
      })
      setPlayerModal(false)
      setPlayerForm(blankPlayer)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removePlayer = async (player) => {
    if (!window.confirm(`Remove ${player.name} from ${team?.team_name || 'team'}?`)) return

    try {
      await apiRequest(`/teams/${teamId}/members/${player.player_id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeTrainer = async (trainer) => {
    if (!window.confirm(`Remove ${trainer.name} from ${team?.team_name || 'team'}?`)) return

    try {
      await apiRequest(`/teams/${teamId}/trainers/${trainer.trainer_id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminLayout title={team?.team_name || 'Team Details'} currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-detail-head">
        <AdminCard>
          <div className="admin-team-hero">
            <span style={{ background: team?.team_color || '#635bff' }}>{initials(team?.team_name)}</span>
            <div>
              <p className="admin-kicker">Team Workspace</p>
              <h2>{team?.team_name || 'Loading team'}</h2>
              <small>Created {formatDate(team?.created_at)}</small>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <form className="admin-inline-form" onSubmit={assignTrainer}>
            <AdminField label="Assign Trainer">
              <AdminSelect
                value={selectedTrainer}
                onChange={(event) => setSelectedTrainer(event.target.value)}
              >
                <option value="">Select available trainer</option>
                {availableTrainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminButton type="submit">
              <UserPlus size={16} />
              Assign
            </AdminButton>
          </form>
        </AdminCard>
      </div>

      <div className="admin-two-column">
        <AdminCard>
          <div className="admin-card-header">
            <div>
              <h2>Players</h2>
              <p className="admin-muted">Team roster and active members.</p>
            </div>
            <AdminButton onClick={() => setPlayerModal(true)}>
              <Plus size={17} />
              Add Player
            </AdminButton>
          </div>

          <div className="admin-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Jersey</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.player_id}>
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
                    <td>{player.jersey_number || '-'}</td>
                    <td>{formatDate(player.joined_at)}</td>
                    <td>
                      <AdminButton variant="danger" onClick={() => removePlayer(player)}>
                        <Trash2 size={15} />
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!players.length && <EmptyState>No players in this team yet.</EmptyState>}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="admin-card-header">
            <h2>Assigned Trainers</h2>
            <StatusBadge tone="secondary">{assignedTrainers.length} assigned</StatusBadge>
          </div>
          <div className="admin-list">
            {assignedTrainers.map((trainer) => (
              <div className="admin-list-item" key={trainer.trainer_id}>
                <span className="admin-avatar">{initials(trainer.name)}</span>
                <div>
                  <strong>{trainer.name}</strong>
                  <small>{trainer.email}</small>
                </div>
                <AdminButton variant="danger" onClick={() => removeTrainer(trainer)}>
                  <Trash2 size={15} />
                </AdminButton>
              </div>
            ))}
            {!assignedTrainers.length && <EmptyState>No trainers assigned yet.</EmptyState>}
          </div>
        </AdminCard>
      </div>

      <AdminModal open={playerModal} title="Add Player" onClose={() => setPlayerModal(false)}>
        <form className="admin-form admin-form-grid" onSubmit={addPlayer}>
          <AdminField label="Full Name">
            <AdminInput
              required
              value={playerForm.name}
              onChange={(event) => setPlayerForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Player name"
            />
          </AdminField>
          <AdminField label="Email">
            <AdminInput
              required
              type="email"
              value={playerForm.email}
              onChange={(event) => setPlayerForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="player@example.com"
            />
          </AdminField>
          <AdminField label="Password">
            <AdminInput
              required
              type="password"
              minLength="6"
              value={playerForm.password}
              onChange={(event) => setPlayerForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Minimum 6 characters"
            />
          </AdminField>
          <AdminField label="Position">
            <AdminSelect
              value={playerForm.position}
              onChange={(event) => setPlayerForm((current) => ({ ...current, position: event.target.value }))}
            >
              {positions.map((position) => <option key={position}>{position}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Jersey">
            <AdminInput
              type="number"
              value={playerForm.jersey_number}
              onChange={(event) => setPlayerForm((current) => ({ ...current, jersey_number: event.target.value }))}
              placeholder="7"
            />
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setPlayerModal(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit">Add Player</AdminButton>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminTeamDetails
