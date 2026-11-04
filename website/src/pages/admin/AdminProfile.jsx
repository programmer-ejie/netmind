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
import fallbackProfilePhoto from '../../assets/default-profilepc.webp'
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
import {
  API_BASE,
  apiRequest,
  getResource,
  listResource,
  readSavedUser,
  saveUser,
  setProfilePreview,
  updateResource,
} from '../../lib/api'
import { parseDateInput, toLocalDateKey } from '../../lib/dateKeys'

const toDateInput = (value) => {
  if (!value) return ''
  return toLocalDateKey(value)
}

const formatProfileDate = (value) => {
  if (!value) return '-'
  const date = parseDateInput(value)

  if (!date) return value

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const profileRows = (profile) => [
  { label: 'Name', value: profile?.name || '-', icon: UserRound, className: '' },
  { label: 'Gmail', value: profile?.email || '-', icon: Mail, className: '' },
  { label: 'Role', value: profile?.role || '-', icon: ShieldCheck, className: '' },
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

const getTeamLogoSrc = (team) => (
  team?.team_logo_file_id ? `${API_BASE}/team-logos/${team.team_logo_file_id}` : team?.logo_url
)

const ProfileSkeleton = () => (
  <>
    <div className="admin-profile-hero">
      <AdminCard className="admin-profile-card admin-profile-modern-card admin-profile-skeleton-card">
        <span className="admin-skeleton-square admin-profile-photo-skeleton" />
        <div className="admin-profile-intro">
          <div className="admin-profile-skeleton-copy">
            <span className="admin-skeleton-line short" />
            <span className="admin-skeleton-line wide" />
            <span className="admin-skeleton-line" />
          </div>
        </div>
      </AdminCard>
      <div className="admin-stat-grid compact">
        {Array.from({ length: 3 }).map((_, index) => (
          <AdminCard className="admin-stat-card admin-stat-card-skeleton" key={`profile-stat-skeleton-${index}`}>
            <span className="admin-skeleton-square" />
            <span className="admin-skeleton-line" />
            <strong className="admin-skeleton-line short" />
          </AdminCard>
        ))}
      </div>
    </div>
    <div className="admin-profile-grid">
      <AdminCard className="admin-profile-details-card">
        <div className="admin-skeleton-list">
          {Array.from({ length: 7 }).map((_, index) => <span key={`profile-detail-skeleton-${index}`} />)}
        </div>
      </AdminCard>
      <AdminCard className="admin-profile-team-card">
        <div className="admin-skeleton-list">
          {Array.from({ length: 4 }).map((_, index) => <span key={`profile-team-skeleton-${index}`} />)}
        </div>
      </AdminCard>
    </div>
  </>
)

const AdminProfile = ({ currentPath = '#coach/profile' }) => {
  const savedUser = useMemo(() => readSavedUser(), [])
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [state, setState] = useState({
    profile: null,
    teams: [],
    players: [],
    trainers: [],
    teamMembers: [],
    teamTrainers: [],
    assignments: [],
    loading: true,
    error: '',
  })

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [freshProfile, teams, players, trainers, teamMembers, teamTrainers, assignments] = await Promise.all([
          savedUser?.id ? getResource('users', savedUser.id).catch(() => savedUser) : Promise.resolve(savedUser),
          listResource('teams', { limit: 100 }),
          listResource('players'),
          listResource('trainers'),
          listResource('team-members', { limit: 100 }),
          listResource('team-trainers', { limit: 100 }),
          listResource('training-assignments', { limit: 100 }),
        ])

        if (alive) {
          if (freshProfile) saveUser(freshProfile)

          setState({
            profile: freshProfile || savedUser || null,
            teams,
            players,
            trainers,
            teamMembers,
            teamTrainers,
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
  const isTrainerProfile = profile?.role === 'trainer'
  const scopedTeamIds = useMemo(() => {
    if (!isTrainerProfile) {
      return new Set(state.teams
        .filter((team) => String(team.coach_id) === String(profile?.id))
        .map((team) => String(team.id)))
    }

    return new Set(state.teamTrainers
      .filter((link) => String(link.trainer_id) === String(profile?.id))
      .map((link) => String(link.team_id)))
  }, [isTrainerProfile, profile?.id, state.teamTrainers, state.teams])
  const scopedTeams = useMemo(() => (
    state.teams.filter((team) => scopedTeamIds.has(String(team.id)))
  ), [scopedTeamIds, state.teams])
  const scopedPlayerIds = useMemo(() => new Set(
    state.teamMembers
      .filter((member) => scopedTeamIds.has(String(member.team_id)))
      .map((member) => String(member.player_id)),
  ), [scopedTeamIds, state.teamMembers])
  const scopedPlayers = useMemo(() => (
    state.players.filter((player) => scopedPlayerIds.has(String(player.id)))
  ), [scopedPlayerIds, state.players])
  const scopedAssignments = useMemo(() => (
    state.assignments.filter((item) => scopedPlayerIds.has(String(item.player_id)))
  ), [scopedPlayerIds, state.assignments])
  const completedAssignments = scopedAssignments.filter((item) => item.status === 'completed').length
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
    if (!uploading && !saving) return undefined

    const warnBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [saving, uploading])

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
        age: form.age || null,
        birthdate: form.birthdate || null,
        location: form.location || null,
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
    setMessage('')
    await uploadProfilePicture(file)
    event.target.value = ''
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
      refreshProfile(payload.user)
      setSelectedFile(null)
      setProfilePreview('')
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

      {saving && (
        <div className="admin-sync-backdrop" role="presentation">
          <section className="admin-sync-modal" role="status" aria-live="polite">
            <div className="admin-sync-spinner" />
            <h2>Saving Profile</h2>
            <p>Updating your profile details and refreshing the account record.</p>
          </section>
        </div>
      )}

      {state.loading ? (
        <ProfileSkeleton />
      ) : (
        <>
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
              <p className="admin-kicker">{profile?.role || savedUser?.role || 'coach'}</p>
              <h2>{profile?.name || 'NetMind User'}</h2>
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
          <StatCard icon={ShieldCheck} label="Teams" value={scopedTeams.length} tone="primary" />
          <StatCard icon={Users} label="Players" value={scopedPlayers.length} tone="secondary" />
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
            <EmptyState>Login to an account first.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-profile-team-card">
          <div className="admin-card-header">
            <div>
              <h2>Team Snapshot</h2>
              <p className="admin-muted">Profile-linked team context.</p>
            </div>
          </div>

          {scopedTeams.length ? (
            <div className="admin-profile-team-list">
              {scopedTeams.map((team) => (
                <div
                  className="admin-profile-team"
                  key={team.id}
                  style={{ '--team-color': team.team_color || '#635bff' }}
                >
                  {getTeamLogoSrc(team) ? (
                    <img className="admin-profile-team-logo" src={getTeamLogoSrc(team)} alt={`${team.team_name} logo`} />
                  ) : (
                    <span className="admin-avatar large">{initials(team.team_name)}</span>
                  )}
                  <div>
                    <h3>{team.team_name}</h3>
                    <p className="admin-muted">
                      <CalendarDays size={15} />
                      Created {formatDate(team.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No team linked yet.</EmptyState>
          )}
        </AdminCard>
      </div>

      {editOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => {
          if (!saving) setEditOpen(false)
        }}>
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
              <button type="button" className="admin-modal-close" onClick={() => setEditOpen(false)} disabled={saving} aria-label="Close edit profile">
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
                  <AdminButton type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</AdminButton>
                  <AdminButton type="submit" disabled={saving}>Save Profile</AdminButton>
                </div>
              </form>
            ) : (
              <EmptyState>Login to an account first.</EmptyState>
            )}
          </section>
        </div>
      )}
        </>
      )}
    </AdminLayout>
  )
}

export default AdminProfile
