import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Edit3, Plus, Trash2 } from 'lucide-react'
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
  initials,
  positions,
} from './AdminLayout'
import { apiRequest, deleteResource, listResource, readSavedUser, registerUser, updateResource } from '../../lib/api'
import { toLocalDateKey } from '../../lib/dateKeys'

const blankCreate = {
  name: '',
  email: '',
  password: '',
  position: 'OH',
  jersey_number: '',
  team_id: '',
}
const PLAYERS_PER_PAGE = 4

const buildActionRadar = (actions = [], logs = []) => {
  const totals = new Map()

  actions.forEach((action) => {
    const label = action.action_type || 'other'
    totals.set(label, (totals.get(label) || 0) + Number(action.total || 0))
  })

  if (!totals.size) {
    logs.forEach((log) => {
      const label = log.action_type || 'other'
      totals.set(label, (totals.get(label) || 0) + 1)
    })
  }

  const preferredOrder = ['spike', 'serve', 'receive', 'dig', 'set', 'block']
  return preferredOrder
    .filter((label) => totals.has(label))
    .map((label) => ({ label, total: totals.get(label) || 0 }))
}

const PerformanceRadar = ({ actions = [], logs = [] }) => {
  const data = buildActionRadar(actions, logs)
  const size = 280
  const center = size / 2
  const radius = 96
  const maxTotal = Math.max(...data.map((item) => item.total), 1)
  const rings = [0.25, 0.5, 0.75, 1]
  const angleFor = (index) => (-90 + (360 / Math.max(data.length, 1)) * index) * (Math.PI / 180)
  const pointFor = (index, scale = 1) => {
    const angle = angleFor(index)
    const distance = radius * scale
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    }
  }
  const polygon = data.map((item, index) => {
    const point = pointFor(index, item.total / maxTotal)
    return `${point.x},${point.y}`
  }).join(' ')

  return (
    <div className="admin-performance-radar">
      <div>
        <span className="admin-kicker">Skill radar</span>
        <strong>{logs.length} recorded actions</strong>
        <small>{data.length ? 'Action volume by volleyball skill' : 'No logs yet'}</small>
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Performance action radar chart">
        {data.length > 2 && rings.map((ring) => (
          <polygon
            className="admin-performance-radar-ring"
            key={ring}
            points={data.map((_, index) => {
              const point = pointFor(index, ring)
              return `${point.x},${point.y}`
            }).join(' ')}
          />
        ))}
        {data.map((item, index) => {
          const axisEnd = pointFor(index, 1)
          const labelPoint = pointFor(index, 1.22)

          return (
            <g key={item.label}>
              <line className="admin-performance-radar-axis" x1={center} y1={center} x2={axisEnd.x} y2={axisEnd.y} />
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle">{item.label}</text>
            </g>
          )
        })}
        {polygon && <polygon className="admin-performance-radar-area" points={polygon} />}
        {data.map((item, index) => {
          const point = pointFor(index, item.total / maxTotal)
          return (
            <g key={`${item.label}-point`}>
              <circle cx={point.x} cy={point.y} r="5" />
              <title>{`${item.label}: ${item.total}`}</title>
            </g>
          )
        })}
      </svg>
      <div className="admin-performance-radar-legend">
        {data.map((item) => (
          <span key={item.label}>
            <b>{item.total}</b>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const AdminPlayers = ({ currentPath = '#coach/players' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const pathParts = currentPath.replace(/^#/, '').split('/')
  const currentBase = pathParts[0] || (isTrainerView ? 'trainer' : 'coach')
  const isStatsPage = pathParts[1] === 'player-stats'
  const statsPlayerId = pathParts[2]
  const pageTitle = isStatsPage ? 'Player Stats' : isTrainerView ? 'My Players' : 'Players'
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [createForm, setCreateForm] = useState(blankCreate)
  const [editForm, setEditForm] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [playersPage, setPlayersPage] = useState(1)

  const teamByPlayer = useMemo(() => {
    const map = new Map()
    memberships.forEach((membership) => map.set(String(membership.player_id), membership.team_id))
    return map
  }, [memberships])
  const totalPlayersPages = Math.max(1, Math.ceil(players.length / PLAYERS_PER_PAGE))
  const visiblePlayers = useMemo(() => {
    const start = (playersPage - 1) * PLAYERS_PER_PAGE
    return players.slice(start, start + PLAYERS_PER_PAGE)
  }, [players, playersPage])

  const load = useCallback(async () => {
    const teamParams = {
      limit: 100,
      ...(currentUser?.role === 'coach' && currentUser?.id ? { coach_id: currentUser.id } : {}),
    }
    const [playerRows, teamRows, memberRows, trainerLinkRows] = await Promise.all([
      listResource('players'),
      listResource('teams', teamParams),
      listResource('team-members', { limit: 100 }),
      isTrainerView ? listResource('team-trainers', { limit: 100 }) : Promise.resolve([]),
    ])

    if (isTrainerView) {
      const trainerTeamIds = new Set(
        trainerLinkRows
          .filter((link) => String(link.trainer_id) === String(currentUser?.id))
          .map((link) => String(link.team_id)),
      )
      const scopedMemberships = memberRows.filter((membership) => trainerTeamIds.has(String(membership.team_id)))
      const scopedPlayerIds = new Set(scopedMemberships.map((membership) => String(membership.player_id)))

      setPlayers(playerRows.filter((player) => scopedPlayerIds.has(String(player.id))))
      setTeams(teamRows.filter((team) => trainerTeamIds.has(String(team.id))))
      setMemberships(scopedMemberships)
      return
    }

    const coachTeamIds = new Set(teamRows.map((team) => String(team.id)))
    const scopedMemberships = memberRows.filter((membership) => coachTeamIds.has(String(membership.team_id)))
    const scopedPlayerIds = new Set(scopedMemberships.map((membership) => String(membership.player_id)))

    setPlayers(playerRows.filter((player) => scopedPlayerIds.has(String(player.id))))
    setTeams(teamRows)
    setMemberships(scopedMemberships)
  }, [currentUser?.id, currentUser?.role, isTrainerView])

  const createPlayer = async (event) => {
    event.preventDefault()

    try {
      const player = await registerUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: 'player',
        position: createForm.position,
        jersey_number: createForm.jersey_number ? Number(createForm.jersey_number) : null,
      })

      if (createForm.team_id) {
        await apiRequest(`/teams/${createForm.team_id}/members`, {
          method: 'POST',
          body: { player_id: player.id, joined_at: toLocalDateKey() },
        })
      }

      setCreateModal(false)
      setCreateForm(blankCreate)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const openEdit = (player) => {
    setEditForm({
      id: player.id,
      name: player.name || '',
      email: player.email || '',
      position: player.position || 'OH',
      jersey_number: player.jersey_number || '',
      is_active: player.is_active ?? true,
    })
    setEditModal(true)
  }

  const savePlayer = async (event) => {
    event.preventDefault()

    try {
      await updateResource('users', editForm.id, {
        name: editForm.name,
        email: editForm.email,
        position: editForm.position,
        jersey_number: editForm.jersey_number ? Number(editForm.jersey_number) : null,
        is_active: Boolean(editForm.is_active),
      })
      setEditModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removePlayer = async (player) => {
    if (!window.confirm(`Delete ${player.name}?`)) return

    try {
      await deleteResource('users', player.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const loadPlayerStats = useCallback(async (playerOrId) => {
    const playerId = typeof playerOrId === 'object' ? playerOrId.id : playerOrId
    const selectedPlayer = typeof playerOrId === 'object' ? playerOrId : null
    setStats({ loading: true, player: selectedPlayer })

    const [summary, logs, assignments, attendance, injuries] = await Promise.all([
      apiRequest(`/players/${playerId}/summary`),
      apiRequest(`/players/${playerId}/performance-logs`),
      apiRequest(`/players/${playerId}/training-assignments`),
      apiRequest(`/players/${playerId}/attendance`),
      apiRequest(`/players/${playerId}/injuries`),
    ])
    setStats({ ...summary, player: summary.player || selectedPlayer, logs, assignments, attendance, injuries, loading: false })
  }, [])

  const openStats = (player) => {
    window.location.hash = `${currentBase}/player-stats/${player.id}`
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))

    if (isStatsPage && statsPlayerId) {
      loadPlayerStats(statsPlayerId).catch((err) => setError(err.message))
    }
  }, [isStatsPage, load, loadPlayerStats, statsPlayerId])

  useEffect(() => {
    setPlayersPage((current) => Math.min(Math.max(current, 1), totalPlayersPages))
  }, [totalPlayersPages])

  const renderStatsContent = () => (
    <>
      {stats?.loading && <EmptyState>Loading stats...</EmptyState>}
      {stats?.error && <div className="admin-alert">{stats.error}</div>}
      {stats && !stats.loading && !stats.error && (
        <div className="admin-stats-modal">
          <div className="admin-player-summary">
            <div className="admin-player-summary-main">
              <span className="admin-player-summary-avatar">{initials(stats.player?.name || stats.player?.email)}</span>
              <div className="admin-player-summary-copy">
                <span className="admin-kicker">Player profile</span>
                <h3>{stats.player?.name || 'Player'}</h3>
                <p>{stats.player?.email || 'No email saved'}</p>
                <div className="admin-player-summary-tags">
                  <StatusBadge tone={stats.player?.is_active ? 'success' : 'warning'}>
                    {stats.player?.is_active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                  <span>{getName(teams, teamByPlayer.get(String(stats.player?.id)))}</span>
                  <span>{stats.player?.position || 'No position'}</span>
                  <span>#{stats.player?.jersey_number || '-'}</span>
                </div>
              </div>
            </div>
            <div className="admin-player-summary-metrics" aria-label="Player stat overview">
              <span>
                <strong>{stats.logs?.length || 0}</strong>
                <small>Logs</small>
              </span>
              <span>
                <strong>{stats.training?.completed || 0}/{stats.training?.total_assignments || 0}</strong>
                <small>Training</small>
              </span>
              <span>
                <strong>{Number(stats.wellness?.avg_rpe || 0).toFixed(1)}</strong>
                <small>Avg RPE</small>
              </span>
            </div>
          </div>

          <div className="admin-stat-grid compact admin-player-stat-grid">
            <AdminCard className="admin-player-stat-card">
              <span className="admin-muted">Assignments</span>
              <strong>{stats.training?.total_assignments || 0}</strong>
            </AdminCard>
            <AdminCard className="admin-player-stat-card">
              <span className="admin-muted">Completed</span>
              <strong>{stats.training?.completed || 0}</strong>
            </AdminCard>
            <AdminCard className="admin-player-stat-card">
              <span className="admin-muted">Avg RPE</span>
              <strong>{Number(stats.wellness?.avg_rpe || 0).toFixed(1)}</strong>
            </AdminCard>
            <AdminCard className="admin-player-stat-card">
              <span className="admin-muted">Attendance</span>
              <strong>{stats.attendance?.length || 0}</strong>
            </AdminCard>
            <AdminCard className="admin-player-stat-card">
              <span className="admin-muted">Drill Success</span>
              <strong>{Number(stats.drills?.avg_success_rate || 0).toFixed(0)}%</strong>
            </AdminCard>
            <AdminCard className="admin-player-stat-card">
              <span className="admin-muted">Active Injuries</span>
              <strong>{stats.active_injuries?.length || 0}</strong>
            </AdminCard>
          </div>

          <div className="admin-player-stats-layout">
            <section className="admin-stats-section admin-stats-panel admin-stats-panel-large">
              <div className="admin-section-title">
                <h3>Performance Logs</h3>
                <span>{stats.logs?.length || 0} total</span>
              </div>
              <PerformanceRadar actions={stats.actions || []} logs={stats.logs || []} />
            </section>

            <div className="admin-player-stats-side">
              <section className="admin-stats-section admin-stats-panel">
                <div className="admin-section-title">
                  <h3>Training Assignments</h3>
                  <span>{stats.assignments?.length || 0} records</span>
                </div>
                <div className="admin-info-list">
                  {(stats.assignments || []).slice(0, 4).map((assignment) => (
                    <article className="admin-info-row" key={assignment.id}>
                      <div>
                        <strong>{assignment.drill_name || assignment.focus_area || 'Training assignment'}</strong>
                        <small>{assignment.focus_area || assignment.drill_description || 'No description'}</small>
                      </div>
                      <StatusBadge tone={assignment.status === 'completed' ? 'success' : assignment.status === 'overdue' ? 'warning' : 'secondary'}>
                        {assignment.status || 'pending'}
                      </StatusBadge>
                    </article>
                  ))}
                  {!stats.assignments?.length && <EmptyState>No training assignments yet.</EmptyState>}
                </div>
              </section>

              <section className="admin-stats-section admin-stats-panel">
                <div className="admin-section-title">
                  <h3>Health and Attendance</h3>
                  <span>Latest records</span>
                </div>
                <div className="admin-info-list">
                  {(stats.attendance || []).slice(0, 2).map((item) => (
                    <article className="admin-info-row" key={`attendance-${item.id}`}>
                      <div>
                        <strong>{item.status || 'Attendance'}</strong>
                        <small>{item.session_type || 'session'} - {formatDate(item.session_date)}</small>
                      </div>
                      <span className="admin-muted">{item.reason || 'Logged'}</span>
                    </article>
                  ))}
                  {(stats.injuries || []).slice(0, 2).map((injury) => (
                    <article className="admin-info-row" key={`injury-${injury.id}`}>
                      <div>
                        <strong>{injury.injury_type || 'Injury log'}</strong>
                        <small>{injury.body_part || 'No body part'} - {formatDate(injury.occurred_at)}</small>
                      </div>
                      <StatusBadge tone={injury.recovered_at ? 'success' : 'warning'}>
                        {injury.recovered_at ? 'Recovered' : 'Active'}
                      </StatusBadge>
                    </article>
                  ))}
                  {!stats.attendance?.length && !stats.injuries?.length && <EmptyState>No health or attendance logs yet.</EmptyState>}
                </div>
              </section>
            </div>
          </div>

          <p className="admin-muted admin-player-last-logged">Last logged: {formatDate(stats.wellness?.last_logged_at)}</p>
        </div>
      )}
    </>
  )

  if (isStatsPage) {
    return (
      <AdminLayout title={pageTitle} currentPath={currentPath}>
        {error && <div className="admin-alert">{error}</div>}
        <AdminCard className="admin-player-stats-page">
          <div className="admin-card-header admin-player-stats-page-header">
            <div className="admin-player-stats-title">
              <button
                type="button"
                className="admin-team-back"
                onClick={() => { window.location.hash = `${currentBase}/players` }}
                aria-label="Back to My Players"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Player Stats</h2>
                <p className="admin-muted">
                  Review {stats?.player?.name ? `${stats.player.name}'s` : "the player's"} database-backed performance, training, attendance, and health records.
                </p>
              </div>
            </div>
          </div>
          {renderStatsContent()}
        </AdminCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={pageTitle} currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>All Players</h2>
            <p className="admin-muted">
              {isTrainerView ? 'Review players assigned to your teams.' : 'Create, edit, delete, and inspect player stats.'}
            </p>
          </div>
          {!isTrainerView && (
            <AdminButton onClick={() => setCreateModal(true)}>
              <Plus size={17} />
              Create Player
            </AdminButton>
          )}
        </div>

        <div className="admin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Position</th>
                <th>Jersey</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player) => (
                <tr key={player.id}>
                  <td>
                    <span className="admin-player">
                      <b>{initials(player.name)}</b>
                      <span>
                        <strong>{player.name}</strong>
                        <small>{player.email}</small>
                      </span>
                    </span>
                  </td>
                  <td>{getName(teams, teamByPlayer.get(String(player.id)))}</td>
                  <td>{player.position || '-'}</td>
                  <td>{player.jersey_number || '-'}</td>
                  <td>
                    <StatusBadge tone={player.is_active ? 'success' : 'warning'}>
                      {player.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <AdminButton variant="secondary" onClick={() => openStats(player)} aria-label="View stats">
                        <BarChart3 size={15} />
                      </AdminButton>
                      {!isTrainerView && (
                        <>
                          <AdminButton variant="secondary" onClick={() => openEdit(player)} aria-label="Edit player">
                            <Edit3 size={15} />
                          </AdminButton>
                          <AdminButton variant="danger" onClick={() => removePlayer(player)} aria-label="Delete player">
                            <Trash2 size={15} />
                          </AdminButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!players.length && <EmptyState>No player accounts yet.</EmptyState>}
          <div className="admin-pagination" aria-label="Players pagination">
            <button
              type="button"
              className="admin-pagination-button"
              aria-label="Previous players page"
              disabled={playersPage <= 1}
              onClick={() => setPlayersPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={17} />
            </button>
            <span>Page {playersPage} of {totalPlayersPages}</span>
            <button
              type="button"
              className="admin-pagination-button"
              aria-label="Next players page"
              disabled={playersPage >= totalPlayersPages}
              onClick={() => setPlayersPage((current) => Math.min(totalPlayersPages, current + 1))}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </AdminCard>

      <AdminModal open={createModal} title="Create Player" onClose={() => setCreateModal(false)}>
        <form className="admin-form admin-form-grid" onSubmit={createPlayer}>
          <AdminField label="Full Name">
            <AdminInput required value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
          </AdminField>
          <AdminField label="Email">
            <AdminInput required type="email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} />
          </AdminField>
          <AdminField label="Password">
            <AdminInput required type="password" minLength="6" value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} />
          </AdminField>
          <AdminField label="Position">
            <AdminSelect value={createForm.position} onChange={(event) => setCreateForm((current) => ({ ...current, position: event.target.value }))}>
              {positions.map((position) => <option key={position}>{position}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Jersey">
            <AdminInput type="number" value={createForm.jersey_number} onChange={(event) => setCreateForm((current) => ({ ...current, jersey_number: event.target.value }))} />
          </AdminField>
          <AdminField label="Team">
            <AdminSelect value={createForm.team_id} onChange={(event) => setCreateForm((current) => ({ ...current, team_id: event.target.value }))}>
              <option value="">No team yet</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
            </AdminSelect>
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setCreateModal(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Create Player</AdminButton>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={editModal} title="Edit Player" onClose={() => setEditModal(false)}>
        {editForm && (
          <form className="admin-form admin-form-grid" onSubmit={savePlayer}>
            <AdminField label="Full Name">
              <AdminInput required value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
            </AdminField>
            <AdminField label="Email">
              <AdminInput required type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
            </AdminField>
            <AdminField label="Position">
              <AdminSelect value={editForm.position} onChange={(event) => setEditForm((current) => ({ ...current, position: event.target.value }))}>
                {positions.map((position) => <option key={position}>{position}</option>)}
              </AdminSelect>
            </AdminField>
            <AdminField label="Jersey">
              <AdminInput type="number" value={editForm.jersey_number} onChange={(event) => setEditForm((current) => ({ ...current, jersey_number: event.target.value }))} />
            </AdminField>
            <label className="admin-check-field admin-form-span">
              <input
                type="checkbox"
                checked={Boolean(editForm.is_active)}
                onChange={(event) => setEditForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Active account
            </label>
            <div className="admin-form-actions admin-form-span">
              <AdminButton type="button" variant="secondary" onClick={() => setEditModal(false)}>Cancel</AdminButton>
              <AdminButton type="submit">Save Player</AdminButton>
            </div>
          </form>
        )}
      </AdminModal>

    </AdminLayout>
  )
}

export default AdminPlayers
