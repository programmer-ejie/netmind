import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Battery, Moon, Plus, Zap } from 'lucide-react'
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
} from './AdminLayout'
import { createResource, listResource, readSavedUser } from '../../lib/api'

const sessionTypes = ['training', 'conditioning', 'match']
const injuryStatuses = ['none', 'minor', 'moderate', 'injured']
const wellnessFields = ['fatigue_level', 'rpe', 'sleep_quality', 'energy_level']

const blankLog = {
  user_id: '',
  session_type: 'training',
  fatigue_level: '',
  rpe: '',
  sleep_quality: '',
  energy_level: '',
  injury_status: 'none',
}

const hasValue = (value) => value !== null && value !== undefined && value !== ''

const isWellnessLog = (log) => (
  wellnessFields.some((field) => hasValue(log[field]))
  || (hasValue(log.injury_status) && log.injury_status !== 'none')
)

const average = (rows, key) => {
  const values = rows.map((row) => Number(row[key])).filter((value) => Number.isFinite(value) && value > 0)
  if (!values.length) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

const formatAverage = (value) => (value ? value.toFixed(1) : '-')

const scoreTone = (value, warningAt, dangerAt) => {
  const score = Number(value) || 0
  if (score >= dangerAt) return 'error'
  if (score >= warningAt) return 'warning'
  return 'success'
}

const getRiskLevel = (log) => {
  const fatigue = Number(log.fatigue_level) || 0
  const rpe = Number(log.rpe) || 0
  const sleep = Number(log.sleep_quality) || 0
  const energy = Number(log.energy_level) || 0
  const injury = log.injury_status && log.injury_status !== 'none'

  if (injury || fatigue >= 5 || rpe >= 9 || sleep <= 2 || energy <= 2) return 'High'
  if (fatigue >= 4 || rpe >= 7 || sleep === 3 || energy === 3) return 'Watch'
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
      fatigue: (Number(log.fatigue_level) || 0) * 2,
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
              <title>{`${point.label}: RPE ${point.rpe || '-'}, fatigue ${point.fatigue ? point.fatigue / 2 : '-'}`}</title>
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
    const playerLogs = rows.filter((log) => String(log.user_id) === String(player.id))
    return {
      id: player.id,
      name: player.name,
      avgRpe: average(playerLogs, 'rpe'),
      avgFatigue: average(playerLogs, 'fatigue_level'),
      logs: playerLogs.length,
    }
  }).filter((item) => item.logs)

  const maxValue = Math.max(...playerSummaries.map((item) => Math.max(item.avgRpe, item.avgFatigue * 2)), 10)

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
              <b style={{ width: `${Math.min(((item.avgFatigue * 2) / maxValue) * 100, 100)}%` }} />
            </span>
            <span className="admin-wellness-bar-value">{formatAverage(item.avgFatigue)} fatigue</span>
          </div>
        ))}
        {!playerSummaries.length && <EmptyState>No player wellness averages yet.</EmptyState>}
      </div>
    </AdminCard>
  )
}

const AdminWellness = ({ currentPath = '#trainer/wellness' }) => {
  const currentUser = readSavedUser()
  const isTrainerView = currentUser?.role === 'trainer'
  const [logs, setLogs] = useState([])
  const [players, setPlayers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(blankLog)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [logRows, playerRows, memberRows, trainerLinkRows] = await Promise.all([
      listResource('performance-logs', { limit: 100, sortBy: 'created_at' }),
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
    const wellnessRows = logRows
      .filter((log) => scopedPlayerIds.has(String(log.user_id)) && isWellnessLog(log))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setPlayers(scopedPlayers)
    setLogs(wellnessRows)
  }, [currentUser?.id, isTrainerView])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((err) => setError(err.message))
  }, [load])

  const openCreate = () => {
    setForm(blankLog)
    setModalOpen(true)
  }

  const saveLog = async (event) => {
    event.preventDefault()

    try {
      await createResource('performance-logs', {
        user_id: form.user_id,
        session_type: form.session_type,
        action_type: 'wellness',
        result: 'normal',
        minutes_played: 0,
        fatigue_level: form.fatigue_level ? Number(form.fatigue_level) : null,
        rpe: form.rpe ? Number(form.rpe) : null,
        sleep_quality: form.sleep_quality ? Number(form.sleep_quality) : null,
        energy_level: form.energy_level ? Number(form.energy_level) : null,
        injury_status: form.injury_status,
      })
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const summary = useMemo(() => {
    const latestByPlayer = players.map((player) => {
      const latestLog = logs.find((log) => String(log.user_id) === String(player.id))
      return latestLog ? { player, log: latestLog, risk: getRiskLevel(latestLog) } : null
    }).filter(Boolean)
    const highRisk = latestByPlayer.filter((item) => item.risk === 'High').length
    const watchRisk = latestByPlayer.filter((item) => item.risk === 'Watch').length

    return {
      latestByPlayer,
      highRisk,
      watchRisk,
      avgRpe: average(logs, 'rpe'),
      avgSleep: average(logs, 'sleep_quality'),
      flaggedInjuries: logs.filter((log) => log.injury_status && log.injury_status !== 'none').length,
    }
  }, [logs, players])

  return (
    <AdminLayout title="Wellness Log" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-stat-grid admin-wellness-metric-grid">
        <WellnessMetric icon={Activity} label="Wellness Logs" value={logs.length} detail={`${summary.latestByPlayer.length}/${players.length} players logged`} />
        <WellnessMetric icon={Zap} label="Average RPE" value={formatAverage(summary.avgRpe)} detail="Player-reported effort" tone="load" />
        <WellnessMetric icon={Moon} label="Average Sleep" value={formatAverage(summary.avgSleep)} detail="Sleep quality score" tone="sleep" />
        <WellnessMetric icon={AlertTriangle} label="Risk Flags" value={summary.highRisk + summary.watchRisk} detail={`${summary.flaggedInjuries} injury report${summary.flaggedInjuries === 1 ? '' : 's'}`} tone={summary.highRisk ? 'danger' : 'warning'} />
      </div>

      <div className="admin-wellness-visual-grid">
        <WellnessTrend logs={logs} />
        <WellnessBars rows={logs} players={players} />
      </div>

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>Recovery Check-ins</h2>
            <p className="admin-muted">Review fatigue, RPE, sleep, energy, and injury status from player wellness logs.</p>
          </div>
          {!isTrainerView && (
            <AdminButton onClick={openCreate}>
              <Plus size={17} />
              Add Wellness Log
            </AdminButton>
          )}
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
              <span><Battery size={14} /> Energy {log.energy_level || '-'}</span>
            </article>
          ))}
          {!summary.latestByPlayer.length && <EmptyState>No player wellness check-ins yet.</EmptyState>}
        </div>

        <div className="admin-table admin-wellness-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Session</th>
                <th>Fatigue</th>
                <th>RPE</th>
                <th>Sleep</th>
                <th>Energy</th>
                <th>Risk</th>
                <th>Injury</th>
                <th>Logged</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{getName(players, log.user_id)}</td>
                  <td>{log.session_type || '-'}</td>
                  <td><StatusBadge tone={scoreTone(log.fatigue_level, 4, 5)}>{log.fatigue_level || '-'}</StatusBadge></td>
                  <td><StatusBadge tone={scoreTone(log.rpe, 7, 9)}>{log.rpe || '-'}</StatusBadge></td>
                  <td>{log.sleep_quality || '-'}</td>
                  <td>{log.energy_level || '-'}</td>
                  <td><StatusBadge tone={riskTone(getRiskLevel(log))}>{getRiskLevel(log)}</StatusBadge></td>
                  <td>
                    <StatusBadge tone={log.injury_status && log.injury_status !== 'none' ? 'warning' : 'success'}>
                      {log.injury_status || 'none'}
                    </StatusBadge>
                  </td>
                  <td>{formatDate(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <EmptyState>No wellness logs yet.</EmptyState>}
        </div>
      </AdminCard>

      <AdminModal open={modalOpen} title="Add Wellness Log" onClose={() => setModalOpen(false)}>
        <form className="admin-form admin-form-grid" onSubmit={saveLog}>
          <AdminField label="Player">
            <AdminSelect required value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}>
              <option value="">Select player</option>
              {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Session">
            <AdminSelect value={form.session_type} onChange={(event) => setForm((current) => ({ ...current, session_type: event.target.value }))}>
              {sessionTypes.map((type) => <option key={type}>{type}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Fatigue (1-5)">
            <AdminInput required type="number" min="1" max="5" value={form.fatigue_level} onChange={(event) => setForm((current) => ({ ...current, fatigue_level: event.target.value }))} />
          </AdminField>
          <AdminField label="RPE (1-10)">
            <AdminInput required type="number" min="1" max="10" value={form.rpe} onChange={(event) => setForm((current) => ({ ...current, rpe: event.target.value }))} />
          </AdminField>
          <AdminField label="Sleep Quality (1-5)">
            <AdminInput type="number" min="1" max="5" value={form.sleep_quality} onChange={(event) => setForm((current) => ({ ...current, sleep_quality: event.target.value }))} />
          </AdminField>
          <AdminField label="Energy (1-5)">
            <AdminInput type="number" min="1" max="5" value={form.energy_level} onChange={(event) => setForm((current) => ({ ...current, energy_level: event.target.value }))} />
          </AdminField>
          <AdminField label="Injury Status">
            <AdminSelect value={form.injury_status} onChange={(event) => setForm((current) => ({ ...current, injury_status: event.target.value }))}>
              {injuryStatuses.map((status) => <option key={status}>{status}</option>)}
            </AdminSelect>
          </AdminField>
          <div className="admin-form-actions admin-form-span">
            <AdminButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Save Wellness Log</AdminButton>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  )
}

export default AdminWellness
