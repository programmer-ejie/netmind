import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit3, Info, Plus, Trash2, TriangleAlert, UserPlus } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  AdminSelect,
  EmptyState,
  TableSkeletonRows,
  formatDate,
} from './AdminLayout'
import { API_BASE, apiRequest, createResource, deleteResource, listResource, readSavedUser, updateResource } from '../../lib/api'

const blankTeam = { team_name: '', team_color: '#635bff', coach_id: '', trainer_id: '' }
const getTeamLogoSrc = (team) => (
  team?.team_logo_file_id ? `${API_BASE}/team-logos/${team.team_logo_file_id}` : team?.logo_url
)

const AdminTeams = ({ currentPath = '#coach/teams' }) => {
  const [teams, setTeams] = useState([])
  const [coaches, setCoaches] = useState([])
  const [trainers, setTrainers] = useState([])
  const [trainerLinks, setTrainerLinks] = useState([])
  const [form, setForm] = useState(blankTeam)
  const [editing, setEditing] = useState(null)
  const [assigningTeam, setAssigningTeam] = useState(null)
  const [assignedTrainers, setAssignedTrainers] = useState([])
  const [selectedTrainer, setSelectedTrainer] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModal, setAssignModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletingTeam, setDeletingTeam] = useState(false)
  const [deleteTeam, setDeleteTeam] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const currentUser = readSavedUser()

  const availableOwners = useMemo(() => {
    const trainerOnlyRows = trainers.filter((trainer) => (
      !coaches.some((coach) => String(coach.id) === String(trainer.id))
    ))

    return [...coaches, ...trainerOnlyRows]
  }, [coaches, trainers])

  const assigningTeamHasTrainer = assignedTrainers.length > 0
  const assignedTrainerNames = assignedTrainers
    .map((link) => link.name || trainers.find((trainer) => String(trainer.id) === String(link.trainer_id))?.name)
    .filter(Boolean)
  const availableTrainers = assigningTeamHasTrainer ? [] : trainers
  const trainersByTeam = useMemo(() => {
    const map = new Map()

    trainerLinks.forEach((link) => {
      const key = String(link.team_id)
      const trainer = trainers.find((item) => String(item.id) === String(link.trainer_id))
      if (!trainer) return

      map.set(key, [...(map.get(key) || []), trainer.name])
    })

    return map
  }, [trainerLinks, trainers])

  const load = useCallback(async () => {
    setLoading(true)
    const teamParams = {
      limit: 100,
      sortDir: 'asc',
      ...(currentUser?.role === 'coach' && currentUser?.id ? { coach_id: currentUser.id } : {}),
    }
    const [teamRows, coachRows, trainerRows, trainerLinkRows, coachTrainerRows] = await Promise.all([
      listResource('teams', teamParams),
      listResource('coaches'),
      listResource('trainers'),
      listResource('team-trainers', { limit: 100 }),
      currentUser?.id ? listResource('coach-trainers', { coach_id: currentUser.id, limit: 100 }) : Promise.resolve([]),
    ])
    const scopedTeamIds = new Set(teamRows.map((team) => String(team.id)))
    const scopedTrainerIds = new Set(coachTrainerRows.map((link) => String(link.trainer_id)))
    const scopedTrainerLinks = trainerLinkRows.filter((link) => scopedTeamIds.has(String(link.team_id)))

    scopedTrainerLinks.forEach((link) => scopedTrainerIds.add(String(link.trainer_id)))

    setTeams(teamRows)
    setCoaches(coachRows)
    setTrainers(trainerRows.filter((trainer) => scopedTrainerIds.has(String(trainer.id))))
    setTrainerLinks(scopedTrainerLinks)
    setLoading(false)
  }, [currentUser?.id, currentUser?.role])

  useEffect(() => {
    load().catch((err) => {
      setError(err.message)
      setLoading(false)
    })
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...blankTeam,
      coach_id: currentUser?.id || coaches[0]?.id || trainers[0]?.id || '',
    })
    setModalOpen(true)
  }

  const openEdit = (team) => {
    setEditing(team)
    setForm({
      team_name: team.team_name || '',
      team_color: team.team_color || '#635bff',
      coach_id: team.coach_id || '',
      trainer_id: '',
    })
    setModalOpen(true)
  }

  const openAssign = async (team) => {
    setAssigningTeam(team)
    setSelectedTrainer('')
    setAssignedTrainers(trainerLinks.filter((link) => String(link.team_id) === String(team.id)))
    setAssignModal(true)
    setError('')

    try {
      setAssignedTrainers(await apiRequest(`/teams/${team.id}/trainers`))
    } catch (err) {
      setAssignedTrainers([])
      setError(err.message)
    }
  }

  const assignTrainer = async (event) => {
    event.preventDefault()
    if (!assigningTeam || !selectedTrainer || assigningTeamHasTrainer) return

    try {
      setError('')
      await apiRequest(`/teams/${assigningTeam.id}/trainers`, {
        method: 'POST',
        body: {
          trainer_id: selectedTrainer,
          assigned_by: currentUser?.id || assigningTeam.coach_id || availableOwners[0]?.id || 1,
        },
      })
      if (currentUser?.id) {
        await apiRequest(`/coaches/${currentUser.id}/trainers`, {
          method: 'POST',
          body: { trainer_id: selectedTrainer },
        })
      }
      setAssignModal(false)
      setAssigningTeam(null)
      setSelectedTrainer('')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      if (editing) {
        await updateResource('teams', editing.id, {
          team_name: form.team_name,
          team_color: form.team_color,
        })
      } else {
        const coachId = currentUser?.id || form.coach_id || availableOwners[0]?.id || 1
        const createdTeam = await createResource('teams', {
          team_name: form.team_name,
          team_color: form.team_color,
          coach_id: coachId,
        })

        if (form.trainer_id) {
          await apiRequest(`/coaches/${coachId}/trainers`, {
            method: 'POST',
            body: { trainer_id: form.trainer_id },
          })
          await apiRequest(`/teams/${createdTeam.id}/trainers`, {
            method: 'POST',
            body: {
              trainer_id: form.trainer_id,
              assigned_by: coachId,
            },
          })
        }
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const openDelete = (team) => {
    setDeleteTeam(team)
    setDeleteModal(true)
  }

  const removeTeam = async (event) => {
    event.preventDefault()
    if (!deleteTeam) return

    try {
      setError('')
      setDeletingTeam(true)
      await deleteResource('teams', deleteTeam.id)
      setDeleteModal(false)
      setDeleteTeam(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingTeam(false)
    }
  }

  return (
    <AdminLayout title="Teams" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>All Teams</h2>
            <p className="admin-muted">Create and manage volleyball team workspaces.</p>
          </div>
          <AdminButton onClick={openCreate}>
            <Plus size={17} />
            Create Team
          </AdminButton>
        </div>

        <div className="admin-table admin-teams-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Trainer</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows rows={4} columns={4} />
              ) : teams.map((team) => (
                <tr
                  key={team.id}
                  className="admin-click-row admin-team-color-row"
                  style={{ '--team-color': team.team_color || '#635bff' }}
                  onClick={() => {
                    window.location.hash = `coach/teams/${team.id}`
                  }}
                >
                  <td>
                    <span className="admin-player">
                      {getTeamLogoSrc(team) ? (
                        <img className="admin-team-table-logo" src={getTeamLogoSrc(team)} alt={`${team.team_name} logo`} />
                      ) : (
                        <b style={{ background: team.team_color || undefined, color: '#fff' }}>
                          {team.team_name?.slice(0, 2).toUpperCase() || 'TM'}
                        </b>
                      )}
                      <span>
                        <strong>{team.team_name}</strong>
                      </span>
                    </span>
                  </td>
                  <td>{trainersByTeam.get(String(team.id))?.join(', ') || 'Not Assigned'}</td>
                  <td>{formatDate(team.created_at)}</td>
                  <td>
                    <div className="admin-actions" onClick={(event) => event.stopPropagation()}>
                      <AdminButton
                        variant="secondary"
                        onClick={() => openAssign(team)}
                        aria-label="Assign trainer"
                        disabled={trainerLinks.some((link) => String(link.team_id) === String(team.id))}
                        title={trainerLinks.some((link) => String(link.team_id) === String(team.id)) ? 'This team already has a trainer' : 'Assign trainer'}
                      >
                        <UserPlus size={15} />
                      </AdminButton>
                      <AdminButton variant="secondary" onClick={() => openEdit(team)} aria-label="Edit team">
                        <Edit3 size={15} />
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => openDelete(team)} aria-label="Delete team">
                        <Trash2 size={15} />
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !teams.length && <EmptyState>No teams created yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminModal
        open={modalOpen}
        title={editing ? 'Edit Team' : 'Create Team'}
        subtitle={editing ? 'Update team details and ownership.' : 'Create a volleyball team workspace.'}
        className="admin-password-modal admin-team-modal"
        onClose={() => setModalOpen(false)}
      >
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-password-tip">
            <Info size={18} />
            <p>{editing ? 'Keep the team name and color accurate for reports and team dashboards.' : 'Choose a team name, color, and optional trainer assignment before creating the team.'}</p>
          </div>

          <AdminField label="Team Name">
            <AdminInput
              required
              value={form.team_name}
              onChange={(event) => setForm((current) => ({ ...current, team_name: event.target.value }))}
              placeholder="NetMind Spikers"
            />
          </AdminField>

          <AdminField label="Team Color">
            <div className="admin-color-input">
              <input
                type="color"
                value={form.team_color}
                onChange={(event) => setForm((current) => ({ ...current, team_color: event.target.value }))}
                aria-label="Team color"
              />
              <AdminInput
                value={form.team_color}
                onChange={(event) => setForm((current) => ({ ...current, team_color: event.target.value }))}
                placeholder="#635bff"
              />
            </div>
          </AdminField>

          {!editing && (
            <AdminField label="Available Trainer">
              <AdminSelect
                value={form.trainer_id}
                onChange={(event) => setForm((current) => ({ ...current, trainer_id: event.target.value }))}
              >
                <option value="">Assign after creating</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                ))}
              </AdminSelect>
            </AdminField>
          )}

          <div className="admin-password-warning">
            <TriangleAlert size={17} />
            <p>{editing ? 'Changes will affect the team workspace immediately after saving.' : 'Tip: this team will automatically use the logged-in coach as the team coach.'}</p>
          </div>

          <div className="admin-profile-offcanvas-actions">
            <AdminButton type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit">{editing ? 'Save Team' : 'Create Team'}</AdminButton>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={assignModal}
        title="Assign Trainer"
        subtitle={`Choose a trainer for ${assigningTeam?.team_name || 'this team'}.`}
        className="admin-password-modal admin-team-modal"
        onClose={() => setAssignModal(false)}
      >
        {assigningTeam && (
          <form className="admin-form" onSubmit={assignTrainer}>
            <div className="admin-password-tip">
              <Info size={18} />
              <p>
                {assigningTeamHasTrainer
                  ? `${assignedTrainerNames.join(', ') || 'A trainer'} is already assigned to this team. Remove the current trainer from the team details page before assigning another.`
                  : 'Select one trainer to assign to this team workspace.'}
              </p>
            </div>

            <div className="admin-delete-summary">
              <span className="admin-player">
                {getTeamLogoSrc(assigningTeam) ? (
                  <img className="admin-team-table-logo" src={getTeamLogoSrc(assigningTeam)} alt={`${assigningTeam.team_name} logo`} />
                ) : (
                  <b style={{ background: assigningTeam.team_color || '#635bff', color: '#fff' }}>
                    {assigningTeam.team_name?.slice(0, 2).toUpperCase() || 'TM'}
                  </b>
                )}
                <span>
                  <strong>{assigningTeam.team_name}</strong>
                </span>
              </span>
            </div>

            <AdminField label="Available Trainer">
              <AdminSelect
                required
                value={selectedTrainer}
                onChange={(event) => setSelectedTrainer(event.target.value)}
                disabled={assigningTeamHasTrainer || !trainers.length}
              >
                <option value="" disabled hidden>Select trainer</option>
                {availableTrainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                ))}
                {assigningTeamHasTrainer && <option value="" disabled>Trainer already assigned</option>}
                {!assigningTeamHasTrainer && !availableTrainers.length && <option value="" disabled>No connected trainers</option>}
              </AdminSelect>
            </AdminField>

            <div className="admin-password-warning">
              <TriangleAlert size={17} />
              <p>Tip: assigned trainers can be reviewed or removed later from this team's details page.</p>
            </div>

            <div className="admin-profile-offcanvas-actions">
              <AdminButton type="button" variant="ghost" onClick={() => setAssignModal(false)}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={assigningTeamHasTrainer || !selectedTrainer}>Assign Trainer</AdminButton>
            </div>
          </form>
        )}
      </AdminModal>

      <AdminModal
        open={deleteModal}
        title="Delete Team"
        subtitle="Confirm before removing this team workspace."
        className="admin-password-modal admin-team-modal"
        onClose={() => {
          if (!deletingTeam) setDeleteModal(false)
        }}
      >
        {deleteTeam && (
          <form className="admin-form" onSubmit={removeTeam}>
            <div className="admin-password-warning">
              <TriangleAlert size={17} />
              <p>This will delete {deleteTeam.team_name} and remove its team workspace from NetMind.</p>
            </div>

            <div className="admin-delete-summary">
              <span className="admin-player">
                {getTeamLogoSrc(deleteTeam) ? (
                  <img className="admin-team-table-logo" src={getTeamLogoSrc(deleteTeam)} alt={`${deleteTeam.team_name} logo`} />
                ) : (
                  <b style={{ background: deleteTeam.team_color || '#635bff', color: '#fff' }}>
                    {deleteTeam.team_name?.slice(0, 2).toUpperCase() || 'TM'}
                  </b>
                )}
                <span>
                  <strong>{deleteTeam.team_name}</strong>
                </span>
              </span>
            </div>

            <div className="admin-password-tip">
              <Info size={18} />
              <p>Tip: make sure player records, assignments, and reports are no longer needed before deleting this team.</p>
            </div>

            <div className="admin-profile-offcanvas-actions">
              <AdminButton
                type="button"
                variant="ghost"
                onClick={() => setDeleteModal(false)}
                disabled={deletingTeam}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" variant="danger" disabled={deletingTeam}>
                {deletingTeam ? 'Deleting...' : 'Delete Team'}
              </AdminButton>
            </div>
          </form>
        )}
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminTeams
