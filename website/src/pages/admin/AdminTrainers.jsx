import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit3, Info, Plus, TriangleAlert, Trash2 } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  EmptyState,
  StatusBadge,
  TableSkeletonRows,
  formatDate,
  initials,
} from './AdminLayout'
import { API_BASE, apiRequest, deleteResource, listResource, readSavedUser, registerTrainerWithTemporaryPassword, updateResource } from '../../lib/api'

const blankTrainer = { name: '', email: '' }

const trainerPhotoUrl = (trainer) => {
  if (trainer.profile_picture_file_id) return `${API_BASE}/profile-pictures/${trainer.profile_picture_file_id}`
  return trainer.profile_picture_url || ''
}

const TrainerAvatar = ({ trainer }) => {
  const photoUrl = trainerPhotoUrl(trainer)

  if (!photoUrl) return <b>{initials(trainer.name)}</b>

  return (
    <b className="admin-player-photo">
      <img src={photoUrl} alt="" aria-hidden="true" />
    </b>
  )
}

const AdminTrainers = ({ currentPath = '#coach/trainers' }) => {
  const currentUser = readSavedUser()
  const [trainers, setTrainers] = useState([])
  const [teams, setTeams] = useState([])
  const [links, setLinks] = useState([])
  const [createModal, setCreateModal] = useState(false)
  const [creatingTrainer, setCreatingTrainer] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [savingTrainer, setSavingTrainer] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletingTrainer, setDeletingTrainer] = useState(false)
  const [createForm, setCreateForm] = useState(blankTrainer)
  const [editForm, setEditForm] = useState(null)
  const [deleteTrainer, setDeleteTrainer] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const teamsByTrainer = useMemo(() => {
    const map = new Map()
    links.forEach((link) => {
      const key = String(link.trainer_id)
      map.set(key, [...(map.get(key) || []), link.team_id])
    })
    return map
  }, [links])

  const load = useCallback(async () => {
    setLoading(true)
    const teamParams = {
      limit: 100,
      ...(currentUser?.role === 'coach' && currentUser?.id ? { coach_id: currentUser.id } : {}),
    }
    const [trainerRows, teamRows, linkRows, coachLinkRows] = await Promise.all([
      listResource('trainers'),
      listResource('teams', teamParams),
      listResource('team-trainers', { limit: 100 }),
      currentUser?.id ? listResource('coach-trainers', { coach_id: currentUser.id, limit: 100 }) : Promise.resolve([]),
    ])
    const scopedTeamIds = new Set(teamRows.map((team) => String(team.id)))
    const scopedLinks = linkRows.filter((link) => scopedTeamIds.has(String(link.team_id)))
    const scopedTrainerIds = new Set(scopedLinks.map((link) => String(link.trainer_id)))
    coachLinkRows.forEach((link) => scopedTrainerIds.add(String(link.trainer_id)))

    setTrainers(trainerRows.filter((trainer) => scopedTrainerIds.has(String(trainer.id))))
    setTeams(teamRows)
    setLinks(scopedLinks)
    setLoading(false)
  }, [currentUser?.id, currentUser?.role])

  useEffect(() => {
    load().catch((err) => {
      setError(err.message)
      setLoading(false)
    })
  }, [load])

  const createTrainer = async (event) => {
    event.preventDefault()

    try {
      setError('')
      setCreatingTrainer(true)
      let trainer = await registerTrainerWithTemporaryPassword({
        ...createForm,
        coach_id: currentUser?.id || null,
      })

      if (currentUser?.id && trainer?.id) {
        await apiRequest(`/coaches/${currentUser.id}/trainers`, {
          method: 'POST',
          body: { trainer_id: trainer.id },
        })
      }

      setCreateForm(blankTrainer)
      setCreateModal(false)
      await load()
    } catch (err) {
      if (err.message !== 'Email is already registered' || !currentUser?.id) {
        setError(err.message)
        return
      }

      try {
        const existingTrainers = await listResource('trainers')
        const trainer = existingTrainers.find((item) => (
          item.email?.toLowerCase() === createForm.email.trim().toLowerCase()
        ))

        if (!trainer) {
          setError('Email is already registered, but it is not a trainer account.')
          return
        }

        await apiRequest(`/coaches/${currentUser.id}/trainers`, {
          method: 'POST',
          body: { trainer_id: trainer.id },
        })
        setCreateForm(blankTrainer)
        setCreateModal(false)
        await load()
      } catch (linkError) {
        setError(linkError.message)
      }
    } finally {
      setCreatingTrainer(false)
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
      setError('')
      setSavingTrainer(true)
      await updateResource('users', editForm.id, {
        name: editForm.name,
        is_active: Boolean(editForm.is_active),
      })
      setEditModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingTrainer(false)
    }
  }

  const openDelete = (trainer) => {
    setDeleteTrainer(trainer)
    setDeleteModal(true)
  }

  const removeTrainer = async (event) => {
    event.preventDefault()
    if (!deleteTrainer) return

    try {
      setError('')
      setDeletingTrainer(true)
      await deleteResource('trainers', deleteTrainer.id)
      setDeleteModal(false)
      setDeleteTrainer(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingTrainer(false)
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
              {loading ? (
                <TableSkeletonRows rows={4} columns={5} />
              ) : trainers.map((trainer) => {
                const trainerTeams = teamsByTrainer.get(String(trainer.id)) || []

                return (
                  <tr key={trainer.id}>
                    <td>
                      <span className="admin-player">
                        <TrainerAvatar trainer={trainer} />
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
                        <AdminButton variant="secondary" onClick={() => openEdit(trainer)} aria-label="Edit trainer">
                          <Edit3 size={15} />
                        </AdminButton>
                        <AdminButton variant="danger" onClick={() => openDelete(trainer)} aria-label="Delete trainer">
                          <Trash2 size={15} />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && !trainers.length && <EmptyState>No trainer accounts yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminModal
        open={createModal}
        title="Create Trainer"
        subtitle="Create a trainer account for your team."
        className="admin-password-modal admin-create-trainer-modal"
        onClose={() => {
          if (!creatingTrainer) setCreateModal(false)
        }}
      >
        <form className="admin-form" onSubmit={createTrainer}>
          <div className="admin-password-tip">
            <Info size={18} />
            <p>Enter the trainer's name and Gmail address. NetMind will send a temporary password automatically.</p>
          </div>
          <AdminField label="Full Name">
            <AdminInput required value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
          </AdminField>
          <AdminField label="Email">
            <AdminInput required type="email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} />
          </AdminField>
          <div className="admin-password-warning">
            <TriangleAlert size={17} />
            <p>Ask the trainer to check their inbox or spam folder, then change the temporary password after signing in.</p>
          </div>
          <div className="admin-profile-offcanvas-actions">
            <AdminButton type="button" variant="ghost" onClick={() => setCreateModal(false)} disabled={creatingTrainer}>Cancel</AdminButton>
            <AdminButton type="submit" disabled={creatingTrainer}>{creatingTrainer ? 'Creating...' : 'Create Trainer'}</AdminButton>
          </div>
        </form>
      </AdminModal>

      {creatingTrainer && (
        <div className="admin-sync-backdrop" role="presentation">
          <section className="admin-sync-modal" role="status" aria-live="polite">
            <div className="admin-sync-spinner" />
            <h2>Creating Trainer</h2>
            <p>Creating the account and sending the temporary password through Gmail.</p>
          </section>
        </div>
      )}

      <AdminModal
        open={editModal}
        title="Edit Trainer"
        subtitle="Update trainer details and account status."
        className="admin-password-modal admin-create-trainer-modal"
        onClose={() => {
          if (!savingTrainer) setEditModal(false)
        }}
      >
        {editForm && (
          <form className="admin-form" onSubmit={saveTrainer}>
            <div className="admin-password-tip">
              <Info size={18} />
              <p>Email is used for login and temporary password delivery, so it cannot be edited here.</p>
            </div>
            <AdminField label="Full Name">
              <AdminInput required value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
            </AdminField>
            <AdminField label="Email">
              <AdminInput required type="email" value={editForm.email} disabled readOnly />
            </AdminField>
            <label className="admin-check-field">
              <input
                type="checkbox"
                checked={Boolean(editForm.is_active)}
                onChange={(event) => setEditForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Active account
            </label>
            <div className="admin-profile-offcanvas-actions">
              <AdminButton type="button" variant="ghost" onClick={() => setEditModal(false)} disabled={savingTrainer}>Cancel</AdminButton>
              <AdminButton type="submit" disabled={savingTrainer}>Save Trainer</AdminButton>
            </div>
          </form>
        )}
      </AdminModal>

      {savingTrainer && (
        <div className="admin-sync-backdrop" role="presentation">
          <section className="admin-sync-modal" role="status" aria-live="polite">
            <div className="admin-sync-spinner" />
            <h2>Saving Trainer</h2>
            <p>Updating trainer details and refreshing the trainer list.</p>
          </section>
        </div>
      )}

      <AdminModal
        open={deleteModal}
        title="Delete Trainer"
        subtitle="Confirm before removing this trainer account."
        className="admin-password-modal admin-create-trainer-modal admin-delete-trainer-modal"
        onClose={() => {
          if (!deletingTrainer) setDeleteModal(false)
        }}
      >
        {deleteTrainer && (
          <form className="admin-form" onSubmit={removeTrainer}>
            <div className="admin-password-warning">
              <TriangleAlert size={17} />
              <p>This will delete {deleteTrainer.name}'s trainer account and remove their access to NetMind.</p>
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
              <p>Tip: deactivate the account instead if you only want to pause this trainer's access temporarily.</p>
            </div>
            <div className="admin-profile-offcanvas-actions">
              <AdminButton
                type="button"
                variant="ghost"
                onClick={() => setDeleteModal(false)}
                disabled={deletingTrainer}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" className="admin-confirm-button" disabled={deletingTrainer}>
                Confirm
              </AdminButton>
            </div>
          </form>
        )}
      </AdminModal>

      {deletingTrainer && (
        <div className="admin-sync-backdrop" role="presentation">
          <section className="admin-sync-modal" role="status" aria-live="polite">
            <div className="admin-sync-spinner" />
            <h2>Deleting Trainer</h2>
            <p>Removing the trainer account and refreshing the trainer list.</p>
          </section>
        </div>
      )}

    </AdminLayout>
  )
}

export default AdminTrainers
