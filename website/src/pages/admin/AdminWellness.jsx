import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Battery, Moon, Zap } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  EmptyState,
  StatusBadge,
  formatDate,
  getName,
} from './AdminLayout'
import { listResource, readSavedUser } from '../../lib/api'

const average = (rows, key) => {
  const values = rows.map((row) => Number(row[key])).filter((value) => Number.isFinite(value) && value > 0)
  if (!values.length) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

const formatAverage = (value) => (value ? value.toFixed(1) : '-')

const dateKey = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const scoreTone = (value, warningAt, dangerAt) => {
  const score = Number(value) || 0
  if (score >= dangerAt) return 'error'
  if (score >= warningAt) return 'warning'
  return 'success'
}

const getRiskLevel = (log) => {
  const fatigue = Number(log.fatigue_level) || 0
  const rpe = Number(log.rpe) || 0
  const sleep = Number(log.sleep_hours) || 0
  const injury = Boolean(log.injury)

  if (injury || fatigue >= 8 || rpe >= 9 || sleep < 5) return 'High'
  if (fatigue >= 6 || rpe >= 7 || sleep < 6.5) return 'Watch'
  return 'Ready'
}

const riskTone = (level) => {
  if (level === 'High') return 'error'
  if (level === 'Watch') return 'warning'
  return 'success'
}

const WellnessMetric = ({ icon: Icon, label, value, detail, tone = 'primary' }) => (
  <AdminCard className={`admin-wellness-metric ${tone}`}>
    <span className="admin-wellness-metric-icon"><Icon size={20} /></span>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </AdminCard>
)

const WellnessTrend = ({ logs }) => {
  const points = logs
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-12)
    .map((log) => ({
      id: log.id,
      label: formatDate(log.created_at),
      rpe: Number(log.rpe) || 0,
      fatigue: Number(log.fatigue_level) || 0,
    }))
  const width = 520
  const height = 190
  const padding = 28
  const xFor = (index) => padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)
  const yFor = (value) => height - padding - (Math.min(value, 10) / 10) * (height - padding * 2)
  const lineFor = (key) => points.map((point, index) => `${xFor(index)},${yFor(point[key])}`).join(' ')

  return (
    <AdminCard className="admin-wellness-chart-card">
      <div className="admin-card-header admin-wellness-compact-header">
        <div>
          <h2>Recent Recovery Trend</h2>
          <p className="admin-muted">Latest player entries across RPE and fatigue.</p>
        </div>
      </div>
      <div className="admin-wellness-trend">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recent wellness trend chart">
          {[2, 4, 6, 8, 10].map((tick) => (
            <g key={tick}>
              <line x1={padding} x2={width - padding} y1={yFor(tick)} y2={yFor(tick)} />
              <text x="6" y={yFor(tick) + 4}>{tick}</text>
            </g>
          ))}
          {points.length > 1 && <polyline className="rpe" points={lineFor('rpe')} />}
          {points.length > 1 && <polyline className="fatigue" points={lineFor('fatigue')} />}
          {points.map((point, index) => (
            <g key={point.id}>
              <circle className="rpe" cx={xFor(index)} cy={yFor(point.rpe)} r="4" />
              <circle className="fatigue" cx={xFor(index)} cy={yFor(point.fatigue)} r="4" />
              <title>{`${point.label}: RPE ${point.rpe || '-'}, fatigue ${point.fatigue || '-'}`}</title>
            </g>
          ))}
        </svg>
        <div className="admin-wellness-legend">
          <span><b className="rpe" />RPE</span>
          <span><b className="fatigue" />Fatigue</span>
        </div>
        {!points.length && <EmptyState>No wellness trend data yet.</EmptyState>}
      </div>
    </AdminCard>
  )
}

const WellnessBars = ({ rows, players }) => {
  const playerSummaries = players.map((player) => {
    const playerLogs = rows.filter((log) => String(log.player_id) === String(player.id))
    return {
      id: player.id,
      name: player.name,
      avgRpe: average(playerLogs, 'rpe'),
      avgFatigue: average(playerLogs, 'fatigue_level'),
      logs: playerLogs.length,
    }
  }).filter((item) => item.logs)

  const maxValue = Math.max(...playerSummaries.map((item) => Math.max(item.avgRpe, item.avgFatigue)), 10)

  return (
    <AdminCard className="admin-wellness-chart-card">
      <div className="admin-card-header admin-wellness-compact-header">
        <div>
          <h2>Player Load Snapshot</h2>
          <p className="admin-muted">Average RPE and fatigue from player wellness logs.</p>
        </div>
      </div>
      <div className="admin-wellness-bars">
        {playerSummaries.map((item) => (
          <div className="admin-wellness-bar-row" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <small>{item.logs} log{item.logs === 1 ? '' : 's'}</small>
            </div>
            <span className="admin-wellness-bar-track" aria-label={`${item.name} average RPE ${formatAverage(item.avgRpe)}`}>
              <b style={{ width: `${Math.min((item.avgRpe / maxValue) * 100, 100)}%` }} />
            </span>
            <span className="admin-wellness-bar-value">{formatAverage(item.avgRpe)} RPE</span>
            <span className="admin-wellness-bar-track fatigue" aria-label={`${item.name} average fatigue ${formatAverage(item.avgFatigue)}`}>
              <b style={{ width: `${Math.min((item.avgFatigue / maxValue) * 100, 100)}%` }} />
            </span>
            <span className="admin-wellness-bar-value">{formatAverage(item.avgFatigue)} fatigue</span>
          </div>
        ))}
        {!playerSummaries.length && <EmptyState>No player wellness averages yet.</EmptyState>}
      </div>
    </AdminCard>
  )
}

const WellnessLogCard = ({ log, players }) => (
  <article className="admin-wellness-log-card">
    <div className="admin-wellness-log-player">
      <strong>{getName(players, log.player_id)}</strong>
      <small>{formatDate(log.checkin_date || log.created_at)}</small>
    </div>

    <div className="admin-wellness-log-metrics">
      <span>
        <small>Fatigue</small>
        <StatusBadge tone={scoreTone(log.fatigue_level, 6, 8)}>{log.fatigue_level || '-'}</StatusBadge>
      </span>
      <span>
        <small>RPE</small>
        <StatusBadge tone={scoreTone(log.rpe, 7, 9)}>{log.rpe || '-'}</StatusBadge>
      </span>
      <span>
        <small>Sleep</small>
        <strong>{log.sleep_hours ? `${log.sleep_hours}h` : '-'}</strong>
      </span>
      <span>
        <small>Risk</small>
        <StatusBadge tone={riskTone(getRiskLevel(log))}>{getRiskLevel(log)}</StatusBadge>
      </span>
      <span className="admin-wellness-log-injury">
        <small>Injury</small>
        <StatusBadge tone={log.injury ? 'warning' : 'success'}>
          {log.injury ? `${log.injury.body_part} - ${log.injury.severity}` : 'none'}
        </StatusBadge>
      </span>
    </div>
  </article>
)

const InjuryReportCard = ({ injury, players }) => (
  <article className="admin-injury-report-card">
    <div className="admin-injury-report-main">
      <strong>{getName(players, injury.player_id)}</strong>
      <small>{formatDate(injury.occurred_at || injury.created_at)}</small>
      {injury.notes ? <p>{injury.notes}</p> : null}
    </div>

    <div className="admin-injury-report-meta">
      <StatusBadge tone={injury.recovered_at ? 'success' : 'warning'}>
        {injury.recovered_at ? 'Recovered' : 'Active'}
      </StatusBadge>
      <span>
        <small>Body part</small>
        <strong>{injury.body_part || 'other'}</strong>
      </span>
      <span>
        <small>Severity</small>
        <strong>{injury.severity || '-'}</strong>
      </span>
    </div>
  </article>
)

const AdminWellness = ({ currentPath = '#trainer/wellness' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const [logs, setLogs] = useState([])
  const [injuries, setInjuries] = useState([])
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [checkInRows, injuryRows, playerRows, memberRows, trainerLinkRows] = await Promise.all([
      listResource('wellness-checkins', { limit: 500 }),
      listResource('injury-logs', { limit: 500 }),
      listResource('players'),
      isTrainerView ? listResource('team-members', { limit: 100 }) : Promise.resolve([]),
      isTrainerView ? listResource('team-trainers', { limit: 100 }) : Promise.resolve([]),
    ])

    let scopedPlayers = playerRows

    if (isTrainerView) {
      const trainerTeamIds = new Set(
        trainerLinkRows
          .filter((link) => String(link.trainer_id) === String(currentUser?.id))
          .map((link) => String(link.team_id)),
      )
      const scopedPlayerIds = new Set(
        memberRows
          .filter((membership) => trainerTeamIds.has(String(membership.team_id)))
          .map((membership) => String(membership.player_id)),
      )

      scopedPlayers = playerRows.filter((player) => scopedPlayerIds.has(String(player.id)))
    }

    const scopedPlayerIds = new Set(scopedPlayers.map((player) => String(player.id)))
    const scopedInjuries = injuryRows
      .filter((injury) => scopedPlayerIds.has(String(injury.player_id)))
      .sort((a, b) => new Date(b.occurred_at || b.created_at) - new Date(a.occurred_at || a.created_at))
    const injuriesByPlayerDate = new Map(scopedInjuries.map((injury) => [
      `${injury.player_id}-${dateKey(injury.occurred_at || injury.created_at)}`,
      injury,
    ]))
    const wellnessRows = checkInRows
      .filter((log) => scopedPlayerIds.has(String(log.player_id)))
      .map((log) => ({
        ...log,
        injury: injuriesByPlayerDate.get(`${log.player_id}-${dateKey(log.checkin_date)}`) || null,
      }))
      .sort((a, b) => dateKey(b.checkin_date).localeCompare(dateKey(a.checkin_date)))

    setPlayers(scopedPlayers)
    setInjuries(scopedInjuries)
    setLogs(wellnessRows)
  }, [currentUser?.id, isTrainerView])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((err) => setError(err.message))
  }, [load])

  const summary = useMemo(() => {
    const latestByPlayer = players.map((player) => {
      const latestLog = logs.find((log) => String(log.player_id) === String(player.id))
      return latestLog ? { player, log: latestLog, risk: getRiskLevel(latestLog) } : null
    }).filter(Boolean)
    const highRisk = latestByPlayer.filter((item) => item.risk === 'High').length
    const watchRisk = latestByPlayer.filter((item) => item.risk === 'Watch').length

    return {
      latestByPlayer,
      highRisk,
      watchRisk,
      avgRpe: average(logs, 'rpe'),
      avgSleep: average(logs, 'sleep_hours'),
      flaggedInjuries: injuries.filter((injury) => !injury.recovered_at).length,
    }
  }, [injuries, logs, players])

  return (
    <AdminLayout title="Wellness Log" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-stat-grid admin-wellness-metric-grid">
        <WellnessMetric icon={Activity} label="Wellness Logs" value={logs.length} detail={`${summary.latestByPlayer.length}/${players.length} players logged`} />
        <WellnessMetric icon={Zap} label="Average RPE" value={formatAverage(summary.avgRpe)} detail="Player-reported effort" tone="load" />
        <WellnessMetric icon={Moon} label="Average Sleep" value={formatAverage(summary.avgSleep)} detail="Hours from player check-ins" tone="sleep" />
        <WellnessMetric icon={AlertTriangle} label="Risk Flags" value={summary.highRisk + summary.watchRisk} detail={`${summary.flaggedInjuries} injury report${summary.flaggedInjuries === 1 ? '' : 's'}`} tone={summary.highRisk ? 'danger' : 'warning'} />
      </div>

      <div className="admin-wellness-visual-grid">
        <WellnessTrend logs={logs} />
        <WellnessBars rows={logs} players={players} />
      </div>

      <AdminCard className="admin-wellness-section-card">
        <div className="admin-card-header">
          <div>
            <h2>Recovery Check-ins</h2>
            <p className="admin-muted">Review fatigue, RPE, sleep hours, and injury status from player app check-ins.</p>
          </div>
        </div>

        <div className="admin-wellness-roster">
          {summary.latestByPlayer.map(({ player, log, risk }) => (
            <article className="admin-wellness-roster-card" key={player.id}>
              <div>
                <strong>{player.name}</strong>
                <small>{player.position || 'Player'} {player.jersey_number ? `#${player.jersey_number}` : ''}</small>
              </div>
              <StatusBadge tone={riskTone(risk)}>{risk}</StatusBadge>
              <span>RPE {log.rpe || '-'}</span>
              <span><Battery size={14} /> Sleep {log.sleep_hours || '-'}h</span>
            </article>
          ))}
          {!summary.latestByPlayer.length && <EmptyState>No player wellness check-ins yet.</EmptyState>}
        </div>

        <div className="admin-wellness-log-list">
          {logs.map((log) => <WellnessLogCard key={log.id} log={log} players={players} />)}
          {!logs.length && <EmptyState>No wellness logs yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminCard className="admin-wellness-section-card">
        <div className="admin-card-header">
          <div>
            <h2>Injury Reports</h2>
            <p className="admin-muted">Recent player-submitted injury reports from the app.</p>
          </div>
        </div>

        <div className="admin-injury-report-list">
          {injuries.map((injury) => <InjuryReportCard injury={injury} key={injury.id} players={players} />)}
          {!injuries.length && <EmptyState>No injury reports yet.</EmptyState>}
        </div>
      </AdminCard>

    </AdminLayout>
  )
}

export default AdminWellness
