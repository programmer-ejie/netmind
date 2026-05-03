import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Cake,
  CalendarDays,
  Camera,
  Clock3,
  Pencil,
  Mail,
  MapPin,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
} from 'lucide-react'
import fallbackProfilePhoto from '../../assets/crpt_image.jpg'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  EmptyState,
  StatCard,
  formatDate,
  initials,
} from './AdminLayout'
import { API_BASE, apiRequest, listResource, readSavedUser, saveUser, updateResource } from '../../lib/api'

const toDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10)
}

const formatProfileDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const profileRows = (profile) => [
  { label: 'Name', value: profile?.name || '-', icon: UserRound, className: '' },
  { label: 'Gmail', value: profile?.email || '-', icon: Mail, className: '' },
  { label: 'Role', value: profile?.role || 'coach', icon: ShieldCheck, className: '' },
  { label: 'Age', value: profile?.age || '-', icon: Cake, className: '' },
  { label: 'Location', value: profile?.location || '-', icon: MapPin, className: 'wide' },
  { label: 'Birthdate', value: formatProfileDate(profile?.birthdate), icon: CalendarDays, className: '' },
  { label: 'Joined', value: formatProfileDate(profile?.created_at), icon: Clock3, className: '' },
]

const getProfileImageUrl = (profile, previewUrl) => {
  if (previewUrl) return previewUrl
  if (profile?.profile_picture_file_id) return `${API_BASE}/profile-pictures/${profile.profile_picture_file_id}`
  return profile?.profile_picture_url || fallbackProfilePhoto
}

const AdminProfile = ({ currentPath = '#admin/profile' }) => {
  const savedUser = useMemo(() => readSavedUser(), [])
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(savedUser || null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [state, setState] = useState({
    profile: savedUser || null,
    teams: [],
    players: [],
    trainers: [],
    assignments: [],
    loading: true,
    error: '',
  })

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [coaches, teams, players, trainers, assignments] = await Promise.all([
          listResource('coaches'),
          listResource('teams', { limit: 100 }),
          listResource('players'),
          listResource('trainers'),
          listResource('training-assignments', { limit: 100 }),
        ])

        if (alive) {
          const freshProfile = coaches.find((coach) => String(coach.id) === String(savedUser?.id))
            || coaches.find((coach) => coach.email === savedUser?.email)
            || coaches[0]

          if (freshProfile) saveUser(freshProfile)

          setState({
            profile: freshProfile || savedUser || null,
            teams,
            players,
            trainers,
            assignments,
            loading: false,
            error: '',
          })
        }
      } catch (error) {
        if (alive) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message,
          }))
        }
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [savedUser])

  const profile = state.profile
  const activeTeam = state.teams.find((team) => String(team.coach_id) === String(profile?.id)) || state.teams[0]
  const completedAssignments = state.assignments.filter((item) => item.status === 'completed').length
  const profileImage = getProfileImageUrl(profile, previewUrl)

  useEffect(() => {
    if (profile) {
      setForm({
        ...profile,
        birthdate: toDateInput(profile.birthdate),
      })
    }
  }, [profile])

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    if (!uploading) return undefined

    const warnBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [uploading])

  const refreshProfile = (updated, options = {}) => {
    saveUser(updated)
    setState((current) => ({ ...current, profile: updated }))
    setForm({ ...updated, birthdate: toDateInput(updated.birthdate) })
    if (!options.keepPreview) setPreviewUrl('')
  }

  const saveProfileDetails = async (event) => {
    event.preventDefault()
    if (!form?.id) return

    try {
      setSaving(true)
      setMessage('')
      setState((current) => ({ ...current, error: '' }))
      const updated = await updateResource('users', form.id, {
        name: form.name,
        email: form.email,
        role: form.role || 'coach',
        age: form.age || null,
        birthdate: form.birthdate || null,
        location: form.location || null,
        is_active: form.is_active ?? true,
      })
      refreshProfile(updated)
      setMessage('Profile details saved.')
      setEditOpen(false)
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }))
    } finally {
      setSaving(false)
    }
  }

  const selectProfilePicture = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMessage('')
    await uploadProfilePicture(file)
  }

  const uploadProfilePicture = async (file = selectedFile) => {
    if (!file || !profile?.id) return

    try {
      setUploading(true)
      setMessage('')
      setState((current) => ({ ...current, error: '' }))
      const body = new FormData()
      body.append('profile_picture', file)
      const payload = await apiRequest(`/users/${profile.id}/profile-picture`, {
        method: 'POST',
        body,
      })
      refreshProfile(payload.user, { keepPreview: true })
      setSelectedFile(null)
      setMessage('Profile picture updated.')
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }))
    } finally {
      setUploading(false)
    }
  }

  return (
    <AdminLayout title="Profile" currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}
      {message && <div className="admin-alert success">{message}</div>}

      {uploading && (
        <div className="admin-sync-backdrop" role="presentation">
          <section className="admin-sync-modal" role="status" aria-live="polite">
            <div className="admin-sync-spinner" />
            <h2>Syncing Profile Picture</h2>
            <p>Uploading to Google Drive and saving the new profile record.</p>
          </section>
        </div>
      )}

      <div className="admin-profile-hero">
        <AdminCard className="admin-profile-card admin-profile-modern-card">
          <div className="admin-profile-photo-panel">
            <img
              src={profileImage}
              alt={`${profile?.name || 'NetMind'} profile`}
              onError={(event) => {
                if (event.currentTarget.src !== fallbackProfilePhoto) {
                  event.currentTarget.src = fallbackProfilePhoto
                }
              }}
            />
            <label className="admin-profile-photo-action" title="Choose profile picture">
              <Camera size={18} />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={selectProfilePicture} />
            </label>
          </div>
          <div className="admin-profile-intro">
            <div>
              <p className="admin-kicker">{profile?.role || 'coach'}</p>
              <h2>{profile?.name || 'NetMind Admin'}</h2>
              <span className="admin-profile-email">
                <Mail size={16} />
                {profile?.email || 'No Gmail linked'}
              </span>
            </div>
            <div className="admin-profile-actions">
              <span className={`admin-badge ${profile?.is_active === false ? 'warning' : 'success'}`}>
                {profile?.is_active === false ? 'Inactive' : 'Active'}
              </span>
              <AdminButton
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </AdminButton>
            </div>
          </div>
        </AdminCard>

        <div className="admin-stat-grid compact">
          <StatCard icon={ShieldCheck} label="Teams" value={state.teams.length} tone="primary" />
          <StatCard icon={Users} label="Players" value={state.players.length} tone="secondary" />
          <StatCard icon={Activity} label="Completed" value={completedAssignments} tone="success" />
        </div>
      </div>

      <div className="admin-profile-grid">
        <AdminCard className="admin-profile-details-card">
          <div className="admin-card-header">
            <div>
              <h2>Profile Details</h2>
              <p className="admin-muted">Name, Gmail, role, age, birthdate, location, and joined date.</p>
            </div>
            <AdminButton type="button" variant="secondary" onClick={() => setEditOpen(true)} disabled={!profile}>
              <Pencil size={16} />
              Edit Profile
            </AdminButton>
          </div>

          {profile ? (
            <dl className="admin-profile-info-grid">
              {profileRows(profile).map(({ label, value, icon: Icon, className }) => (
                <div className={className} key={label}>
                  <span>
                    <Icon size={17} />
                  </span>
                  <div>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState>Create or login to a coach account first.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-profile-team-card">
          <div className="admin-card-header">
            <div>
              <h2>Team Snapshot</h2>
              <p className="admin-muted">Profile-linked team context.</p>
            </div>
          </div>

          {activeTeam ? (
            <div className="admin-profile-team">
              <span className="admin-avatar large">{initials(activeTeam.team_name)}</span>
              <div>
                <h3>{activeTeam.team_name}</h3>
                <p className="admin-muted">
                  <CalendarDays size={15} />
                  Created {formatDate(activeTeam.created_at)}
                </p>
                <span className="admin-color-pill">
                  <i style={{ background: activeTeam.team_color || '#635bff' }} />
                  {activeTeam.team_color || 'Default color'}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState>No team linked yet.</EmptyState>
          )}
        </AdminCard>
      </div>

      {editOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setEditOpen(false)}>
          <section
            className="admin-modal admin-profile-offcanvas"
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h2>Edit Profile</h2>
                <p className="admin-muted">Update the account details shown in your profile.</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setEditOpen(false)} aria-label="Close edit profile">
                x
              </button>
            </div>

            {form ? (
              <form className="admin-form" onSubmit={saveProfileDetails}>
                <AdminField label="Name">
                  <AdminInput required value={form.name || ''} onChange={(event) => updateForm('name', event.target.value)} />
                </AdminField>
                <AdminField label="Gmail">
                  <AdminInput disabled required type="email" value={form.email || ''} />
                </AdminField>
                <div className="admin-form-grid two">
                  <AdminField label="Age">
                    <AdminInput type="number" min="1" max="120" value={form.age || ''} onChange={(event) => updateForm('age', event.target.value)} />
                  </AdminField>
                  <AdminField label="Birthdate">
                    <AdminInput type="date" value={form.birthdate || ''} onChange={(event) => updateForm('birthdate', event.target.value)} />
                  </AdminField>
                </div>
                <AdminField label="Location">
                  <AdminInput value={form.location || ''} onChange={(event) => updateForm('location', event.target.value)} />
                </AdminField>
                <div className="admin-profile-offcanvas-actions">
                  <AdminButton type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</AdminButton>
                  <AdminButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</AdminButton>
                </div>
              </form>
            ) : (
              <EmptyState>Create or login to a coach account first.</EmptyState>
            )}
          </section>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminProfile
