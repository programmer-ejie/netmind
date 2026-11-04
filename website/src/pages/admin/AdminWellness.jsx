import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ChevronLeft, ChevronRight, Moon, Zap } from 'lucide-react'
import AdminLayout, {
  AdminCard,
  AdminSelect,
  EmptyState,
  ListSkeleton,
  StatCardSkeleton,
  StatusBadge,
  TableSkeletonRows,
  formatDate,
  getName,
} from './AdminLayout'
import { listResource, readSavedUser } from '../../lib/api'
import { toLocalDateKey } from '../../lib/dateKeys'

const average = (rows, key) => {
  const values = rows.map((row) => Number(row[key])).filter((value) => Number.isFinite(value) && value > 0)
  if (!values.length) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

const formatAverage = (value) => (value ? value.toFixed(1) : '-')
const WELLNESS_ROWS_PER_PAGE = 4

const dateKey = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return toLocalDateKey(value)
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
  const leftPadding = 82
  const rightPadding = 34
  const chartBottom = height - padding
  const groupWidth = Math.min(42, (width - padding * 2) / Math.max(points.length, 1) * 0.54)
  const barWidth = Math.max(8, groupWidth / 2 - 3)
  const groupInset = groupWidth + 10
  const xFor = (index) => leftPadding + groupInset + (index / Math.max(points.length - 1, 1)) * (width - leftPadding - rightPadding - groupInset * 2)
  const yFor = (value) => height - padding - (Math.min(value, 10) / 10) * (height - padding * 2)
  const latest = points[points.length - 1]

  return (
    <AdminCard className="admin-wellness-chart-card">
      <div className="admin-card-header admin-wellness-compact-header">
        <div>
          <h2>Recent Recovery Trend</h2>
          <p className="admin-muted">Latest player entries across RPE and fatigue.</p>
        </div>
        {latest && (
          <div className="admin-wellness-chart-kpis">
            <span><small>RPE</small><strong>{latest.rpe || '-'}</strong></span>
            <span><small>Fatigue</small><strong>{latest.fatigue || '-'}</strong></span>
          </div>
        )}
      </div>
      <div className="admin-wellness-trend">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recent wellness trend chart">
          <defs>
            <linearGradient id="wellnessRpeBar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#32d9ea" />
              <stop offset="100%" stopColor="var(--admin-primary)" />
            </linearGradient>
            <linearGradient id="wellnessFatigueBar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffc34d" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="wellnessGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[2, 4, 6, 8, 10].map((tick) => (
            <g key={tick}>
              <line className="admin-wellness-grid-line" x1={leftPadding} x2={width - rightPadding} y1={yFor(tick)} y2={yFor(tick)} />
              <text className="admin-wellness-y-label" x={leftPadding - 18} y={yFor(tick) + 4}>{tick}</text>
            </g>
          ))}
          {points.map((point, index) => (
            <g key={point.id}>
              <rect
                className="admin-wellness-bar rpe"
                x={xFor(index) - barWidth - 2}
                y={yFor(point.rpe)}
                width={barWidth}
                height={Math.max(2, chartBottom - yFor(point.rpe))}
                rx="4"
              />
              <rect
                className="admin-wellness-bar fatigue"
                x={xFor(index) + 2}
                y={yFor(point.fatigue)}
                width={barWidth}
                height={Math.max(2, chartBottom - yFor(point.fatigue))}
                rx="4"
              />
              <text className="admin-wellness-bar-label rpe-label" x={xFor(index) - barWidth / 2 - 2} y={yFor(point.rpe) - 7}>{point.rpe || ''}</text>
              <text className="admin-wellness-bar-label fatigue-label" x={xFor(index) + barWidth / 2 + 2} y={yFor(point.fatigue) - 7}>{point.fatigue || ''}</text>
              <text className="admin-wellness-date-label" x={xFor(index)} y={height - 7}>{point.label.replace(/,\s*\d{4}$/, '')}</text>
              <title>{`${point.label}: RPE ${point.rpe || '-'}, fatigue ${point.fatigue || '-'}`}</title>
            </g>
          ))}
          <line className="admin-wellness-axis" x1={leftPadding} x2={width - rightPadding} y1={chartBottom} y2={chartBottom} />
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

const AdminWellness = ({ currentPath = '#trainer/wellness' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const [logs, setLogs] = useState([])
  const [injuries, setInjuries] = useState([])
  const [players, setPlayers] = useState([])
  const [targetPlayerId, setTargetPlayerId] = useState('')
  const [error, setError] = useState('')
  const [checkinsPage, setCheckinsPage] = useState(1)
  const [injuriesPage, setInjuriesPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
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
    setLoading(false)
  }, [currentUser?.id, isTrainerView])

  useEffect(() => {
    load().catch((err) => {
      setError(err.message)
      setLoading(false)
    })
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

  const tableLogs = useMemo(() => (
    targetPlayerId
      ? logs.filter((log) => String(log.player_id) === String(targetPlayerId))
      : logs
  ), [logs, targetPlayerId])
  const totalCheckinsPages = Math.max(1, Math.ceil(tableLogs.length / WELLNESS_ROWS_PER_PAGE))
  const visibleTableLogs = useMemo(() => {
    const start = (checkinsPage - 1) * WELLNESS_ROWS_PER_PAGE
    return tableLogs.slice(start, start + WELLNESS_ROWS_PER_PAGE)
  }, [checkinsPage, tableLogs])
  const totalInjuryPages = Math.max(1, Math.ceil(injuries.length / WELLNESS_ROWS_PER_PAGE))
  const visibleInjuries = useMemo(() => {
    const start = (injuriesPage - 1) * WELLNESS_ROWS_PER_PAGE
    return injuries.slice(start, start + WELLNESS_ROWS_PER_PAGE)
  }, [injuries, injuriesPage])

  useEffect(() => {
    setCheckinsPage(1)
  }, [targetPlayerId])

  useEffect(() => {
    setCheckinsPage((current) => Math.min(Math.max(current, 1), totalCheckinsPages))
  }, [totalCheckinsPages])

  useEffect(() => {
    setInjuriesPage((current) => Math.min(Math.max(current, 1), totalInjuryPages))
  }, [totalInjuryPages])

  return (
    <AdminLayout title="Wellness Log" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-stat-grid admin-wellness-metric-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={`wellness-stat-skeleton-${index}`} />)
        ) : (
          <>
            <WellnessMetric icon={Activity} label="Wellness Logs" value={logs.length} detail={`${summary.latestByPlayer.length}/${players.length} players logged`} />
            <WellnessMetric icon={Zap} label="Average RPE" value={formatAverage(summary.avgRpe)} detail="Player-reported effort" tone="load" />
            <WellnessMetric icon={Moon} label="Average Sleep" value={formatAverage(summary.avgSleep)} detail="Hours from player check-ins" tone="sleep" />
            <WellnessMetric icon={AlertTriangle} label="Risk Flags" value={summary.highRisk + summary.watchRisk} detail={`${summary.flaggedInjuries} injury report${summary.flaggedInjuries === 1 ? '' : 's'}`} tone={summary.highRisk ? 'danger' : 'warning'} />
          </>
        )}
      </div>

      <div className="admin-wellness-visual-grid">
        {loading ? (
          <AdminCard className="admin-wellness-chart-card">
            <ListSkeleton rows={6} />
          </AdminCard>
        ) : (
          <WellnessTrend logs={logs} />
        )}
      </div>

      <AdminCard className="admin-wellness-section-card">
        <div className="admin-card-header admin-wellness-table-header">
          <div>
            <h2>Recovery Check-ins</h2>
            <p className="admin-muted">Review fatigue, RPE, sleep hours, and injury status from player app check-ins.</p>
          </div>
          <label className="admin-wellness-player-filter">
            <span>Target player</span>
            <AdminSelect value={targetPlayerId} onChange={(event) => setTargetPlayerId(event.target.value)}>
              <option value="">All players</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </AdminSelect>
          </label>
        </div>

        <div className="admin-table admin-wellness-checkin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Player</th>
                <th>Fatigue</th>
                <th>RPE</th>
                <th>Sleep</th>
                <th>Risk</th>
                <th>Injury</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows rows={4} columns={7} />
              ) : visibleTableLogs.map((log) => {
                const risk = getRiskLevel(log)

                return (
                  <tr key={log.id}>
                    <td>{formatDate(log.checkin_date || log.created_at)}</td>
                    <td>
                      <strong>{getName(players, log.player_id)}</strong>
                      <small className="admin-block-muted">Wellness check-in</small>
                    </td>
                    <td><StatusBadge tone={scoreTone(log.fatigue_level, 6, 8)}>{log.fatigue_level || '-'}</StatusBadge></td>
                    <td><StatusBadge tone={scoreTone(log.rpe, 7, 9)}>{log.rpe || '-'}</StatusBadge></td>
                    <td>{log.sleep_hours ? `${log.sleep_hours}h` : '-'}</td>
                    <td><StatusBadge tone={riskTone(risk)}>{risk}</StatusBadge></td>
                    <td>
                      <StatusBadge tone={log.injury ? 'warning' : 'success'}>
                        {log.injury ? `${log.injury.body_part} - ${log.injury.severity}` : 'none'}
                      </StatusBadge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && !tableLogs.length && <EmptyState>No wellness logs for this player yet.</EmptyState>}
          {!loading && <div className="admin-pagination" aria-label="Recovery check-ins pagination">
            <button
              type="button"
              className="admin-pagination-button"
              aria-label="Previous recovery check-ins page"
              disabled={checkinsPage <= 1}
              onClick={() => setCheckinsPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={17} />
            </button>
            <span>Page {checkinsPage} of {totalCheckinsPages}</span>
            <button
              type="button"
              className="admin-pagination-button"
              aria-label="Next recovery check-ins page"
              disabled={checkinsPage >= totalCheckinsPages}
              onClick={() => setCheckinsPage((current) => Math.min(totalCheckinsPages, current + 1))}
            >
              <ChevronRight size={17} />
            </button>
          </div>}
        </div>
      </AdminCard>

      <AdminCard className="admin-wellness-section-card">
        <div className="admin-card-header">
          <div>
            <h2>Injury Reports</h2>
            <p className="admin-muted">Recent player-submitted injury reports from the app.</p>
          </div>
        </div>

        <div className="admin-table admin-injury-report-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Player</th>
                <th>Status</th>
                <th>Body Part</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows rows={4} columns={5} />
              ) : visibleInjuries.map((injury) => (
                <tr key={injury.id}>
                  <td>{formatDate(injury.occurred_at || injury.created_at)}</td>
                  <td>
                    <strong>{getName(players, injury.player_id)}</strong>
                    <small className="admin-block-muted">Injury report</small>
                  </td>
                  <td>
                    <StatusBadge tone={injury.recovered_at ? 'success' : 'warning'}>
                      {injury.recovered_at ? 'Recovered' : 'Active'}
                    </StatusBadge>
                  </td>
                  <td>{injury.body_part || 'other'}</td>
                  <td>{injury.severity || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !injuries.length && <EmptyState>No injury reports yet.</EmptyState>}
          {!loading && <div className="admin-pagination" aria-label="Injury reports pagination">
            <button
              type="button"
              className="admin-pagination-button"
              aria-label="Previous injury reports page"
              disabled={injuriesPage <= 1}
              onClick={() => setInjuriesPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={17} />
            </button>
            <span>Page {injuriesPage} of {totalInjuryPages}</span>
            <button
              type="button"
              className="admin-pagination-button"
              aria-label="Next injury reports page"
              disabled={injuriesPage >= totalInjuryPages}
              onClick={() => setInjuriesPage((current) => Math.min(totalInjuryPages, current + 1))}
            >
              <ChevronRight size={17} />
            </button>
          </div>}
        </div>
      </AdminCard>

    </AdminLayout>
  )
}

export default AdminWellness
