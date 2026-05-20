import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Edit3, ExternalLink, Info, Plus, Trash2, X } from 'lucide-react'
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
  drillCategories,
  drillDifficulties,
  formatDate,
  getName,
} from './AdminLayout'
import { apiRequest, createResource, deleteResource, listResource, readSavedUser, updateResource } from '../../lib/api'

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
}
const TRAINING_ROWS_PER_PAGE = 4
const TRAINING_TAB_STORAGE_KEY = 'netmind:training-active-tab'
const trainingTabs = new Set(['drills', 'assignments'])

const getDisplayUrl = (url) => {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const getSavedTrainingTab = () => {
  const saved = window.localStorage.getItem(TRAINING_TAB_STORAGE_KEY)
  return trainingTabs.has(saved) ? saved : 'drills'
}

const formatStatusLabel = (status = 'pending') => status
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

const getAssignmentStatusTone = (status = 'pending') => {
  if (status === 'completed') return 'success'
  if (status === 'overdue') return 'error'
  if (status === 'cancelled') return 'secondary'
  if (status === 'in_progress') return 'warning'
  return 'secondary'
}

const AdminTraining = ({ currentPath = '#coach/training' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const [drills, setDrills] = useState([])
  const [assignments, setAssignments] = useState([])
  const [players, setPlayers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [drillModal, setDrillModal] = useState(false)
  const [assignModal, setAssignModal] = useState(false)
  const [activeView, setActiveView] = useState(getSavedTrainingTab)
  const [editingDrill, setEditingDrill] = useState(null)
  const [deleteDrill, setDeleteDrill] = useState(null)
  const [deletingDrill, setDeletingDrill] = useState(false)
  const [drillForm, setDrillForm] = useState(blankDrill)
  const [assignmentForm, setAssignmentForm] = useState(blankAssignment)
  const [error, setError] = useState('')
  const [drillsPage, setDrillsPage] = useState(1)
  const [assignmentsPage, setAssignmentsPage] = useState(1)

  const assignedBy = currentUser?.id || coaches[0]?.id || 1
  const drillMap = useMemo(() => new Map(drills.map((drill) => [String(drill.id), drill])), [drills])
  const assignmentSummary = useMemo(() => ({
    total: assignments.length,
    pending: assignments.filter((assignment) => (assignment.status || 'pending') === 'pending').length,
    completed: assignments.filter((assignment) => assignment.status === 'completed').length,
  }), [assignments])
  const totalDrillPages = Math.max(1, Math.ceil(drills.length / TRAINING_ROWS_PER_PAGE))
  const totalAssignmentPages = Math.max(1, Math.ceil(assignments.length / TRAINING_ROWS_PER_PAGE))
  const visibleDrills = useMemo(() => {
    const start = (drillsPage - 1) * TRAINING_ROWS_PER_PAGE
    return drills.slice(start, start + TRAINING_ROWS_PER_PAGE)
  }, [drills, drillsPage])
  const visibleAssignments = useMemo(() => {
    const start = (assignmentsPage - 1) * TRAINING_ROWS_PER_PAGE
    return assignments.slice(start, start + TRAINING_ROWS_PER_PAGE)
  }, [assignments, assignmentsPage])

  const load = useCallback(async () => {
    const [drillRows, assignmentRows, playerRows, coachRows, memberRows, trainerLinkRows] = await Promise.all([
      listResource('drills', { limit: 100 }),
      listResource('training-assignments', { limit: 100 }),
      listResource('players'),
      listResource('coaches'),
      isTrainerView ? listResource('team-members', { limit: 100 }) : Promise.resolve([]),
      isTrainerView ? listResource('team-trainers', { limit: 100 }) : Promise.resolve([]),
    ])

    const visibleDrills = isTrainerView
      ? drillRows.filter((drill) => String(drill.created_by) === String(currentUser?.id))
      : drillRows
    const visibleDrillIds = new Set(visibleDrills.map((drill) => String(drill.id)))

    setDrills(visibleDrills)
    setCoaches(coachRows)

    if (isTrainerView) {
      const trainerTeamIds = new Set(
        trainerLinkRows
          .filter((link) => String(link.trainer_id) === String(currentUser?.id))
          .map((link) => String(link.team_id)),
      )
      const playerIds = new Set(
        memberRows
          .filter((membership) => trainerTeamIds.has(String(membership.team_id)))
          .map((membership) => String(membership.player_id)),
      )

      setPlayers(playerRows.filter((player) => playerIds.has(String(player.id))))
      setAssignments(assignmentRows.filter((assignment) => (
        playerIds.has(String(assignment.player_id))
        && String(assignment.assigned_by) === String(currentUser?.id)
        && visibleDrillIds.has(String(assignment.drill_id))
      )))
      return
    }

    setAssignments(assignmentRows)
    setPlayers(playerRows)
  }, [currentUser?.id, isTrainerView])

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [load])

  useEffect(() => {
    window.localStorage.setItem(TRAINING_TAB_STORAGE_KEY, activeView)
  }, [activeView])

  useEffect(() => {
    setDrillsPage((current) => Math.min(Math.max(current, 1), totalDrillPages))
  }, [totalDrillPages])

  useEffect(() => {
    setAssignmentsPage((current) => Math.min(Math.max(current, 1), totalAssignmentPages))
  }, [totalAssignmentPages])

  const openCreateDrill = () => {
    setEditingDrill(null)
    setDrillForm(blankDrill)
    setDrillModal(true)
  }

  const openAssignTraining = () => {
    setAssignmentForm(blankAssignment)
    setAssignModal(true)
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
      created_by: assignedBy,
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

  const openDeleteDrill = (drill) => {
    setDeleteDrill(drill)
  }

  const closeDeleteDrill = () => {
    if (deletingDrill) return
    setDeleteDrill(null)
  }

  const removeDrill = async () => {
    if (!deleteDrill) return

    try {
      setDeletingDrill(true)
      await deleteResource('drills', deleteDrill.id)
      setDeleteDrill(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingDrill(false)
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
          assigned_by: assignedBy,
          focus_area: assignmentForm.focus_area || drill?.category,
          drill_description: drill?.description,
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

  return (
    <AdminLayout title={isTrainerView ? 'Training Hub' : 'Training'} currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard className="admin-training-card">
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
              <AdminButton className="admin-confirm-button" onClick={openAssignTraining}>
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
                  <th>Tutorial</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDrills.map((drill) => (
                  <tr key={drill.id}>
                    <td>
                      <strong>{drill.drill_name}</strong>
                    </td>
                    <td>{drill.category}</td>
                    <td><StatusBadge tone="secondary">{drill.difficulty}</StatusBadge></td>
                    <td>{drill.duration_minutes || 30} min</td>
                    <td>
                      {drill.video_url ? (
                        <a
                          className="admin-tutorial-link"
                          href={getDisplayUrl(drill.video_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={15} />
                          YouTube tutorial
                        </a>
                      ) : (
                        <span className="admin-table-muted">No tutorial</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <AdminButton variant="secondary" onClick={() => openEditDrill(drill)} aria-label="Edit drill">
                          <Edit3 size={15} />
                        </AdminButton>
                        <AdminButton variant="danger" onClick={() => openDeleteDrill(drill)} aria-label="Delete drill">
                          <Trash2 size={15} />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!drills.length && (
              <EmptyState>
                <div className="admin-empty-action">
                  <span>No drills created yet.</span>
                  <AdminButton onClick={openCreateDrill}>
                    <Plus size={17} />
                    Add Drill
                  </AdminButton>
                </div>
              </EmptyState>
            )}
            <div className="admin-pagination" aria-label="Drills pagination">
              <button
                type="button"
                className="admin-pagination-button"
                aria-label="Previous drills page"
                disabled={drillsPage <= 1}
                onClick={() => setDrillsPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={17} />
              </button>
              <span>Page {drillsPage} of {totalDrillPages}</span>
              <button
                type="button"
                className="admin-pagination-button"
                aria-label="Next drills page"
                disabled={drillsPage >= totalDrillPages}
                onClick={() => setDrillsPage((current) => Math.min(totalDrillPages, current + 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        ) : (
          <div className="admin-assignment-panel">
            <div className="admin-assignment-summary" aria-label="Training assignment summary">
              <span>
                <small>Total</small>
                <strong>{assignmentSummary.total}</strong>
              </span>
              <span>
                <small>Pending</small>
                <strong>{assignmentSummary.pending}</strong>
              </span>
              <span>
                <small>Completed</small>
                <strong>{assignmentSummary.completed}</strong>
              </span>
            </div>

            <div className="admin-table admin-assignments-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Training Plan</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <strong>{getName(players, assignment.player_id)}</strong>
                    </td>
                    <td>
                      <strong>{drillMap.get(String(assignment.drill_id))?.drill_name || assignment.focus_area}</strong>
                    </td>
                    <td>{formatDate(assignment.due_date)}</td>
                    <td>
                      <StatusBadge tone={getAssignmentStatusTone(assignment.status)}>
                        {formatStatusLabel(assignment.status)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!assignments.length && (
              <EmptyState>
                <div className="admin-empty-action">
                  <span>No training assignments yet.</span>
                  <AdminButton className="admin-confirm-button" onClick={openAssignTraining}>
                    <Plus size={17} />
                    Assign Training
                  </AdminButton>
                </div>
              </EmptyState>
            )}
            <div className="admin-pagination" aria-label="Training assignments pagination">
              <button
                type="button"
                className="admin-pagination-button"
                aria-label="Previous assignments page"
                disabled={assignmentsPage <= 1}
                onClick={() => setAssignmentsPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={17} />
              </button>
              <span>Page {assignmentsPage} of {totalAssignmentPages}</span>
              <button
                type="button"
                className="admin-pagination-button"
                aria-label="Next assignments page"
                disabled={assignmentsPage >= totalAssignmentPages}
                onClick={() => setAssignmentsPage((current) => Math.min(totalAssignmentPages, current + 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            </div>
          </div>
        )}
      </AdminCard>

      <AdminModal
        open={drillModal}
        title={editingDrill ? 'Edit Drill' : 'Add Drill'}
        onClose={() => setDrillModal(false)}
      >
        <form className="admin-form admin-form-grid" onSubmit={saveDrill}>
          <div className="admin-password-tip admin-form-span">
            <Info size={18} />
            <p>Keep the drill name short, then use description and instructions for the coaching details.</p>
          </div>

          <AdminField label="Drill Name">
            <AdminInput
              required
              placeholder="e.g. Cross-court spike reps"
              value={drillForm.drill_name}
              onChange={(event) => setDrillForm((current) => ({ ...current, drill_name: event.target.value }))}
            />
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
            <AdminInput
              type="number"
              placeholder="e.g. 30"
              value={drillForm.duration_minutes}
              onChange={(event) => setDrillForm((current) => ({ ...current, duration_minutes: event.target.value }))}
            />
          </AdminField>
          <AdminField label="Target Metric">
            <AdminInput
              placeholder="e.g. Successful attacks"
              value={drillForm.target_metric}
              onChange={(event) => setDrillForm((current) => ({ ...current, target_metric: event.target.value }))}
            />
          </AdminField>
          <AdminField label="Ideal Score">
            <AdminInput
              type="number"
              placeholder="e.g. 85"
              value={drillForm.ideal_score}
              onChange={(event) => setDrillForm((current) => ({ ...current, ideal_score: event.target.value }))}
            />
          </AdminField>
          <AdminField label="Description" className="admin-form-span">
            <AdminTextarea
              placeholder="What skill this drill improves and when to use it."
              value={drillForm.description}
              onChange={(event) => setDrillForm((current) => ({ ...current, description: event.target.value }))}
            />
          </AdminField>
          <AdminField label="Instructions" className="admin-form-span">
            <AdminTextarea
              placeholder="List setup, reps, scoring, and coaching cues."
              value={drillForm.instructions}
              onChange={(event) => setDrillForm((current) => ({ ...current, instructions: event.target.value }))}
            />
          </AdminField>
          <AdminField label="Video URL" className="admin-form-span">
            <AdminInput
              placeholder="e.g. https://youtube.com/watch?v=..."
              value={drillForm.video_url}
              onChange={(event) => setDrillForm((current) => ({ ...current, video_url: event.target.value }))}
            />
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

      <AdminModal
        open={assignModal}
        title="Assign Training"
        onClose={() => setAssignModal(false)}
      >
        <form className="admin-form admin-form-grid" onSubmit={assignTraining}>
          <div className="admin-password-tip admin-form-span">
            <Info size={18} />
            <p>Choose a player and drill, then add simple targets the player can track.</p>
          </div>

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
            <AdminInput
              placeholder="e.g. Serve receive consistency"
              value={assignmentForm.focus_area}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, focus_area: event.target.value }))}
            />
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setAssignModal(false)}>Cancel</AdminButton>
            <AdminButton type="submit" className="admin-confirm-button">Assign Training</AdminButton>
          </div>
        </form>
      </AdminModal>

      {deleteDrill && (
        <div className="admin-offcanvas-backdrop" role="presentation" onMouseDown={closeDeleteDrill}>
          <aside
            className="admin-offcanvas admin-delete-drill-offcanvas"
            aria-label="Delete drill"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-offcanvas-header">
              <div>
                <p className="admin-kicker">Delete Drill</p>
                <h2>Delete</h2>
                <small>This action cannot be undone.</small>
              </div>
              <button
                type="button"
                className="admin-modal-close admin-danger-close"
                onClick={closeDeleteDrill}
                aria-label="Close delete drill"
                disabled={deletingDrill}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-password-warning admin-delete-warning-tip">
              <AlertTriangle size={18} />
              <p>Deleting this drill removes it from the drill library. Keep it if players still need it for training assignments.</p>
            </div>

            <div className="admin-delete-summary">
              <span className="admin-player">
                <b>{deleteDrill.drill_name?.slice(0, 2).toUpperCase() || 'DR'}</b>
                <span>
                  <strong>{deleteDrill.drill_name}</strong>
                  <small>{deleteDrill.category || 'training'} - {deleteDrill.difficulty || 'drill'} - {deleteDrill.duration_minutes || 30} min</small>
                </span>
              </span>
            </div>

            <div className="admin-delete-drill-details">
              <span>
                <small>Target metric</small>
                <strong>{deleteDrill.target_metric || 'General skill'}</strong>
              </span>
              <span>
                <small>Visibility</small>
                <strong>{deleteDrill.is_public ? 'Public' : 'Private'}</strong>
              </span>
            </div>

            <div className="admin-profile-offcanvas-actions">
              <AdminButton type="button" variant="ghost" onClick={closeDeleteDrill} disabled={deletingDrill}>
                Cancel
              </AdminButton>
              <AdminButton type="button" className="admin-confirm-button" onClick={removeDrill} disabled={deletingDrill}>
                <Trash2 size={16} />
                {deletingDrill ? 'Deleting...' : 'Delete Drill'}
              </AdminButton>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminTraining
