import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, PieChart, Swords, Trophy, Users } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  AdminField,
  AdminSelect,
  EmptyState,
  StatCard,
  StatusBadge,
  formatDate,
  getName,
  moneylessNumber,
  parseRankings,
} from './AdminLayout'
import { listResource, readSavedUser } from '../../lib/api'

const metricOptions = [
  { value: 'positive_results', label: 'Positive Results' },
  { value: 'average_value', label: 'Average Value' },
  { value: 'errors', label: 'Errors' },
  { value: 'total_logs', label: 'Total Logs' },
]

const goodResults = new Set(['kill', 'ace', 'perfect', 'assist', 'stuff'])
const actualMatchTypes = ['league', 'tournament', 'playoff']
const chartColors = ['#12aabd', '#ff6692', '#36c76c', '#ffb900', '#635bff', '#2f4050']
const statLineMetrics = [
  { key: 'kill', label: 'Kills' },
  { key: 'ace', label: 'Aces' },
  { key: 'stuff', label: 'Blocks' },
  { key: 'assist', label: 'Assists' },
  { key: 'perfect', label: 'Passes' },
  { key: 'error', label: 'Errors' },
]

const normalizeSessionType = (value = '') => String(value).toLowerCase()
const isPracticeSession = (value) => ['practice', 'training', 'drill', 'friendly'].includes(normalizeSessionType(value))
const isActualSession = (value) => ['match', 'game', 'actual', 'league', 'tournament', 'playoff'].includes(normalizeSessionType(value))
const pct = (value, total) => (total ? Math.round((Number(value || 0) / total) * 100) : 0)
const isScoreComplete = (score) => (
  score?.team_score !== null && score?.team_score !== undefined
  && score?.opponent_score !== null && score?.opponent_score !== undefined
)

const getScoreResult = (score) => {
  if (!isScoreComplete(score)) return null
  if (Number(score.team_score) > Number(score.opponent_score)) return 'win'
  if (Number(score.team_score) < Number(score.opponent_score)) return 'loss'
  return 'draw'
}

const resolveMatchFromScores = (match, scores) => {
  const completeScores = scores
    .filter(isScoreComplete)
    .sort((a, b) => Number(a.match_number || 1) - Number(b.match_number || 1))
  const latestScore = completeScores[completeScores.length - 1]
  const fallbackScore = isScoreComplete(match)
    ? {
      team_score: match.team_score,
      opponent_score: match.opponent_score,
      match_number: 1,
    }
    : null
  const scoreForSingleMatch = latestScore || fallbackScore
  const bestOf = Number(match.best_of || 1)

  if (!scoreForSingleMatch) {
    return {
      ...match,
      resolved_result: match.result || null,
      resolved_team_score: match.team_score,
      resolved_opponent_score: match.opponent_score,
    }
  }

  if (bestOf <= 1) {
    const result = getScoreResult(scoreForSingleMatch)

    return {
      ...match,
      resolved_result: result,
      resolved_team_score: result === 'win' ? 1 : 0,
      resolved_opponent_score: result === 'loss' ? 1 : 0,
    }
  }

  const winsNeeded = Math.floor(bestOf / 2) + 1
  const setWins = completeScores.reduce((acc, score) => {
    const result = getScoreResult(score)
    if (result === 'win') return { ...acc, team: acc.team + 1 }
    if (result === 'loss') return { ...acc, opponent: acc.opponent + 1 }
    return acc
  }, { team: 0, opponent: 0 })

  return {
    ...match,
    resolved_result: setWins.team >= winsNeeded ? 'win' : setWins.opponent >= winsNeeded ? 'loss' : match.result || null,
    resolved_team_score: setWins.team,
    resolved_opponent_score: setWins.opponent,
  }
}

const formatWinner = (match) => {
  if (match.resolved_result === 'win') return getName(match.allTeams || [], match.team_id, match.team_name || 'Team 1')
  if (match.resolved_result === 'loss') return match.opponent_name || 'Opponent'
  if (match.resolved_result === 'draw') return 'Draw'
  return 'Pending'
}

const formatResolvedScore = (match) => (
  match.resolved_team_score !== null && match.resolved_team_score !== undefined
    && match.resolved_opponent_score !== null && match.resolved_opponent_score !== undefined
    ? `${match.resolved_team_score} - ${match.resolved_opponent_score}`
    : '-'
)

const buildPie = (counts) => {
  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0)
  let start = 0
  const segments = Object.entries(counts)
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value], index) => {
      const size = total ? (Number(value) / total) * 100 : 0
      const color = chartColors[index % chartColors.length]
      const segment = `${color} ${start}% ${start + size}%`
      start += size
      return { label, value: Number(value), color, segment }
    })

  return { total, segments }
}

const LineGraph = ({ labels, series }) => {
  const width = 720
  const height = 260
  const padding = { top: 22, right: 24, bottom: 44, left: 42 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const values = series.flatMap((item) => item.values)
  const max = Math.max(...values, 1)
  const xFor = (index) => padding.left + (labels.length <= 1 ? innerWidth / 2 : (index / (labels.length - 1)) * innerWidth)
  const yFor = (value) => padding.top + innerHeight - ((Number(value) || 0) / max) * innerHeight

  return (
    <div className="admin-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Team stat input line graph">
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const y = padding.top + innerHeight * step
          return (
            <line key={step} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="admin-line-grid" />
          )
        })}
        {labels.map((label, index) => (
          <g key={label}>
            <line x1={xFor(index)} x2={xFor(index)} y1={padding.top} y2={height - padding.bottom} className="admin-line-grid vertical" />
            <text x={xFor(index)} y={height - 16} textAnchor="middle">{label}</text>
          </g>
        ))}
        {series.map((item, index) => {
          const color = chartColors[index % chartColors.length]
          const points = item.values.map((value, valueIndex) => `${xFor(valueIndex)},${yFor(value)}`).join(' ')

          return (
            <g key={item.label}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {item.values.map((value, valueIndex) => (
                <circle key={`${item.label}-${labels[valueIndex]}`} cx={xFor(valueIndex)} cy={yFor(value)} r="5" fill={color}>
                  <title>{`${item.label} ${labels[valueIndex]}: ${value}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
      <div className="admin-line-legend">
        {series.map((item, index) => (
          <span key={item.label}>
            <i style={{ background: chartColors[index % chartColors.length] }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const RadarChart = ({ data }) => {
  const size = 360
  const center = size / 2
  const radius = 126
  const values = data.map((item) => Number(item.value) || 0)
  const max = Math.max(...values, 1)
  const safeData = data.slice(0, 8)
  const angleFor = (index) => ((Math.PI * 2) / safeData.length) * index - Math.PI / 2
  const pointFor = (index, scale = 1) => {
    const angle = angleFor(index)

    return {
      x: center + Math.cos(angle) * radius * scale,
      y: center + Math.sin(angle) * radius * scale,
    }
  }
  const polygonPoints = safeData
    .map((item, index) => {
      const scale = (Number(item.value) || 0) / max
      const point = pointFor(index, scale)
      return `${point.x},${point.y}`
    })
    .join(' ')

  return (
    <div className="admin-radar-chart" role="img" aria-label="Player comparison radar chart">
      <svg viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={safeData.map((_, index) => {
              const point = pointFor(index, scale)
              return `${point.x},${point.y}`
            }).join(' ')}
            className="admin-radar-grid"
          />
        ))}
        {safeData.map((item, index) => {
          const outer = pointFor(index, 1)
          const label = pointFor(index, 1.18)

          return (
            <g key={item.label}>
              <line x1={center} y1={center} x2={outer.x} y2={outer.y} className="admin-radar-axis" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">
                {item.label}
              </text>
            </g>
          )
        })}
        <polygon points={polygonPoints} className="admin-radar-area" />
        {safeData.map((item, index) => {
          const scale = (Number(item.value) || 0) / max
          const point = pointFor(index, scale)

          return (
            <circle key={`${item.label}-point`} cx={point.x} cy={point.y} r="5" className="admin-radar-point">
              <title>{`${item.label}: ${moneylessNumber(item.value)}`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="admin-radar-values">
        {safeData.map((item) => (
          <span key={item.label}>
            <b>{moneylessNumber(item.value)}</b>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const AnalyticsSkeleton = () => (
  <>
    <div className="admin-analytics-toolbar admin-analytics-hero">
      <div className="admin-dashboard-hero-copy-skeleton">
        <span className="admin-skeleton-line short" />
        <span className="admin-skeleton-line wide" />
        <span className="admin-skeleton-line" />
      </div>
      <div className="admin-analytics-controls">
        <span className="admin-skeleton-line wide" />
        <span className="admin-skeleton-line" />
      </div>
    </div>
    <div className="admin-stat-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <AdminCard className="admin-stat-card admin-stat-card-skeleton" key={`analytics-stat-skeleton-${index}`}>
          <span className="admin-skeleton-square" />
          <span className="admin-skeleton-line" />
          <strong className="admin-skeleton-line short" />
        </AdminCard>
      ))}
    </div>
    <div className="admin-grid admin-page-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <AdminCard
          className={`admin-analytics-card ${index % 2 === 0 ? 'admin-analytics-primary-card' : 'admin-analytics-side-card'}`}
          key={`analytics-card-skeleton-${index}`}
        >
          <div className="admin-skeleton-list">
            {Array.from({ length: 6 }).map((__, itemIndex) => <span key={`analytics-card-line-${index}-${itemIndex}`} />)}
          </div>
        </AdminCard>
      ))}
      <AdminCard className="admin-table-card admin-analytics-card admin-analytics-table-card">
        <div className="admin-skeleton-list">
          {Array.from({ length: 6 }).map((_, index) => <span key={`analytics-table-line-${index}`} />)}
        </div>
      </AdminCard>
    </div>
  </>
)

const AdminAnalytics = ({ currentPath = '#coach/analytics' }) => {
  const currentUser = readSavedUser()
  const roleLabel = currentUser?.role === 'trainer' ? 'Trainer' : 'Coach'
  const roleScope = currentUser?.role === 'trainer' ? 'trainer' : 'coach'
  const [activeView, setActiveView] = useState('practice')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [metric, setMetric] = useState('positive_results')
  const [state, setState] = useState({
    players: [],
    teamMembers: [],
    teamTrainers: [],
    teams: [],
    matches: [],
    matchScores: [],
    rankings: [],
    attendance: [],
    comparisons: [],
    logs: [],
    loading: true,
    error: '',
  })

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [players, teamMembers, teamTrainers, teams, matches, matchScores, rankings, attendance, comparisons, logs] = await Promise.all([
          listResource('players'),
          listResource('team-members', { limit: 100 }),
          listResource('team-trainers', { limit: 100 }),
          listResource('teams', { limit: 100 }),
          listResource('matches', { limit: 100, sortBy: 'match_date', sortDir: 'asc' }),
          listResource('match-scores', { limit: 100, sortBy: 'match_number', sortDir: 'asc' }),
          listResource('team-rankings', { limit: 100 }),
          listResource('attendance-logs', { limit: 100 }),
          listResource('player-comparisons', { limit: 100 }),
          listResource('performance-logs', { limit: 100 }),
        ])

        if (alive) setState({ players, teamMembers, teamTrainers, teams, matches, matchScores, rankings, attendance, comparisons, logs, loading: false, error: '' })
      } catch (err) {
        if (alive) setState((current) => ({ ...current, loading: false, error: err.message }))
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [currentUser?.id, currentUser?.role])

  const coachTeams = useMemo(() => {
    if (currentUser?.role === 'trainer') {
      const assignedTeamIds = new Set(
        state.teamTrainers
          .filter((link) => String(link.trainer_id) === String(currentUser?.id))
          .map((link) => String(link.team_id)),
      )

      return state.teams.filter((team) => assignedTeamIds.has(String(team.id)))
    }

    const owned = state.teams.filter((team) => String(team.coach_id) === String(currentUser?.id))
    return owned.length ? owned : state.teams
  }, [currentUser?.id, currentUser?.role, state.teamTrainers, state.teams])

  const allCoachTeamIds = useMemo(() => new Set(coachTeams.map((team) => String(team.id))), [coachTeams])

  useEffect(() => {
    if (!selectedTeamId) return
    if (coachTeams.some((team) => String(team.id) === String(selectedTeamId))) return
    setSelectedTeamId('')
  }, [coachTeams, selectedTeamId])

  const selectedTeams = useMemo(() => (
    selectedTeamId
      ? coachTeams.filter((team) => String(team.id) === String(selectedTeamId))
      : coachTeams
  ), [coachTeams, selectedTeamId])

  const coachTeamIds = useMemo(() => new Set(selectedTeams.map((team) => String(team.id))), [selectedTeams])

  const playerTeamIdById = useMemo(() => {
    const pairs = state.teamMembers
      .filter((member) => allCoachTeamIds.has(String(member.team_id)))
      .map((member) => [String(member.player_id), String(member.team_id)])

    return Object.fromEntries(pairs)
  }, [allCoachTeamIds, state.teamMembers])

  const allCoachPlayerIds = useMemo(() => new Set(Object.keys(playerTeamIdById)), [playerTeamIdById])

  const coachPlayerIds = useMemo(() => new Set(
    state.teamMembers
      .filter((member) => coachTeamIds.has(String(member.team_id)))
      .map((member) => String(member.player_id)),
  ), [coachTeamIds, state.teamMembers])

  const coachPlayers = useMemo(() => (
    state.players.filter((player) => coachPlayerIds.has(String(player.id)))
  ), [coachPlayerIds, state.players])

  const scopedMatches = useMemo(() => (
    state.matches.filter((match) => coachTeamIds.has(String(match.team_id)))
  ), [coachTeamIds, state.matches])

  const allScopedMatches = useMemo(() => (
    state.matches.filter((match) => allCoachTeamIds.has(String(match.team_id)))
  ), [allCoachTeamIds, state.matches])

  const scoreRowsByMatch = useMemo(() => (
    state.matchScores.reduce((acc, score) => {
      const matchId = String(score.match_id)
      acc[matchId] = [...(acc[matchId] || []), score]
      return acc
    }, {})
  ), [state.matchScores])

  const visibleMatches = useMemo(() => (
    scopedMatches.filter((match) => (
      activeView === 'practice'
        ? match.match_type === 'friendly'
        : actualMatchTypes.includes(match.match_type)
    ))
  ), [activeView, scopedMatches])

  const allVisibleMatches = useMemo(() => (
    allScopedMatches.filter((match) => (
      activeView === 'practice'
        ? match.match_type === 'friendly'
        : actualMatchTypes.includes(match.match_type)
    ))
  ), [activeView, allScopedMatches])

  const resolvedMatches = useMemo(() => (
    visibleMatches.map((match) => resolveMatchFromScores(match, scoreRowsByMatch[String(match.id)] || []))
  ), [scoreRowsByMatch, visibleMatches])

  const visibleMatchIds = useMemo(() => new Set(visibleMatches.map((match) => String(match.id))), [visibleMatches])
  const allVisibleMatchIds = useMemo(() => new Set(allVisibleMatches.map((match) => String(match.id))), [allVisibleMatches])

  const scopedAttendance = useMemo(() => (
    state.attendance.filter((log) => (
      coachTeamIds.has(String(log.team_id)) || coachPlayerIds.has(String(log.player_id))
    ))
  ), [coachPlayerIds, coachTeamIds, state.attendance])

  const visibleAttendance = useMemo(() => (
    scopedAttendance.filter((log) => {
      if (log.match_id) return visibleMatchIds.has(String(log.match_id))
      return activeView === 'practice' ? isPracticeSession(log.session_type) : isActualSession(log.session_type)
    })
  ), [activeView, scopedAttendance, visibleMatchIds])

  const visibleLogs = useMemo(() => (
    state.logs.filter((log) => {
      if (!coachPlayerIds.has(String(log.user_id))) return false
      if (log.match_id) return visibleMatchIds.has(String(log.match_id))
      return activeView === 'practice' ? isPracticeSession(log.session_type) : isActualSession(log.session_type)
    })
  ), [activeView, coachPlayerIds, state.logs, visibleMatchIds])

  const allVisibleLogs = useMemo(() => (
    state.logs.filter((log) => {
      if (!allCoachPlayerIds.has(String(log.user_id))) return false
      if (log.match_id) return allVisibleMatchIds.has(String(log.match_id))
      return activeView === 'practice' ? isPracticeSession(log.session_type) : isActualSession(log.session_type)
    })
  ), [activeView, allCoachPlayerIds, allVisibleMatchIds, state.logs])

  const allVisibleRankings = useMemo(() => (
    state.rankings.filter((ranking) => allCoachTeamIds.has(String(ranking.team_id)))
  ), [allCoachTeamIds, state.rankings])

  const resolvedAllVisibleMatches = useMemo(() => (
    allVisibleMatches.map((match) => resolveMatchFromScores(match, scoreRowsByMatch[String(match.id)] || []))
  ), [allVisibleMatches, scoreRowsByMatch])

  const visibleComparisons = useMemo(() => (
    state.comparisons.filter((comparison) => coachTeamIds.has(String(comparison.team_id)))
  ), [coachTeamIds, state.comparisons])

  const comparisonData = useMemo(() => {
    const comparison = visibleComparisons.find((item) => item.metric_name === metric) || visibleComparisons[0]
    const rankings = parseRankings(comparison?.rankings)

    if (rankings.length) {
      return rankings
        .filter((row) => !coachPlayerIds.size || coachPlayerIds.has(String(row.player_id)))
        .slice(0, 8)
        .map((row) => ({
        label: row.name || `#${row.player_id}`,
        value: Number(row[metric]) || Number(row.average_value) || Number(row.total_logs) || 0,
      }))
    }

    const grouped = coachPlayers.map((player) => {
      const logs = visibleLogs.filter((log) => String(log.user_id) === String(player.id))
      const positives = logs.filter((log) => goodResults.has(log.result)).length
      const errors = logs.filter((log) => log.result === 'error').length
      const avg = logs.reduce((sum, log) => sum + (Number(log.value) || 0), 0) / Math.max(logs.length, 1)
      const values = {
        positive_results: positives,
        average_value: avg,
        errors,
        total_logs: logs.length,
      }

      return { label: player.name, value: values[metric] || 0 }
    })

    return grouped.sort((a, b) => b.value - a.value).slice(0, 8)
  }, [coachPlayerIds, coachPlayers, metric, visibleComparisons, visibleLogs])

  const attendanceStats = useMemo(() => {
    const counts = visibleAttendance.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1
      return acc
    }, {})

    return buildPie(counts)
  }, [visibleAttendance])

  const resultStats = useMemo(() => buildPie(
    resolvedMatches.reduce((acc, match) => {
      const key = match.resolved_result || 'scheduled'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
  ), [resolvedMatches])

  const resultNote = useMemo(() => {
    const wins = resultStats.segments.find((item) => item.label === 'win')?.value || 0
    const losses = resultStats.segments.find((item) => item.label === 'loss')?.value || 0
    const draws = resultStats.segments.find((item) => item.label === 'draw')?.value || 0
    const pending = resultStats.segments.find((item) => item.label === 'scheduled')?.value || 0

    if (wins > losses) return `Positive record so far: ${wins} win${wins === 1 ? '' : 's'} against ${losses} loss${losses === 1 ? '' : 'es'}.`
    if (losses > wins) return `Needs review: ${losses} loss${losses === 1 ? '' : 'es'} against ${wins} win${wins === 1 ? '' : 's'}.`
    if (wins || losses) return `Balanced record: ${wins} win${wins === 1 ? '' : 's'} and ${losses} loss${losses === 1 ? '' : 'es'}.`
    if (draws) return `${draws} draw${draws === 1 ? '' : 's'} recorded for this view.`
    if (pending) return `${pending} match${pending === 1 ? '' : 'es'} waiting for final scores.`
    return 'No result trend available yet.'
  }, [resultStats.segments])

  const teamPerformance = useMemo(() => selectedTeams.map((team) => {
    const matches = resolvedMatches.filter((match) => String(match.team_id) === String(team.id))
    const wins = matches.filter((match) => match.resolved_result === 'win').length
    const losses = matches.filter((match) => match.resolved_result === 'loss').length
    const draws = matches.filter((match) => match.resolved_result === 'draw').length
    const pointsFor = matches.reduce((sum, match) => sum + Number(match.resolved_team_score || 0), 0)
    const pointsAgainst = matches.reduce((sum, match) => sum + Number(match.resolved_opponent_score || 0), 0)

    return {
      ...team,
      matches: matches.length,
      wins,
      losses,
      draws,
      winRate: pct(wins, matches.length),
      pointDiff: pointsFor - pointsAgainst,
    }
  }).sort((a, b) => b.winRate - a.winRate || b.pointDiff - a.pointDiff), [selectedTeams, resolvedMatches])

  const computedRankings = useMemo(() => (
    coachTeams
      .map((team) => {
        const matches = resolvedAllVisibleMatches.filter((match) => String(match.team_id) === String(team.id))
        const wins = matches.filter((match) => match.resolved_result === 'win').length
        const losses = matches.filter((match) => match.resolved_result === 'loss').length
        const pointsFor = matches.reduce((sum, match) => sum + Number(match.resolved_team_score || 0), 0)
        const pointsAgainst = matches.reduce((sum, match) => sum + Number(match.resolved_opponent_score || 0), 0)

        return {
          id: `computed-${team.id}`,
          team_id: team.id,
          ranking_position: 0,
          wins,
          set_wins: pointsFor,
          losses,
          win_percentage: pct(wins, matches.length),
          point_difference: pointsFor - pointsAgainst,
          calculated_at: null,
          computed: true,
        }
      })
      .sort((a, b) => (
        Number(b.wins || 0) - Number(a.wins || 0)
        || Number(b.set_wins || 0) - Number(a.set_wins || 0)
        || Number(b.win_percentage || 0) - Number(a.win_percentage || 0)
        || Number(b.point_difference || 0) - Number(a.point_difference || 0)
      ))
      .map((ranking, index) => ({ ...ranking, ranking_position: index + 1 }))
  ), [coachTeams, resolvedAllVisibleMatches])

  const rankingRows = allVisibleRankings.length ? allVisibleRankings : computedRankings

  const teamStatLineSeries = useMemo(() => (
    coachTeams
      .map((team) => {
        const values = statLineMetrics.map((item) => (
          allVisibleLogs
            .filter((log) => (
              String(playerTeamIdById[String(log.user_id)]) === String(team.id)
              && log.result === item.key
            ))
            .reduce((sum, log) => sum + Number(log.value || 1), 0)
        ))

        return {
          label: team.team_name,
          values,
          total: values.reduce((sum, value) => sum + value, 0),
        }
      })
      .filter((team) => team.total > 0)
      .slice(0, 6)
  ), [allVisibleLogs, coachTeams, playerTeamIdById])

  const teamStatInputTotal = teamStatLineSeries.reduce((sum, team) => sum + team.total, 0)

  const latestWinners = useMemo(() => (
    resolvedMatches
      .map((match) => ({ ...match, allTeams: selectedTeams }))
      .slice()
      .sort((a, b) => new Date(b.match_date || 0) - new Date(a.match_date || 0) || Number(b.id) - Number(a.id))
      .slice(0, 8)
  ), [resolvedMatches, selectedTeams])

  const totals = useMemo(() => {
    const wins = resolvedMatches.filter((match) => match.resolved_result === 'win').length
    return {
      teams: selectedTeams.length,
      players: coachPlayers.length,
      matches: resolvedMatches.length,
      winRate: pct(wins, resolvedMatches.length),
    }
  }, [coachPlayers.length, resolvedMatches, selectedTeams.length])

  return (
    <AdminLayout title="Analytics" currentPath={currentPath}>
      {state.error && <div className="admin-alert">{state.error}</div>}

      {state.loading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
      <div className="admin-analytics-toolbar admin-analytics-hero">
        <div>
          <h2>{activeView === 'practice' ? 'Practice Analytics' : 'Actual Match Analytics'}</h2>
          <p className="admin-muted">
            Showing performance for {selectedTeamId ? getName(coachTeams, selectedTeamId) : `all teams covered by the logged-in ${roleScope}`}.
          </p>
        </div>
        <div className="admin-analytics-controls">
          <AdminField label="Team" className="admin-compact-field">
            <AdminSelect value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}>
              <option value="">All covered teams</option>
              {coachTeams.map((team) => (
                <option key={team.id} value={team.id}>{team.team_name}</option>
              ))}
            </AdminSelect>
          </AdminField>
          <div className="admin-segmented" role="tablist" aria-label="Analytics match view">
            <button
              type="button"
              className={activeView === 'practice' ? 'active' : ''}
              onClick={() => setActiveView('practice')}
            >
              Practice
            </button>
            <button
              type="button"
              className={activeView === 'actual' ? 'active' : ''}
              onClick={() => setActiveView('actual')}
            >
              Actual
            </button>
          </div>
        </div>
      </div>

      <div className="admin-stat-grid">
        <StatCard icon={Users} label={`${roleLabel} Players`} value={moneylessNumber(totals.players)} />
        <StatCard icon={Swords} label={activeView === 'practice' ? 'Practice Matches' : 'Actual Matches'} value={moneylessNumber(totals.matches)} tone="secondary" />
        <StatCard icon={Trophy} label="Win Rate" value={`${totals.winRate}%`} tone="success" />
        <StatCard icon={ClipboardCheck} label="Attendance Logs" value={moneylessNumber(visibleAttendance.length)} tone="success" />
      </div>

      <div className="admin-grid admin-page-grid">
        <AdminCard className="admin-chart-card admin-analytics-card admin-analytics-primary-card">
          <div className="admin-card-header">
            <div>
              <h2>Player Comparison</h2>
              <p className="admin-muted">Filtered to players on the {roleScope} roster.</p>
            </div>
            <AdminField label="Metric" className="admin-compact-field">
              <AdminSelect value={metric} onChange={(event) => setMetric(event.target.value)}>
                {metricOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>
          {comparisonData.length ? <RadarChart data={comparisonData} /> : <EmptyState>No comparison data yet.</EmptyState>}
        </AdminCard>

        <AdminCard className="admin-activity-card admin-analytics-card admin-analytics-side-card">
          <div className="admin-card-header">
            <h2>Match Results</h2>
            <StatusBadge tone="secondary">{resultStats.total} matches</StatusBadge>
          </div>
          {resultStats.total ? (
            <div className="admin-pie-wrap">
              <div
                className="admin-pie"
                style={{ background: `conic-gradient(${resultStats.segments.map((item) => item.segment).join(', ')})` }}
                aria-label="Match result pie chart"
              />
              <div className="admin-pie-legend">
                {resultStats.segments.map((item) => (
                  <span key={item.label}>
                    <i style={{ background: item.color }} />
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
              <div className="admin-chart-note">
                <strong>Result note</strong>
                <p>{resultNote}</p>
              </div>
            </div>
          ) : (
            <EmptyState>No match results yet.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-chart-card admin-analytics-card admin-analytics-primary-card">
          <div className="admin-card-header">
            <div>
              <h2>Team Performance</h2>
              <p className="admin-muted">Inputted stat totals by team for the selected match type.</p>
            </div>
            <StatusBadge tone="secondary">{moneylessNumber(teamStatInputTotal)} inputs</StatusBadge>
          </div>
          {teamStatLineSeries.length ? (
            <LineGraph
              labels={statLineMetrics.map((item) => item.label)}
              series={teamStatLineSeries}
            />
          ) : (
            <EmptyState>No inputted team stats yet.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-activity-card admin-analytics-card admin-analytics-side-card">
          <div className="admin-card-header">
            <h2>Attendance Report</h2>
            <StatusBadge tone="secondary">{attendanceStats.total} logs</StatusBadge>
          </div>
          {attendanceStats.total ? (
            <div className="admin-pie-wrap">
              <div
                className="admin-pie"
                style={{ background: `conic-gradient(${attendanceStats.segments.map((item) => item.segment).join(', ')})` }}
                aria-label="Attendance pie chart"
              />
              <div className="admin-pie-legend">
                {attendanceStats.segments.map((item) => (
                  <span key={item.label}>
                    <i style={{ background: item.color }} />
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>No attendance logs yet.</EmptyState>
          )}
        </AdminCard>

        <AdminCard className="admin-table-card admin-analytics-card admin-analytics-table-card">
          <div className="admin-card-header">
            <div>
              <h2>{roleLabel} Team Performance</h2>
              <p className="admin-muted">Record, win rate, and point differential inside the logged-in {roleScope} scope.</p>
            </div>
            <PieChart size={21} />
          </div>
          <div className="admin-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Matches</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Draws</th>
                  <th>Win %</th>
                  <th>Point Diff</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((team) => (
                  <tr key={team.id}>
                    <td>{team.team_name}</td>
                    <td>{team.matches}</td>
                    <td>{team.wins}</td>
                    <td>{team.losses}</td>
                    <td>{team.draws}</td>
                    <td>{team.winRate}%</td>
                    <td>{team.pointDiff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!teamPerformance.length && <EmptyState>No {roleScope} teams yet.</EmptyState>}
          </div>
        </AdminCard>

        <AdminCard className="admin-table-card admin-analytics-card admin-analytics-table-card">
          <div className="admin-card-header">
            <div>
              <h2>Latest Winners</h2>
              <p className="admin-muted">Winner is calculated from the newest saved score input.</p>
            </div>
            <Trophy size={21} />
          </div>
          <div className="admin-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Winner</th>
                  {activeView === 'actual' && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {latestWinners.map((match) => (
                  <tr key={match.id}>
                    <td>{getName(selectedTeams, match.team_id)} vs {match.opponent_name}</td>
                    <td>{formatDate(match.match_date)}</td>
                    <td>{formatResolvedScore(match)}</td>
                    <td>{formatWinner(match)}</td>
                    {activeView === 'actual' && (
                      <td><StatusBadge tone={match.resolved_result ? 'success' : 'secondary'}>{match.resolved_result || 'pending'}</StatusBadge></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!latestWinners.length && <EmptyState>No matches yet.</EmptyState>}
          </div>
        </AdminCard>

        <AdminCard className="admin-table-card admin-analytics-card admin-analytics-table-card admin-rankings-card">
          <div className="admin-card-header">
            <div>
              <h2>Team Rankings</h2>
              <p className="admin-muted">
                {allVisibleRankings.length ? 'Saved ranking records.' : 'Calculated from latest match scores.'}
              </p>
            </div>
          </div>
          <div className="admin-table">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Wins</th>
                  <th>Set Wins</th>
                  <th>Losses</th>
                  <th>Win %</th>
                  <th>Point Diff</th>
                  <th>Calculated</th>
                </tr>
              </thead>
              <tbody>
                {rankingRows
                  .slice()
                  .sort((a, b) => (
                    Number(b.wins || 0) - Number(a.wins || 0)
                    || Number(b.set_wins || 0) - Number(a.set_wins || 0)
                    || Number(b.win_percentage || 0) - Number(a.win_percentage || 0)
                    || Number(b.point_difference || 0) - Number(a.point_difference || 0)
                    || Number(a.ranking_position || 0) - Number(b.ranking_position || 0)
                  ))
                  .map((ranking) => (
                    <tr key={ranking.id}>
                      <td>#{ranking.ranking_position}</td>
                      <td>{getName(coachTeams, ranking.team_id)}</td>
                      <td>{ranking.wins || 0}</td>
                      <td>{ranking.set_wins ?? ranking.points_for ?? 0}</td>
                      <td>{ranking.losses || 0}</td>
                      <td>{Number(ranking.win_percentage || 0).toFixed(1)}%</td>
                      <td>{ranking.point_difference || 0}</td>
                      <td>{ranking.computed ? 'Live' : formatDate(ranking.calculated_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!rankingRows.length && <EmptyState>No team rankings yet.</EmptyState>}
          </div>
        </AdminCard>
      </div>
        </>
      )}
    </AdminLayout>
  )
}

export default AdminAnalytics
