import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  EmptyState,
  StatusBadge,
  formatDate,
  getName,
} from './AdminLayout'
import { createResource, deleteResource, listResource, updateResource } from '../../lib/api'

const blankTeam = { team_name: '', team_color: '#635bff' }

const AdminTeams = ({ currentPath = '#admin/teams' }) => {
  const [teams, setTeams] = useState([])
  const [coaches, setCoaches] = useState([])
  const [form, setForm] = useState(blankTeam)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')

  const primaryCoachId = useMemo(() => coaches[0]?.id || 1, [coaches])

  const load = async () => {
    const [teamRows, coachRows] = await Promise.all([
      listResource('teams', { limit: 100, sortDir: 'asc' }),
      listResource('coaches'),
    ])
    setTeams(teamRows)
    setCoaches(coachRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(blankTeam)
    setModalOpen(true)
  }

  const openEdit = (team) => {
    setEditing(team)
    setForm({
      team_name: team.team_name || '',
      team_color: team.team_color || '#635bff',
    })
    setModalOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      if (editing) {
        await updateResource('teams', editing.id, form)
      } else {
        await createResource('teams', { ...form, coach_id: primaryCoachId })
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
                  <td>{getName(coaches, team.coach_id)}</td>
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

          {!coaches.length && (
            <StatusBadge tone="warning">No coach record found. The first coach id defaults to 1.</StatusBadge>
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
