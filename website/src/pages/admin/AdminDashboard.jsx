import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ClipboardCheck, Dumbbell, Lightbulb, Shield, Target, TrendingUp, UserRound, Users } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  AdminSelect,
  EmptyState,
  StatCard,
  StatusBadge,
  initials,
  moneylessNumber,
} from './AdminLayout'
import { listResource, readSavedUser } from '../../lib/api'

const areaColors = ['#12aabd', '#ff6692', '#36c76c', '#ffb900']
const TOP_PLAYERS_LIMIT = 5
const positiveResults = new Set(['kill', 'ace', 'perfect', 'assist', 'stuff', 'good'])
const performanceMetrics = [
  { label: 'Kill', action_type: 'spike', result: 'kill' },
  { label: 'Stuff Block', action_type: 'block', result: 'stuff' },
  { label: 'Ace', action_type: 'serve', result: 'ace' },
  { label: 'Error', action_type: 'spike', result: 'error' },
  { label: 'Dig', action_type: 'dig', result: 'good' },
  { label: 'Assist', action_type: 'set', result: 'assist' },
  { label: 'Perfect Pass', action_type: 'receive', result: 'perfect' },
]

const formatShortDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const percentile = (values, position) => {
  if (!values.length) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const index = (sorted.length - 1) * position
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[index]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

const prettyAction = (value) => String(value || 'overall').replace(/_/g, ' ')

const groupLogTotals = (logs, predicate) => (
  Object.entries(logs.reduce((acc, log) => {
    if (!predicate(log)) return acc
    const key = prettyAction(log.action_type)
    acc[key] = (acc[key] || 0) + (Number(log.value) || 1)
    return acc
  }, {})).sort((a, b) => b[1] - a[1])
)

const ActivityMixChart = ({ labels, actions, total }) => {
  const maxActionValue = Math.max(...actions.map((item) => item.total), 1)
  const maxDateValue = Math.max(...actions.flatMap((item) => item.values), 1)

  return (
    <div className="admin-activity-mix-chart" role="img" aria-label="Performance action mix chart">
      <div className="admin-activity-mix-total">
        <strong>{moneylessNumber(total)}</strong>
        <span>Total inputs</span>
      </div>

      <div className="admin-activity-mix-list">
        {actions.map((item, index) => {
          const percent = total ? Math.round((item.total / total) * 100) : 0
          const width = Math.max(6, (item.total / maxActionValue) * 100)

          return (
            <div className="admin-activity-mix-row" key={item.label} style={{ '--action-color': item.color }}>
              <div className="admin-activity-mix-rank">#{index + 1}</div>
              <div className="admin-activity-mix-main">
                <div className="admin-activity-mix-label">
                  <strong>{item.label}</strong>
                  <span>{moneylessNumber(item.total)} inputs</span>
                </div>
                <div className="admin-activity-mix-bar" aria-hidden="true">
                  <i style={{ width: `${width}%` }} />
                </div>
              </div>
              <b>{percent}%</b>
            </div>
          )
        })}
      </div>

      <div className="admin-activity-heat">
        <div className="admin-activity-heat-head">
          <strong>Recent activity</strong>
          <span>{labels.join(' / ')}</span>
        </div>
        <div className="admin-activity-heat-grid" style={{ '--heat-columns': labels.length }}>
          {actions.map((item) => (
            labels.map((label, labelIndex) => {
              const value = Number(item.values[labelIndex] || 0)
              const opacity = value ? 0.22 + (value / maxDateValue) * 0.68 : 0.08

              return (
                <span
                  key={`${item.label}-${label}`}
                  style={{ '--action-color': item.color, '--heat-opacity': opacity }}
                  title={`${item.label} on ${label}: ${moneylessNumber(value)}`}
                />
              )
            })
          ))}
        </div>
      </div>
    </div>
  )
}

const BoxChart = ({ stats }) => {
  const width = 360
  const height = 190
  const minX = 48
  const maxX = width - 34
  const y = 88
  const maxValue = Math.max(stats.max, 1)
  const xFor = (value) => minX + (Number(value || 0) / maxValue) * (maxX - minX)

  return (
    <div className="admin-box-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Player performance score distribution">
        <line x1={xFor(stats.min)} x2={xFor(stats.max)} y1={y} y2={y} className="admin-box-whisker" />
        <line x1={xFor(stats.min)} x2={xFor(stats.min)} y1={y - 24} y2={y + 24} className="admin-box-whisker" />
        <line x1={xFor(stats.max)} x2={xFor(stats.max)} y1={y - 24} y2={y + 24} className="admin-box-whisker" />
        <rect x={xFor(stats.q1)} y={y - 34} width={Math.max(8, xFor(stats.q3) - xFor(stats.q1))} height="68" rx="8" className="admin-box-range" />
        <line x1={xFor(stats.median)} x2={xFor(stats.median)} y1={y - 38} y2={y + 38} className="admin-box-median" />
        <circle cx={xFor(stats.average)} cy={y} r="6" className="admin-box-average">
          <title>{`Average: ${stats.average.toFixed(1)}`}</title>
        </circle>
        <text x={minX} y="158" textAnchor="middle">Min {stats.min}</text>
        <text x={xFor(stats.median)} y="158" textAnchor="middle">Median {stats.median.toFixed(1)}</text>
        <text x={maxX} y="158" textAnchor="middle">Max {stats.max}</text>
      </svg>
      <div className="admin-box-summary">
        <span><b>{stats.q1.toFixed(1)}</b> Q1</span>
        <span><b>{stats.q3.toFixed(1)}</b> Q3</span>
        <span><b>{stats.average.toFixed(1)}</b> Avg</span>
      </div>
    </div>
  )
}

const TrainingInsights = ({ insights, loading }) => (
  <AdminCard className="admin-dashboard-card admin-training-insights-card">
    <div className="admin-card-header">
      <div>
        <h2>Training Insights</h2>
        <p className="admin-muted">Visible data for analysis, comparison, and training decisions.</p>
      </div>
      <Lightbulb size={22} />
    </div>
    {loading ? (
      <div className="admin-training-insights-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <span className="admin-training-insight-skeleton" key={`training-insight-skeleton-${index}`} />
        ))}
      </div>
    ) : (
      <div className="admin-training-insights-grid">
        {insights.map((insight) => {
          const Icon = insight.icon

          return (
            <article className={`admin-training-insight-card ${insight.tone}`} key={insight.label}>
              <span><Icon size={20} /></span>
              <small>{insight.label}</small>
              <strong>{insight.title}</strong>
              <p>{insight.text}</p>
              <b>{insight.value}</b>
            </article>
          )
        })}
      </div>
    )}
  </AdminCard>
)

const PlayerImpactFigure = ({ players, loading }) => {
  const maxTotal = Math.max(...players.map((player) => player.total), 1)

  return (
    <AdminCard className="admin-dashboard-card admin-player-impact-card">
      <div className="admin-card-header">
        <div>
          <h2>Player Impact Figure</h2>
          <p className="admin-muted">Visual comparison of leading players and their match input strengths.</p>
        </div>
        <Target size={22} />
      </div>
      {loading ? (
        <div className="admin-player-impact-grid">
          {Array.from({ length: TOP_PLAYERS_LIMIT }).map((_, index) => (
            <span className="admin-training-insight-skeleton" key={`player-impact-skeleton-${index}`} />
          ))}
        </div>
      ) : players.length ? (
        <div className="admin-player-impact-grid">
          {players.map((player, index) => {
            const width = Math.max(4, (player.total / maxTotal) * 100)
            const metricEntries = performanceMetrics
              .map((metric) => ({ label: metric.label, value: player.metrics[metric.label] || 0 }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 3)

            return (
              <article className="admin-player-impact-item" key={player.id} style={{ '--impact-color': areaColors[index % areaColors.length] }}>
                <div className="admin-player-impact-head">
                  <b>{initials(player.name)}</b>
                  <div>
                    <strong>{player.name}</strong>
                    <small>{player.position || 'Player'} - rank #{index + 1}</small>
                  </div>
                  <span>{moneylessNumber(player.total)}</span>
                </div>
                <i><span style={{ width: `${width}%` }} /></i>
                <div className="admin-player-impact-metrics">
                  {metricEntries.map((metric) => (
                    <em key={metric.label}>
                      <small>{metric.label}</small>
                      <strong>{moneylessNumber(metric.value)}</strong>
                    </em>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState>No player impact data yet.</EmptyState>
      )}
    </AdminCard>
  )
}

const PositionCoverageFigure = ({ rows, loading }) => {
  const maxCount = Math.max(...rows.map((row) => row.count), 1)

  return (
    <AdminCard className="admin-dashboard-card admin-position-coverage-card">
      <div className="admin-card-header">
        <div>
          <h2>Position Coverage</h2>
          <p className="admin-muted">Roster balance by assigned player position.</p>
        </div>
        <Users size={22} />
      </div>
      {loading ? (
        <div className="admin-skeleton-list">{Array.from({ length: 5 }).map((_, index) => <span key={index} />)}</div>
      ) : rows.length ? (
        <div className="admin-position-coverage-list">
          {rows.map((row, index) => {
            const width = Math.max(8, (row.count / maxCount) * 100)

            return (
              <article key={row.position} style={{ '--coverage-color': areaColors[index % areaColors.length] }}>
                <span>{row.position}</span>
                <div>
                  <strong>{moneylessNumber(row.count)} players</strong>
                  <i><b style={{ width: `${width}%` }} /></i>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState>No roster positions yet.</EmptyState>
      )}
    </AdminCard>
  )
}

const TrainingLoadFigure = ({ rows, loading }) => {
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <AdminCard className="admin-dashboard-card admin-training-load-card">
      <div className="admin-card-header">
        <div>
          <h2>Training Workload</h2>
          <p className="admin-muted">Assignment status distribution for the selected scope.</p>
        </div>
        <Dumbbell size={22} />
      </div>
      {loading ? (
        <div className="admin-skeleton-list">{Array.from({ length: 4 }).map((_, index) => <span key={index} />)}</div>
      ) : total ? (
        <div className="admin-training-load-figure">
          <div className="admin-training-load-total">
            <strong>{moneylessNumber(total)}</strong>
            <span>Assignments</span>
          </div>
          <div className="admin-training-load-list">
            {rows.map((row, index) => {
              const percent = total ? Math.round((row.count / total) * 100) : 0

              return (
                <article key={row.status} style={{ '--load-color': areaColors[index % areaColors.length] }}>
                  <span>{row.status}</span>
                  <strong>{moneylessNumber(row.count)}</strong>
                  <i><b style={{ width: `${Math.max(6, percent)}%` }} /></i>
                  <small>{percent}%</small>
                </article>
              )
            })}
          </div>
        </div>
      ) : (
        <EmptyState>No training assignments yet.</EmptyState>
      )}
    </AdminCard>
  )
}

const StatCardSkeleton = () => (
  <AdminCard className="admin-stat-card admin-stat-card-skeleton" aria-label="Loading dashboard stat">
    <span className="admin-skeleton-square" />
    <span className="admin-skeleton-line" />
    <strong className="admin-skeleton-line short" />
  </AdminCard>
)

const AdminDashboard = ({ currentPath = '#coach' }) => {
  const currentUser = readSavedUser()
  const roleLabel = currentUser?.role === 'trainer' ? 'Trainer' : 'Coach'
  const [state, setState] = useState({
    teams: [],
    players: [],
    trainers: [],
    teamMembers: [],
    teamTrainers: [],
    logs: [],
    assignments: [],
    attendance: [],
    loading: true,
    error: '',
  })
  const [selectedTeamId, setSelectedTeamId] = useState('')

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const teamParams = {
          limit: 100,
          ...(currentUser?.role === 'coach' && currentUser?.id ? { coach_id: currentUser.id } : {}),
        }
        const [teams, players, trainers, teamMembers, teamTrainers, logs, assignments, attendance] = await Promise.all([
          listResource('teams', teamParams),
          listResource('players'),
          listResource('trainers'),
          listResource('team-members', { limit: 100 }),
          listResource('team-trainers', { limit: 100 }),
          listResource('performance-logs', { limit: 100 }),
          listResource('training-assignments', { limit: 100 }),
          listResource('attendance-logs', { limit: 100 }),
        ])

        if (alive) {
          setState({ teams, players, trainers, teamMembers, teamTrainers, logs, assignments, attendance, loading: false, error: '' })
        }
      } catch (error) {
        if (alive) setState((current) => ({ ...current, loading: false, error: error.message }))
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [currentUser?.id, currentUser?.role])

  const isTrainerDashboard = currentUser?.role === 'trainer'
  const connectedTeamIds = useMemo(() => {
    if (!isTrainerDashboard) {
      return new Set(state.teams
        .filter((team) => String(team.coach_id) === String(currentUser?.id))
        .map((team) => String(team.id)))
    }

    return new Set(state.teamTrainers
      .filter((link) => String(link.trainer_id) === String(currentUser?.id))
      .map((link) => String(link.team_id)))
  }, [currentUser?.id, isTrainerDashboard, state.teamTrainers, state.teams])
  const connectedTeams = useMemo(() => (
    state.teams.filter((team) => connectedTeamIds.has(String(team.id)))
  ), [connectedTeamIds, state.teams])
  const activeTeamIds = useMemo(() => {
    if (selectedTeamId && connectedTeamIds.has(String(selectedTeamId))) {
      return new Set([String(selectedTeamId)])
    }

    return connectedTeamIds
  }, [connectedTeamIds, selectedTeamId])
  const scopedTeams = useMemo(() => (
    connectedTeams.filter((team) => activeTeamIds.has(String(team.id)))
  ), [activeTeamIds, connectedTeams])
  const scopedPlayerIds = useMemo(() => new Set(
    state.teamMembers
      .filter((member) => activeTeamIds.has(String(member.team_id)))
      .map((member) => String(member.player_id)),
  ), [activeTeamIds, state.teamMembers])
  const scopedPlayers = useMemo(() => (
    state.players.filter((player) => scopedPlayerIds.has(String(player.id)))
  ), [scopedPlayerIds, state.players])
  const scopedTrainerIds = useMemo(() => new Set(
    state.teamTrainers
      .filter((link) => activeTeamIds.has(String(link.team_id)))
      .map((link) => String(link.trainer_id)),
  ), [activeTeamIds, state.teamTrainers])
  const scopedTrainers = useMemo(() => (
    state.trainers.filter((trainer) => scopedTrainerIds.has(String(trainer.id)))
  ), [scopedTrainerIds, state.trainers])
  const scopedLogs = useMemo(() => (
    state.logs.filter((log) => scopedPlayerIds.has(String(log.user_id)))
  ), [scopedPlayerIds, state.logs])
  const scopedAttendance = useMemo(() => (
    state.attendance.filter((item) => (
      scopedPlayerIds.has(String(item.player_id)) || activeTeamIds.has(String(item.team_id))
    ))
  ), [activeTeamIds, scopedPlayerIds, state.attendance])

  useEffect(() => {
    if (selectedTeamId && !connectedTeamIds.has(String(selectedTeamId))) {
      setSelectedTeamId('')
    }
  }, [connectedTeamIds, selectedTeamId])

  const performanceChartData = useMemo(() => {
    if (state.loading) return []

    const labels = Array.from(new Set(
      scopedLogs
        .map((log) => formatShortDate(log.created_at || log.session_date))
        .filter(Boolean),
    )).slice(-7)
    const actions = Object.entries(scopedLogs.reduce((acc, log) => {
      const action = log.action_type || 'overall'
      acc[action] = (acc[action] || 0) + Number(log.value || 1)
      return acc
    }, {}))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([action]) => action)

    const actionsWithValues = actions.map((action, index) => ({
      label: action,
      color: areaColors[index % areaColors.length],
      labels,
      values: labels.map((label) => scopedLogs
        .filter((log) => formatShortDate(log.created_at || log.session_date) === label && (log.action_type || 'overall') === action)
        .reduce((sum, log) => sum + Number(log.value || 1), 0)),
    }))
      .map((action) => ({
        ...action,
        total: action.values.reduce((sum, value) => sum + value, 0),
      }))

    return {
      labels,
      actions: actionsWithValues,
      total: actionsWithValues.reduce((sum, action) => sum + action.total, 0),
    }
  }, [scopedLogs, state.loading])

  const topPlayers = useMemo(() => (
    scopedPlayers
      .map((player) => {
        const logs = scopedLogs.filter((log) => String(log.user_id) === String(player.id))
        const metrics = Object.fromEntries(performanceMetrics.map((metric) => [
          metric.label,
          logs
            .filter((log) => log.action_type === metric.action_type && log.result === metric.result)
            .reduce((sum, log) => sum + (Number(log.value) || 1), 0),
        ]))
        const total = Object.values(metrics).reduce((sum, value) => sum + value, 0)

        return { ...player, metrics, total }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_PLAYERS_LIMIT)
  ), [scopedPlayers, scopedLogs])

  const playerScoreStats = useMemo(() => {
    const scores = scopedPlayers.map((player) => {
      const logs = scopedLogs.filter((log) => String(log.user_id) === String(player.id))
      return logs.reduce((sum, log) => sum + (Number(log.value) || 1), 0)
    })

    return {
      min: Math.min(...scores, 0),
      q1: percentile(scores, 0.25),
      median: percentile(scores, 0.5),
      q3: percentile(scores, 0.75),
      max: Math.max(...scores, 0),
      average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
    }
  }, [scopedPlayers, scopedLogs])

  const scopedAssignments = useMemo(() => (
    state.assignments.filter((assignment) => scopedPlayerIds.has(String(assignment.player_id)))
  ), [scopedPlayerIds, state.assignments])

  const positionCoverageRows = useMemo(() => (
    Object.entries(scopedPlayers.reduce((acc, player) => {
      const key = String(player.position || 'Unassigned').toUpperCase()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}))
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count)
  ), [scopedPlayers])

  const assignmentStatusRows = useMemo(() => (
    Object.entries(scopedAssignments.reduce((acc, assignment) => {
      const key = String(assignment.status || 'pending').replace(/_/g, ' ')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}))
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
  ), [scopedAssignments])

  const trainingInsights = useMemo(() => {
    if (state.loading) return []

    const playerSummaries = scopedPlayers.map((player) => {
      const logs = scopedLogs.filter((log) => String(log.user_id) === String(player.id))
      const sortedLogs = [...logs].sort((a, b) => new Date(a.created_at || a.session_date || 0) - new Date(b.created_at || b.session_date || 0))
      const midpoint = Math.ceil(sortedLogs.length / 2)
      const early = sortedLogs.slice(0, midpoint).reduce((sum, log) => sum + (Number(log.value) || 1), 0)
      const recent = sortedLogs.slice(midpoint).reduce((sum, log) => sum + (Number(log.value) || 1), 0)
      const total = logs.reduce((sum, log) => sum + (Number(log.value) || 1), 0)

      return { ...player, logs: logs.length, total, trend: recent - early }
    })
    const rankedPlayers = [...playerSummaries].sort((a, b) => b.total - a.total)
    const topPlayer = rankedPlayers[0]
    const playerNeedingSupport = [...playerSummaries]
      .filter((player) => player.logs > 0)
      .sort((a, b) => a.total - b.total)[0] || playerSummaries.find((player) => !player.logs)
    const strongestAction = groupLogTotals(scopedLogs, (log) => positiveResults.has(String(log.result || '').toLowerCase()))[0]
    const mostCommonError = groupLogTotals(scopedLogs, (log) => String(log.result || '').toLowerCase() === 'error')[0]
    const activeAssignments = scopedAssignments.filter((assignment) => (
      !['completed', 'cancelled'].includes(String(assignment.status || 'pending').toLowerCase())
    )).length

    return [
      {
        icon: Target,
        tone: 'primary',
        label: 'Top performer',
        title: topPlayer ? topPlayer.name : 'No top player yet',
        text: topPlayer ? `${topPlayer.name} leads the selected scope based on total logged performance value.` : 'Add match inputs to identify the current leading player.',
        value: topPlayer ? moneylessNumber(topPlayer.total) : '--',
      },
      {
        icon: TrendingUp,
        tone: 'success',
        label: 'Team strength',
        title: strongestAction ? `${strongestAction[0]} is strongest` : 'No strength signal yet',
        text: strongestAction ? `Positive ${strongestAction[0]} results have the highest count in the current team data.` : 'Positive actions will appear here after player logs are recorded.',
        value: strongestAction ? moneylessNumber(strongestAction[1]) : '--',
      },
      {
        icon: AlertTriangle,
        tone: 'warning',
        label: 'Training focus',
        title: mostCommonError ? `Reduce ${mostCommonError[0]} errors` : 'No major errors yet',
        text: mostCommonError ? `${mostCommonError[0]} has the most recorded errors, so it should be prioritized in the next drills.` : 'No repeated error pattern is visible in the current scope.',
        value: mostCommonError ? moneylessNumber(mostCommonError[1]) : '--',
      },
      {
        icon: Dumbbell,
        tone: 'secondary',
        label: 'Next action',
        title: playerNeedingSupport ? `Support ${playerNeedingSupport.name}` : 'Assign focused drills',
        text: playerNeedingSupport ? `${playerNeedingSupport.name} has the lowest current activity score, so review their training needs.` : 'Use training assignments once players and logs are available.',
        value: activeAssignments ? `${moneylessNumber(activeAssignments)} active` : 'Review',
      },
    ]
  }, [scopedAssignments, scopedLogs, scopedPlayers, state.loading])

  const dashboardNote = state.loading
    ? 'Loading your current team activity.'
    : `${moneylessNumber(scopedTeams.length)} teams, ${moneylessNumber(scopedPlayers.length)} players, and ${moneylessNumber(scopedLogs.length)} performance logs are currently tracked.`
  const performanceNote = scopedLogs.length
    ? 'Performance logs are grouped by action type so you can quickly spot where the team is most active.'
    : 'Add match inputs to populate this forecast with live team activity.'

  return (
    <AdminLayout title={`${roleLabel} Dashboard`} currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}

      <div className="admin-dashboard-hero">
        <div>
          {state.loading ? (
            <div className="admin-dashboard-hero-copy-skeleton" aria-label="Loading dashboard overview">
              <span className="admin-skeleton-line short" />
              <span className="admin-skeleton-line wide" />
              <span className="admin-skeleton-line" />
            </div>
          ) : (
            <>
              <p className="admin-kicker">{roleLabel} Operations</p>
              <h2>Dashboard Overview</h2>
              <span>{dashboardNote}</span>
            </>
          )}
        </div>
        <div className="admin-dashboard-hero-panel">
          {!state.loading && (
            <label className="admin-dashboard-team-filter">
              <span>Team</span>
              <AdminSelect value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}>
                <option value="">All connected teams</option>
                {connectedTeams.map((team) => (
                  <option key={team.id} value={team.id}>{team.team_name}</option>
                ))}
              </AdminSelect>
            </label>
          )}
          <div className="admin-dashboard-hero-stats">
          {state.loading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <span className="admin-dashboard-hero-stat-skeleton" key={`hero-stat-skeleton-${index}`}>
                <i className="admin-skeleton-line short" />
                <i className="admin-skeleton-line" />
              </span>
            ))
          ) : (
            <>
              <span>
                <strong>{moneylessNumber(scopedTeams.length)}</strong>
                <small>Teams</small>
              </span>
              <span>
                <strong>{moneylessNumber(scopedTrainers.length)}</strong>
                <small>Trainers</small>
              </span>
            </>
          )}
          </div>
        </div>
      </div>

      <TrainingInsights insights={trainingInsights} loading={state.loading} />

      <div className="admin-stat-grid">
        {state.loading ? (
          Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={`stat-card-skeleton-${index}`} />)
        ) : (
          <>
            <StatCard icon={Shield} label="Teams" value={moneylessNumber(scopedTeams.length)} />
            <StatCard icon={Users} label="Players" value={moneylessNumber(scopedPlayers.length)} tone="secondary" />
            <StatCard icon={UserRound} label="Trainers" value={moneylessNumber(scopedTrainers.length)} tone="success" />
            <StatCard icon={ClipboardCheck} label="Attendance Logs" value={moneylessNumber(scopedAttendance.length)} tone="success" />
          </>
        )}
      </div>

      <div className="admin-grid">
        <AdminCard className="admin-chart-card admin-analytics-card admin-dashboard-card admin-dashboard-chart-card">
          <div className="admin-card-header">
            <div>
              <h2>Performance Forecast</h2>
              <p className="admin-muted">{performanceNote}</p>
            </div>
            <StatusBadge tone="secondary">{state.loading ? 'Loading' : `${scopedLogs.length} inputs`}</StatusBadge>
          </div>
          {state.loading ? (
            <div className="admin-skeleton-bars" aria-label="Loading chart">
              {Array.from({ length: 8 }).map((_, index) => (
                <span key={index} style={{ height: `${32 + (index % 4) * 14}%` }} />
              ))}
            </div>
          ) : performanceChartData.labels?.length && performanceChartData.actions?.length ? (
            <ActivityMixChart
              labels={performanceChartData.labels}
              actions={performanceChartData.actions}
              total={performanceChartData.total}
            />
          ) : (
            <EmptyState>No performance logs yet.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-activity-card admin-analytics-card admin-dashboard-card admin-dashboard-box-card">
          <div className="admin-card-header">
            <div>
              <h2>Score Distribution</h2>
              <p className="admin-muted">Box chart of player performance scores.</p>
            </div>
          </div>
          {state.loading ? (
            <div className="admin-skeleton-list">
              {Array.from({ length: 4 }).map((_, index) => <span key={index} />)}
            </div>
          ) : scopedPlayers.length ? (
            <BoxChart stats={playerScoreStats} />
          ) : (
            <EmptyState>No player scores yet.</EmptyState>
          )}
        </AdminCard>

        <PlayerImpactFigure players={topPlayers} loading={state.loading} />

        <PositionCoverageFigure rows={positionCoverageRows} loading={state.loading} />

        <TrainingLoadFigure rows={assignmentStatusRows} loading={state.loading} />

      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
