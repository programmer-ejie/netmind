import { useEffect, useMemo, useState } from 'react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  EmptyState,
  initials,
} from './AdminLayout'
import { apiRequest, listResource, readSavedUser, saveUser, updateResource } from '../../lib/api'

const AdminSettings = ({ currentPath = '#admin/settings' }) => {
  const savedUser = useMemo(() => readSavedUser(), [])
  const [coaches, setCoaches] = useState([])
  const [profile, setProfile] = useState(savedUser || null)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const coachRows = await listResource('coaches')
      setCoaches(coachRows)
      setProfile((current) => current || coachRows[0] || null)
    }

    load().catch((err) => setError(err.message))
  }, [])

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!profile?.id) return

    try {
      const updated = await updateResource('users', profile.id, {
        name: profile.name,
        email: profile.email,
        role: profile.role || 'coach',
        is_active: profile.is_active ?? true,
      })
      saveUser(updated)
      setProfile(updated)
      setMessage('Profile settings saved.')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!profile?.id) {
      setError('Choose a profile before changing the password.')
      return
    }

    if (passwordForm.next.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (passwordForm.next !== passwordForm.confirm) {
      setError('New password and confirm password do not match.')
      return
    }

    try {
      await apiRequest(`/users/${profile.id}/password`, {
        method: 'PATCH',
        body: {
          current_password: passwordForm.current,
          new_password: passwordForm.next,
        },
      })
      setMessage('Password changed.')
      setPasswordForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminLayout title="Settings" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}
      {message && <div className="admin-alert success">{message}</div>}

      <div className="admin-two-column">
        <AdminCard>
          <div className="admin-card-header">
            <div>
              <h2>Profile Settings</h2>
              <p className="admin-muted">Update the coach profile used by NetMind.</p>
            </div>
            <span className="admin-avatar large">{initials(profile?.name)}</span>
          </div>

          {profile ? (
            <form className="admin-form" onSubmit={saveProfile}>
              <AdminField label="Name">
                <AdminInput
                  required
                  value={profile.name || ''}
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                />
              </AdminField>
              <AdminField label="Email">
                <AdminInput
                  required
                  type="email"
                  value={profile.email || ''}
                  onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                />
              </AdminField>
              <div className="admin-form-actions">
                <AdminButton type="submit">Save Profile</AdminButton>
              </div>
            </form>
          ) : (
            <EmptyState>Create or login to a coach account first.</EmptyState>
          )}
        </AdminCard>

        <AdminCard>
          <div className="admin-card-header">
            <div>
              <h2>Change Password</h2>
              <p className="admin-muted">Validate current and new credentials.</p>
            </div>
          </div>

          <form className="admin-form" onSubmit={changePassword}>
            <AdminField label="Current Password">
              <AdminInput
                required
                type="password"
                value={passwordForm.current}
                onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))}
              />
            </AdminField>
            <AdminField label="New Password">
              <AdminInput
                required
                type="password"
                minLength="6"
                value={passwordForm.next}
                onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))}
              />
            </AdminField>
            <AdminField label="Confirm Password">
              <AdminInput
                required
                type="password"
                minLength="6"
                value={passwordForm.confirm}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))}
              />
            </AdminField>
            <div className="admin-form-actions">
              <AdminButton type="submit">Change Password</AdminButton>
            </div>
          </form>
        </AdminCard>
      </div>

      {coaches.length > 1 && (
        <p className="admin-muted admin-settings-note">
          Showing the saved coach profile first, otherwise the first coach account from the API.
        </p>
      )}
    </AdminLayout>
  )
}

export default AdminSettings
