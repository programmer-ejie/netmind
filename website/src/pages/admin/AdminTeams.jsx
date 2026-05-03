import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
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
import { apiRequest, createResource, deleteResource, listResource, updateResource } from '../../lib/api'

const blankTeam = { team_name: '', team_color: '#635bff', coach_id: '', trainer_id: '' }

const AdminTeams = ({ currentPath = '#admin/teams' }) => {
  const [teams, setTeams] = useState([])
  const [coaches, setCoaches] = useState([])
  const [trainers, setTrainers] = useState([])
  const [form, setForm] = useState(blankTeam)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')

  const availableOwners = useMemo(() => {
    const trainerOnlyRows = trainers.filter((trainer) => (
      !coaches.some((coach) => String(coach.id) === String(trainer.id))
    ))

    return [...coaches, ...trainerOnlyRows]
  }, [coaches, trainers])

  const load = async () => {
    const [teamRows, coachRows, trainerRows] = await Promise.all([
      listResource('teams', { limit: 100, sortDir: 'asc' }),
      listResource('coaches'),
      listResource('trainers'),
    ])
    setTeams(teamRows)
    setCoaches(coachRows)
    setTrainers(trainerRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...blankTeam,
      coach_id: coaches[0]?.id || trainers[0]?.id || '',
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

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      if (editing) {
        await updateResource('teams', editing.id, {
          team_name: form.team_name,
          team_color: form.team_color,
          coach_id: form.coach_id || editing.coach_id,
        })
      } else {
        const coachId = form.coach_id || form.trainer_id || availableOwners[0]?.id || 1
        const createdTeam = await createResource('teams', {
          team_name: form.team_name,
          team_color: form.team_color,
          coach_id: coachId,
        })

        if (form.trainer_id) {
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

  const removeTeam = async (team) => {
    if (!window.confirm(`Delete ${team.team_name}?`)) return

    try {
      await deleteResource('teams', team.id)
      await load()
    } catch (err) {
      setError(err.message)
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

        <div className="admin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Coach</th>
                <th>Color</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className="admin-click-row"
                  onClick={() => {
                    window.location.hash = `admin/teams/${team.id}`
                  }}
                >
                  <td>
                    <span className="admin-player">
                      <b style={{ background: team.team_color || undefined, color: '#fff' }}>
                        {team.team_name?.slice(0, 2).toUpperCase() || 'TM'}
                      </b>
                      <span>
                        <strong>{team.team_name}</strong>
                        <small>ID #{team.id}</small>
                      </span>
                    </span>
                  </td>
                  <td>{getName(availableOwners, team.coach_id)}</td>
                  <td>
                    <span className="admin-color-pill">
                      <i style={{ background: team.team_color || '#635bff' }} />
                      {team.team_color || '-'}
                    </span>
                  </td>
                  <td>{formatDate(team.created_at)}</td>
                  <td>
                    <div className="admin-actions" onClick={(event) => event.stopPropagation()}>
                      <AdminButton variant="secondary" onClick={() => openEdit(team)} aria-label="Edit team">
                        <Edit3 size={15} />
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => removeTeam(team)} aria-label="Delete team">
                        <Trash2 size={15} />
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!teams.length && <EmptyState>No teams created yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminModal
        open={modalOpen}
        title={editing ? 'Edit Team' : 'Create Team'}
        onClose={() => setModalOpen(false)}
      >
        <form className="admin-form" onSubmit={submit}>
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

          <AdminField label="Team Coach">
            <AdminSelect
              required
              value={form.coach_id}
              onChange={(event) => setForm((current) => ({ ...current, coach_id: event.target.value }))}
            >
              <option value="">Select coach or owner</option>
              {coaches.map((coach) => (
                <option key={`coach-${coach.id}`} value={coach.id}>{coach.name}</option>
              ))}
              {!coaches.length && trainers.map((trainer) => (
                <option key={`trainer-owner-${trainer.id}`} value={trainer.id}>{trainer.name} (trainer)</option>
              ))}
            </AdminSelect>
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

          {!coaches.length && !trainers.length && (
            <StatusBadge tone="warning">No coach or trainer record found. The owner id defaults to 1.</StatusBadge>
          )}

          {!coaches.length && trainers.length > 0 && (
            <StatusBadge tone="warning">No coach record found. Choose a trainer as the team owner.</StatusBadge>
          )}

          <div className="admin-form-actions">
            <AdminButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit">{editing ? 'Save Team' : 'Create Team'}</AdminButton>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminTeams
