import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  EmptyState,
  StatusBadge,
  formatDate,
  initials,
} from './AdminLayout'
import { apiRequest, deleteResource, listResource, registerUser, updateResource } from '../../lib/api'

const blankTrainer = { name: '', email: '', password: '' }

const AdminTrainers = ({ currentPath = '#admin/trainers' }) => {
  const [trainers, setTrainers] = useState([])
  const [teams, setTeams] = useState([])
  const [links, setLinks] = useState([])
  const [coaches, setCoaches] = useState([])
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [assignModal, setAssignModal] = useState(false)
  const [createForm, setCreateForm] = useState(blankTrainer)
  const [editForm, setEditForm] = useState(null)
  const [assignTrainer, setAssignTrainer] = useState(null)
  const [selectedTeams, setSelectedTeams] = useState(new Set())
  const [error, setError] = useState('')

  const assignedBy = coaches[0]?.id || 1

  const teamsByTrainer = useMemo(() => {
    const map = new Map()
    links.forEach((link) => {
      const key = String(link.trainer_id)
      map.set(key, [...(map.get(key) || []), link.team_id])
    })
    return map
  }, [links])

  const load = async () => {
    const [trainerRows, teamRows, linkRows, coachRows] = await Promise.all([
      listResource('trainers'),
      listResource('teams', { limit: 100 }),
      listResource('team-trainers', { limit: 100 }),
      listResource('coaches'),
    ])

    setTrainers(trainerRows)
    setTeams(teamRows)
    setLinks(linkRows)
    setCoaches(coachRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const createTrainer = async (event) => {
    event.preventDefault()

    try {
      await registerUser({ ...createForm, role: 'trainer' })
      setCreateForm(blankTrainer)
      setCreateModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const openEdit = (trainer) => {
    setEditForm({
      id: trainer.id,
      name: trainer.name || '',
      email: trainer.email || '',
      is_active: trainer.is_active ?? true,
    })
    setEditModal(true)
  }

  const saveTrainer = async (event) => {
    event.preventDefault()

    try {
      await updateResource('users', editForm.id, {
        name: editForm.name,
        email: editForm.email,
        is_active: Boolean(editForm.is_active),
      })
      setEditModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeTrainer = async (trainer) => {
    if (!window.confirm(`Delete ${trainer.name}?`)) return

    try {
      await deleteResource('users', trainer.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const openAssign = (trainer) => {
    setAssignTrainer(trainer)
    setSelectedTeams(new Set((teamsByTrainer.get(String(trainer.id)) || []).map(String)))
    setAssignModal(true)
  }

  const toggleTeam = (teamId) => {
    setSelectedTeams((current) => {
      const next = new Set(current)
      if (next.has(String(teamId))) next.delete(String(teamId))
      else next.add(String(teamId))
      return next
    })
  }

  const saveAssignments = async (event) => {
    event.preventDefault()

    try {
      const currentLinks = links.filter((link) => String(link.trainer_id) === String(assignTrainer.id))
      const currentTeamIds = new Set(currentLinks.map((link) => String(link.team_id)))

      await Promise.all([
        ...teams
          .filter((team) => selectedTeams.has(String(team.id)) && !currentTeamIds.has(String(team.id)))
          .map((team) => apiRequest(`/teams/${team.id}/trainers`, {
            method: 'POST',
            body: { trainer_id: assignTrainer.id, assigned_by: assignedBy },
          })),
        ...currentLinks
          .filter((link) => !selectedTeams.has(String(link.team_id)))
          .map((link) => apiRequest(`/teams/${link.team_id}/trainers/${assignTrainer.id}`, { method: 'DELETE' })),
      ])

      setAssignModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminLayout title="Trainers" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>All Trainers</h2>
            <p className="admin-muted">Manage trainer accounts and team assignments.</p>
          </div>
          <AdminButton onClick={() => setCreateModal(true)}>
            <Plus size={17} />
            Create Trainer
          </AdminButton>
        </div>

        <div className="admin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Trainer</th>
                <th>Teams</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainers.map((trainer) => {
                const trainerTeams = teamsByTrainer.get(String(trainer.id)) || []

                return (
                  <tr key={trainer.id}>
                    <td>
                      <span className="admin-player">
                        <b>{initials(trainer.name)}</b>
                        <span>
                          <strong>{trainer.name}</strong>
                          <small>{trainer.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>{trainerTeams.map((id) => teams.find((team) => team.id === id)?.team_name).filter(Boolean).join(', ') || '-'}</td>
                    <td>
                      <StatusBadge tone={trainer.is_active ? 'success' : 'warning'}>
                        {trainer.is_active ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </td>
                    <td>{formatDate(trainer.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <AdminButton variant="secondary" onClick={() => openAssign(trainer)} aria-label="Assign trainer">
                          <ShieldCheck size={15} />
                        </AdminButton>
                        <AdminButton variant="secondary" onClick={() => openEdit(trainer)} aria-label="Edit trainer">
                          <Edit3 size={15} />
                        </AdminButton>
                        <AdminButton variant="danger" onClick={() => removeTrainer(trainer)} aria-label="Delete trainer">
                          <Trash2 size={15} />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!trainers.length && <EmptyState>No trainer accounts yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminModal open={createModal} title="Create Trainer" onClose={() => setCreateModal(false)}>
        <form className="admin-form" onSubmit={createTrainer}>
          <AdminField label="Full Name">
            <AdminInput required value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
          </AdminField>
          <AdminField label="Email">
            <AdminInput required type="email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} />
          </AdminField>
          <AdminField label="Password">
            <AdminInput required type="password" minLength="6" value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} />
          </AdminField>
          <div className="admin-form-actions">
            <AdminButton type="button" variant="secondary" onClick={() => setCreateModal(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Create Trainer</AdminButton>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={editModal} title="Edit Trainer" onClose={() => setEditModal(false)}>
        {editForm && (
          <form className="admin-form" onSubmit={saveTrainer}>
            <AdminField label="Full Name">
              <AdminInput required value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
            </AdminField>
            <AdminField label="Email">
              <AdminInput required type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
            </AdminField>
            <label className="admin-check-field">
              <input
                type="checkbox"
                checked={Boolean(editForm.is_active)}
                onChange={(event) => setEditForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Active account
            </label>
            <div className="admin-form-actions">
              <AdminButton type="button" variant="secondary" onClick={() => setEditModal(false)}>Cancel</AdminButton>
              <AdminButton type="submit">Save Trainer</AdminButton>
            </div>
          </form>
        )}
      </AdminModal>

      <AdminModal open={assignModal} title={`Assign ${assignTrainer?.name || 'Trainer'}`} onClose={() => setAssignModal(false)}>
        <form className="admin-form" onSubmit={saveAssignments}>
          <div className="admin-checkbox-list">
            {teams.map((team) => (
              <label className="admin-check-field" key={team.id}>
                <input
                  type="checkbox"
                  checked={selectedTeams.has(String(team.id))}
                  onChange={() => toggleTeam(team.id)}
                />
                <span className="admin-color-pill">
                  <i style={{ background: team.team_color || '#635bff' }} />
                  {team.team_name}
                </span>
              </label>
            ))}
            {!teams.length && <EmptyState>Create a team before assigning trainers.</EmptyState>}
          </div>
          <div className="admin-form-actions">
            <AdminButton type="button" variant="secondary" onClick={() => setAssignModal(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Save Assignments</AdminButton>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminTrainers
