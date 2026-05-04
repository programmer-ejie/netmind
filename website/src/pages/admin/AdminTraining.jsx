import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  AdminSelect,
  AdminTextarea,
  EmptyState,
  StatusBadge,
  assignmentStatuses,
  drillCategories,
  drillDifficulties,
  formatDate,
  getName,
} from './AdminLayout'
import { apiRequest, createResource, deleteResource, listResource, updateResource } from '../../lib/api'

const blankDrill = {
  drill_name: '',
  category: 'spiking',
  difficulty: 'beginner',
  description: '',
  instructions: '',
  duration_minutes: 30,
  target_metric: '',
  ideal_score: '',
  video_url: '',
  is_public: true,
}

const blankAssignment = {
  player_id: '',
  drill_id: '',
  due_date: '',
  focus_area: '',
  target_reps: '',
  target_success_rate: '',
}

const AdminTraining = ({ currentPath = '#coach/training' }) => {
  const [drills, setDrills] = useState([])
  const [assignments, setAssignments] = useState([])
  const [players, setPlayers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [drillModal, setDrillModal] = useState(false)
  const [assignModal, setAssignModal] = useState(false)
  const [activeView, setActiveView] = useState('drills')
  const [editingDrill, setEditingDrill] = useState(null)
  const [drillForm, setDrillForm] = useState(blankDrill)
  const [assignmentForm, setAssignmentForm] = useState(blankAssignment)
  const [error, setError] = useState('')

  const coachId = coaches[0]?.id || 1
  const drillMap = useMemo(() => new Map(drills.map((drill) => [String(drill.id), drill])), [drills])

  const load = async () => {
    const [drillRows, assignmentRows, playerRows, coachRows] = await Promise.all([
      listResource('drills', { limit: 100 }),
      listResource('training-assignments', { limit: 100 }),
      listResource('players'),
      listResource('coaches'),
    ])

    setDrills(drillRows)
    setAssignments(assignmentRows)
    setPlayers(playerRows)
    setCoaches(coachRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const openCreateDrill = () => {
    setEditingDrill(null)
    setDrillForm(blankDrill)
    setDrillModal(true)
  }

  const openEditDrill = (drill) => {
    setEditingDrill(drill)
    setDrillForm({
      drill_name: drill.drill_name || '',
      category: drill.category || 'spiking',
      difficulty: drill.difficulty || 'beginner',
      description: drill.description || '',
      instructions: drill.instructions || '',
      duration_minutes: drill.duration_minutes || 30,
      target_metric: drill.target_metric || '',
      ideal_score: drill.ideal_score || '',
      video_url: drill.video_url || '',
      is_public: drill.is_public ?? true,
    })
    setDrillModal(true)
  }

  const saveDrill = async (event) => {
    event.preventDefault()

    const payload = {
      ...drillForm,
      duration_minutes: Number(drillForm.duration_minutes) || 30,
      ideal_score: drillForm.ideal_score ? Number(drillForm.ideal_score) : null,
      created_by: coachId,
      is_public: Boolean(drillForm.is_public),
    }

    try {
      if (editingDrill) await updateResource('drills', editingDrill.id, payload)
      else await createResource('drills', payload)
      setDrillModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeDrill = async (drill) => {
    if (!window.confirm(`Delete ${drill.drill_name}?`)) return

    try {
      await deleteResource('drills', drill.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const assignTraining = async (event) => {
    event.preventDefault()
    const drill = drillMap.get(String(assignmentForm.drill_id))

    try {
      await apiRequest(`/drills/${assignmentForm.drill_id}/assign`, {
        method: 'POST',
        body: {
          player_id: assignmentForm.player_id,
          assigned_by: coachId,
          focus_area: assignmentForm.focus_area || drill?.category,
          drill_description: drill?.description,
          target_reps: assignmentForm.target_reps ? Number(assignmentForm.target_reps) : null,
          target_success_rate: assignmentForm.target_success_rate ? Number(assignmentForm.target_success_rate) : null,
          due_date: assignmentForm.due_date || null,
        },
      })
      setAssignmentForm(blankAssignment)
      setAssignModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const updateStatus = async (assignmentId, status) => {
    try {
      await apiRequest(`/training-assignments/${assignmentId}/status`, {
        method: 'PATCH',
        body: { status },
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminLayout title="Training" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>{activeView === 'drills' ? 'Drills Library' : 'Training Assignments'}</h2>
            <p className="admin-muted">
              {activeView === 'drills'
                ? 'Manage reusable training drills.'
                : 'Assign drills and update player training status.'}
            </p>
          </div>
          <div className="admin-card-actions">
            <div className="admin-segmented" role="tablist" aria-label="Training view">
              <button
                type="button"
                className={activeView === 'drills' ? 'active' : ''}
                onClick={() => setActiveView('drills')}
              >
                Drills
              </button>
              <button
                type="button"
                className={activeView === 'assignments' ? 'active' : ''}
                onClick={() => setActiveView('assignments')}
              >
                Assignments
              </button>
            </div>
            {activeView === 'drills' ? (
              <AdminButton onClick={openCreateDrill}>
                <Plus size={17} />
                Add Drill
              </AdminButton>
            ) : (
              <AdminButton onClick={() => setAssignModal(true)}>
                <Plus size={17} />
                Assign Training
              </AdminButton>
            )}
          </div>
        </div>

        {activeView === 'drills' ? (
          <div className="admin-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Drill</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drills.map((drill) => (
                  <tr key={drill.id}>
                    <td>
                      <strong>{drill.drill_name}</strong>
                      <small className="admin-block-muted">{drill.target_metric || 'General skill'}</small>
                    </td>
                    <td>{drill.category}</td>
                    <td><StatusBadge tone="secondary">{drill.difficulty}</StatusBadge></td>
                    <td>{drill.duration_minutes || 30} min</td>
                    <td>
                      <div className="admin-actions">
                        <AdminButton variant="secondary" onClick={() => openEditDrill(drill)} aria-label="Edit drill">
                          <Edit3 size={15} />
                        </AdminButton>
                        <AdminButton variant="danger" onClick={() => removeDrill(drill)} aria-label="Delete drill">
                          <Trash2 size={15} />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!drills.length && <EmptyState>No drills created yet.</EmptyState>}
          </div>
        ) : (
          <div className="admin-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Drill</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{getName(players, assignment.player_id)}</td>
                    <td>{drillMap.get(String(assignment.drill_id))?.drill_name || assignment.focus_area}</td>
                    <td>{formatDate(assignment.due_date)}</td>
                    <td>
                      <AdminSelect
                        value={assignment.status || 'pending'}
                        onChange={(event) => updateStatus(assignment.id, event.target.value)}
                      >
                        {assignmentStatuses.map((status) => <option key={status}>{status}</option>)}
                      </AdminSelect>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!assignments.length && <EmptyState>No training assignments yet.</EmptyState>}
          </div>
        )}
      </AdminCard>

      <AdminModal open={drillModal} title={editingDrill ? 'Edit Drill' : 'Add Drill'} onClose={() => setDrillModal(false)}>
        <form className="admin-form admin-form-grid" onSubmit={saveDrill}>
          <AdminField label="Drill Name">
            <AdminInput required value={drillForm.drill_name} onChange={(event) => setDrillForm((current) => ({ ...current, drill_name: event.target.value }))} />
          </AdminField>
          <AdminField label="Category">
            <AdminSelect value={drillForm.category} onChange={(event) => setDrillForm((current) => ({ ...current, category: event.target.value }))}>
              {drillCategories.map((category) => <option key={category}>{category}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Difficulty">
            <AdminSelect value={drillForm.difficulty} onChange={(event) => setDrillForm((current) => ({ ...current, difficulty: event.target.value }))}>
              {drillDifficulties.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Duration Minutes">
            <AdminInput type="number" value={drillForm.duration_minutes} onChange={(event) => setDrillForm((current) => ({ ...current, duration_minutes: event.target.value }))} />
          </AdminField>
          <AdminField label="Target Metric">
            <AdminInput value={drillForm.target_metric} onChange={(event) => setDrillForm((current) => ({ ...current, target_metric: event.target.value }))} />
          </AdminField>
          <AdminField label="Ideal Score">
            <AdminInput type="number" value={drillForm.ideal_score} onChange={(event) => setDrillForm((current) => ({ ...current, ideal_score: event.target.value }))} />
          </AdminField>
          <AdminField label="Description" className="admin-form-span">
            <AdminTextarea value={drillForm.description} onChange={(event) => setDrillForm((current) => ({ ...current, description: event.target.value }))} />
          </AdminField>
          <AdminField label="Instructions" className="admin-form-span">
            <AdminTextarea value={drillForm.instructions} onChange={(event) => setDrillForm((current) => ({ ...current, instructions: event.target.value }))} />
          </AdminField>
          <AdminField label="Video URL" className="admin-form-span">
            <AdminInput value={drillForm.video_url} onChange={(event) => setDrillForm((current) => ({ ...current, video_url: event.target.value }))} />
          </AdminField>
          <label className="admin-check-field admin-form-span">
            <input
              type="checkbox"
              checked={Boolean(drillForm.is_public)}
              onChange={(event) => setDrillForm((current) => ({ ...current, is_public: event.target.checked }))}
            />
            Public drill
          </label>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setDrillModal(false)}>Cancel</AdminButton>
            <AdminButton type="submit">{editingDrill ? 'Save Drill' : 'Add Drill'}</AdminButton>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={assignModal} title="Assign Training" onClose={() => setAssignModal(false)}>
        <form className="admin-form admin-form-grid" onSubmit={assignTraining}>
          <AdminField label="Player">
            <AdminSelect required value={assignmentForm.player_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, player_id: event.target.value }))}>
              <option value="">Select player</option>
              {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Drill">
            <AdminSelect required value={assignmentForm.drill_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, drill_id: event.target.value }))}>
              <option value="">Select drill</option>
              {drills.map((drill) => <option key={drill.id} value={drill.id}>{drill.drill_name}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Due Date">
            <AdminInput type="date" value={assignmentForm.due_date} onChange={(event) => setAssignmentForm((current) => ({ ...current, due_date: event.target.value }))} />
          </AdminField>
          <AdminField label="Focus Area">
            <AdminInput value={assignmentForm.focus_area} onChange={(event) => setAssignmentForm((current) => ({ ...current, focus_area: event.target.value }))} />
          </AdminField>
          <AdminField label="Target Reps">
            <AdminInput type="number" value={assignmentForm.target_reps} onChange={(event) => setAssignmentForm((current) => ({ ...current, target_reps: event.target.value }))} />
          </AdminField>
          <AdminField label="Target Success Rate">
            <AdminInput type="number" value={assignmentForm.target_success_rate} onChange={(event) => setAssignmentForm((current) => ({ ...current, target_success_rate: event.target.value }))} />
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setAssignModal(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Assign Training</AdminButton>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminTraining
