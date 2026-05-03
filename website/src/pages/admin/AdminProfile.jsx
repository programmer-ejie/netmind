import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, Mail, ShieldCheck, Users } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  EmptyState,
  StatCard,
  formatDate,
  initials,
} from './AdminLayout'
import { listResource, readSavedUser } from '../../lib/api'

const AdminProfile = ({ currentPath = '#admin/profile' }) => {
  const savedUser = useMemo(() => readSavedUser(), [])
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
          setState({
            profile: savedUser || coaches[0] || null,
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

  return (
    <AdminLayout title="Profile" currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}

      <div className="admin-profile-hero">
        <AdminCard className="admin-profile-card">
          <span className="admin-avatar large">{initials(profile?.name)}</span>
          <div>
            <p className="admin-kicker">{profile?.role || 'coach'}</p>
            <h2>{profile?.name || 'NetMind Admin'}</h2>
            <span className="admin-profile-email">
              <Mail size={16} />
              {profile?.email || 'No email linked'}
            </span>
          </div>
          <span className={`admin-badge ${profile?.is_active === false ? 'warning' : 'success'}`}>
            {profile?.is_active === false ? 'Inactive' : 'Active'}
          </span>
        </AdminCard>

        <div className="admin-stat-grid compact">
          <StatCard icon={ShieldCheck} label="Teams" value={state.teams.length} tone="primary" />
          <StatCard icon={Users} label="Players" value={state.players.length} tone="secondary" />
          <StatCard icon={Activity} label="Completed" value={completedAssignments} tone="success" />
        </div>
      </div>

      <div className="admin-two-column">
        <AdminCard>
          <div className="admin-card-header">
            <div>
              <h2>Account Details</h2>
              <p className="admin-muted">Current signed-in profile information.</p>
            </div>
          </div>

          {profile ? (
            <dl className="admin-detail-list">
              <div>
                <dt>Name</dt>
                <dd>{profile.name || '-'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{profile.email || '-'}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{profile.role || 'coach'}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{formatDate(profile.created_at)}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState>Create or login to a coach account first.</EmptyState>
          )}
        </AdminCard>

        <AdminCard>
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
    </AdminLayout>
  )
}

export default AdminProfile
