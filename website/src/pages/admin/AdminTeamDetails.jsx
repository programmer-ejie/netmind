import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ImagePlus, Info, Plus, Trash2, TriangleAlert, UserPlus } from 'lucide-react'
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
import { API_BASE, apiRequest, getResource, listResource, readSavedUser, registerPlayerWithTemporaryPassword } from '../../lib/api'

const blankPlayer = {
  name: '',
  email: '',
  position: 'OH',
  jersey_number: '',
}

const getTeamLogoSrc = (team) => (
  team?.team_logo_file_id ? `${API_BASE}/team-logos/${team.team_logo_file_id}` : team?.logo_url
)

const AdminTeamDetails = ({ teamId, currentPath = '#coach/teams' }) => {
  const currentUser = readSavedUser()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [assignedTrainers, setAssignedTrainers] = useState([])
  const [trainers, setTrainers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [selectedTrainer, setSelectedTrainer] = useState('')
  const [playerForm, setPlayerForm] = useState(blankPlayer)
  const [playerModal, setPlayerModal] = useState(false)
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletePlayerModal, setDeletePlayerModal] = useState(false)
  const [deleteTrainerModal, setDeleteTrainerModal] = useState(false)
  const [removingPlayer, setRemovingPlayer] = useState(false)
  const [removingTrainer, setRemovingTrainer] = useState(false)
  const [deletePlayer, setDeletePlayer] = useState(null)
  const [deleteTrainer, setDeleteTrainer] = useState(null)
  const [error, setError] = useState('')

  const assignedTrainerIds = useMemo(
    () => new Set(assignedTrainers.map((trainer) => String(trainer.trainer_id))),
    [assignedTrainers],
  )
  const availableTrainers = trainers.filter((trainer) => !assignedTrainerIds.has(String(trainer.id)))
  const assignedBy = currentUser?.id || team?.coach_id || coaches[0]?.id || 1

  const load = async () => {
    if (!teamId) return

    const teamRow = await getResource('teams', teamId)
    const coachId = currentUser?.id || teamRow.coach_id
    const [memberRows, trainerRows, allTrainers, coachRows, coachTrainerRows] = await Promise.all([
      apiRequest(`/teams/${teamId}/members`),
      apiRequest(`/teams/${teamId}/trainers`),
      listResource('trainers'),
      listResource('coaches'),
      coachId ? listResource('coach-trainers', { coach_id: coachId, limit: 100 }) : Promise.resolve([]),
    ])
    const scopedTrainerIds = new Set(coachTrainerRows.map((link) => String(link.trainer_id)))
    trainerRows.forEach((link) => scopedTrainerIds.add(String(link.trainer_id)))

    setTeam(teamRow)
    setPlayers(memberRows)
    setAssignedTrainers(trainerRows)
    setTrainers(allTrainers.filter((trainer) => scopedTrainerIds.has(String(trainer.id))))
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
      if (assignedBy) {
        await apiRequest(`/coaches/${assignedBy}/trainers`, {
          method: 'POST',
          body: { trainer_id: selectedTrainer },
        })
      }
      await apiRequest(`/teams/${teamId}/trainers`, {
        method: 'POST',
        body: { trainer_id: selectedTrainer, assigned_by: assignedBy },
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const uploadTeamLogo = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !team?.id) return

    try {
      setError('')
      setUploadingLogo(true)
      const body = new FormData()
      body.append('team_logo', file)
      const payload = await apiRequest(`/teams/${team.id}/logo`, {
        method: 'POST',
        body,
      })
      setTeam(payload.team)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const addPlayer = async (event) => {
    event.preventDefault()

    try {
      setError('')
      setAddingPlayer(true)
      const player = await registerPlayerWithTemporaryPassword({
        ...playerForm,
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
    } finally {
      setAddingPlayer(false)
    }
  }

  const openRemovePlayer = (player) => {
    setDeletePlayer(player)
    setDeletePlayerModal(true)
  }

  const removePlayer = async (event) => {
    event.preventDefault()
    if (!deletePlayer) return

    try {
      setError('')
      setRemovingPlayer(true)
      await apiRequest(`/players/${deletePlayer.player_id}`, { method: 'DELETE' })
      setDeletePlayerModal(false)
      setDeletePlayer(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingPlayer(false)
    }
  }

  const openRemoveTrainer = (trainer) => {
    setDeleteTrainer(trainer)
    setDeleteTrainerModal(true)
  }

  const removeTrainer = async (event) => {
    event.preventDefault()
    if (!deleteTrainer) return

    try {
      setError('')
      setRemovingTrainer(true)
      await apiRequest(`/teams/${teamId}/trainers/${deleteTrainer.trainer_id}`, { method: 'DELETE' })
      setDeleteTrainerModal(false)
      setDeleteTrainer(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingTrainer(false)
    }
  }

  return (
    <AdminLayout title={team?.team_name || 'Team Details'} currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-detail-head">
        <AdminCard>
          <div className="admin-team-hero">
            <div className="admin-team-hero-main">
              <button
                type="button"
                className="admin-team-back"
                onClick={() => {
                  window.location.hash = 'coach/teams'
                }}
                aria-label="Back to teams"
              >
                <ArrowLeft size={18} />
              </button>
              {getTeamLogoSrc(team) ? (
                <img className="admin-team-logo" src={getTeamLogoSrc(team)} alt={`${team.team_name} logo`} />
              ) : (
                <span className="admin-team-logo" style={{ background: team?.team_color || '#635bff' }}>{initials(team?.team_name)}</span>
              )}
              <div>
                <p className="admin-kicker">Team Workspace</p>
                <h2>{team?.team_name || 'Loading team'}</h2>
                <small>Created {formatDate(team?.created_at)}</small>
              </div>
            </div>
            <label className="admin-team-logo-upload">
              <ImagePlus size={17} />
              {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              <input type="file" accept="image/*" onChange={uploadTeamLogo} disabled={uploadingLogo || !team?.id} />
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <form className="admin-inline-form" onSubmit={assignTrainer}>
            <AdminField label="Assign Trainer">
              <AdminSelect
                value={selectedTrainer}
                onChange={(event) => setSelectedTrainer(event.target.value)}
              >
                <option value="" disabled hidden>Select trainer</option>
                {availableTrainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                ))}
                {!availableTrainers.length && <option value="" disabled>No connected trainers</option>}
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

          <div className="admin-roster-list">
            {players.map((player) => (
              <div className="admin-roster-item" key={player.player_id}>
                <span className="admin-player">
                  <b>{initials(player.name)}</b>
                  <span>
                    <strong>{player.name}</strong>
                    <small>{player.email}</small>
                  </span>
                </span>
                <span>
                  <small>Position</small>
                  <strong>{player.position || '-'}</strong>
                </span>
                <span>
                  <small>Jersey</small>
                  <strong>{player.jersey_number || '-'}</strong>
                </span>
                <span>
                  <small>Joined</small>
                  <strong>{formatDate(player.joined_at)}</strong>
                </span>
                <AdminButton variant="danger" onClick={() => openRemovePlayer(player)} aria-label="Delete player">
                  <Trash2 size={15} />
                </AdminButton>
              </div>
            ))}
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
                <AdminButton variant="danger" onClick={() => openRemoveTrainer(trainer)}>
                  <Trash2 size={15} />
                </AdminButton>
              </div>
            ))}
            {!assignedTrainers.length && <EmptyState>No trainers assigned yet.</EmptyState>}
          </div>
        </AdminCard>
      </div>

      <AdminModal
        open={playerModal}
        title="Add Player"
        subtitle="Create a player account for this team."
        className="admin-password-modal admin-team-modal"
        onClose={() => {
          if (!addingPlayer) setPlayerModal(false)
        }}
      >
        <form className="admin-form admin-form-grid" onSubmit={addPlayer}>
          <div className="admin-password-tip admin-form-span">
            <Info size={18} />
            <p>Enter the player's details and Gmail address. NetMind will send a temporary password automatically.</p>
          </div>
          <AdminField label="Full Name" className="admin-form-span">
            <AdminInput
              required
              value={playerForm.name}
              onChange={(event) => setPlayerForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Player name"
            />
          </AdminField>
          <AdminField label="Email" className="admin-form-span">
            <AdminInput
              required
              type="email"
              value={playerForm.email}
              onChange={(event) => setPlayerForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="player@example.com"
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
          <div className="admin-password-warning admin-form-span">
            <TriangleAlert size={17} />
            <p>Ask the player to check their inbox or spam folder, then change the temporary password after signing in.</p>
          </div>
          <div className="admin-profile-offcanvas-actions admin-form-span">
            <AdminButton type="button" variant="ghost" onClick={() => setPlayerModal(false)} disabled={addingPlayer}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={addingPlayer}>{addingPlayer ? 'Adding...' : 'Add Player'}</AdminButton>
          </div>
        </form>
      </AdminModal>

      {addingPlayer && (
        <div className="admin-sync-backdrop" role="presentation">
          <section className="admin-sync-modal" role="status" aria-live="polite">
            <div className="admin-sync-spinner" />
            <h2>Adding Player</h2>
            <p>Creating the account, sending the temporary password through Gmail, and adding the player to this team.</p>
          </section>
        </div>
      )}

      {uploadingLogo && (
        <div className="admin-sync-backdrop" role="presentation">
          <section className="admin-sync-modal" role="status" aria-live="polite">
            <div className="admin-sync-spinner" />
            <h2>Uploading Team Logo</h2>
            <p>Uploading to Google Drive and saving the team logo.</p>
          </section>
        </div>
      )}

      <AdminModal
        open={deletePlayerModal}
        title="Delete Player"
        subtitle="Confirm before deleting this player account."
        className="admin-password-modal admin-team-modal"
        onClose={() => {
          if (!removingPlayer) setDeletePlayerModal(false)
        }}
      >
        {deletePlayer && (
          <form className="admin-form" onSubmit={removePlayer}>
            <div className="admin-password-warning">
              <TriangleAlert size={17} />
              <p>This will permanently delete {deletePlayer.name}'s player account and remove their team, training, attendance, injury, and performance records.</p>
            </div>

            <div className="admin-delete-summary">
              <span className="admin-player">
                <b>{initials(deletePlayer.name)}</b>
                <span>
                  <strong>{deletePlayer.name}</strong>
                  <small>{deletePlayer.email}</small>
                </span>
              </span>
            </div>

            <div className="admin-password-tip">
              <Info size={18} />
              <p>Tip: only delete the player when their account and records are no longer needed.</p>
            </div>

            <div className="admin-profile-offcanvas-actions">
              <AdminButton type="button" variant="ghost" onClick={() => setDeletePlayerModal(false)} disabled={removingPlayer}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" variant="danger" disabled={removingPlayer}>
                {removingPlayer ? 'Deleting...' : 'Delete Player'}
              </AdminButton>
            </div>
          </form>
        )}
      </AdminModal>

      <AdminModal
        open={deleteTrainerModal}
        title="Remove Trainer"
        subtitle={`Confirm before unassigning this trainer from ${team?.team_name || 'the team'}.`}
        className="admin-password-modal admin-team-modal"
        onClose={() => {
          if (!removingTrainer) setDeleteTrainerModal(false)
        }}
      >
        {deleteTrainer && (
          <form className="admin-form" onSubmit={removeTrainer}>
            <div className="admin-password-warning">
              <TriangleAlert size={17} />
              <p>This removes {deleteTrainer.name} from {team?.team_name || 'this team'}, but keeps their trainer account active.</p>
            </div>

            <div className="admin-delete-summary">
              <span className="admin-player">
                <b>{initials(deleteTrainer.name)}</b>
                <span>
                  <strong>{deleteTrainer.name}</strong>
                  <small>{deleteTrainer.email}</small>
                </span>
              </span>
            </div>

            <div className="admin-password-tip">
              <Info size={18} />
              <p>Tip: the trainer can be assigned again later from this team or the Teams page.</p>
            </div>

            <div className="admin-profile-offcanvas-actions">
              <AdminButton type="button" variant="ghost" onClick={() => setDeleteTrainerModal(false)} disabled={removingTrainer}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" variant="danger" disabled={removingTrainer}>
                {removingTrainer ? 'Removing...' : 'Remove Trainer'}
              </AdminButton>
            </div>
          </form>
        )}
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminTeamDetails
