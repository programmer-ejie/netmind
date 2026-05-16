import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Lock, Minus, MousePointerClick, Plus, Swords, Trophy, UsersRound, X } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  EmptyState,
  formatDate,
  getName,
  initials,
} from './AdminLayout'
import { API_BASE, apiRequest, createResource, deleteResource, getResource, listResource, readSavedUser, updateResource } from '../../lib/api'

const matchStatInputs = [
  { id: 1, label: 'Kill', description: 'Spike Score', action_type: 'spike', result: 'kill' },
  { id: 2, label: 'Stuff Block', description: 'Block Score', action_type: 'block', result: 'stuff' },
  { id: 3, label: 'Ace', description: 'Serve Score', action_type: 'serve', result: 'ace' },
  { id: 4, label: 'Error', description: 'Any mistake', action_type: 'spike', result: 'error' },
  { id: 5, label: 'Dig', description: 'Saved a spike', action_type: 'dig', result: 'good' },
  { id: 6, label: 'Assist', description: 'Set to Kill', action_type: 'set', result: 'assist' },
  { id: 7, label: 'Perfect Pass', description: 'Clean receive', action_type: 'receive', result: 'perfect' },
]

const statKey = ({ action_type, result }) => `${action_type}:${result}`
const statByKey = Object.fromEntries(matchStatInputs.map((item) => [statKey(item), item]))
const bestOfLabels = {
  1: 'Best of One',
  3: 'Best of Three',
  5: 'Best of Five',
}

const getTeamLogoSrc = (team) => (
  team?.team_logo_file_id ? `${API_BASE}/team-logos/${team.team_logo_file_id}` : team?.logo_url
)

const buildStatsFromLogs = (logs, currentMatchId) => {
  const nextStats = {}
  const nextLogIds = {}

  logs.forEach((log) => {
    const stat = statByKey[statKey(log)]
    if (!stat) return

    const playerId = String(log.user_id)
    nextStats[playerId] = {
      ...(nextStats[playerId] || {}),
      [stat.label]: Number(nextStats[playerId]?.[stat.label] || 0) + Number(log.value || 1),
    }
    nextLogIds[playerId] = {
      ...(nextLogIds[playerId] || {}),
      [stat.label]: [...(nextLogIds[playerId]?.[stat.label] || []), log.id],
    }
  })

  return {
    stats: { [currentMatchId]: nextStats },
    logIds: { [currentMatchId]: nextLogIds },
  }
}

const isScoreComplete = (score) => (
  score?.team_score !== null && score?.team_score !== undefined
  && score?.opponent_score !== null && score?.opponent_score !== undefined
)

const getScoreWinner = (score) => {
  if (!isScoreComplete(score)) return null
  if (Number(score.team_score) > Number(score.opponent_score)) return 'team'
  if (Number(score.team_score) < Number(score.opponent_score)) return 'opponent'
  return 'draw'
}

const AdminMatchInputs = ({ matchId, matchNumber, currentPath = `#coach/matches/${matchId}/inputs` }) => {
  const currentUser = readSavedUser()
  const selectedMatchNumber = Number(matchNumber) || 0
  const [match, setMatch] = useState(null)
  const [teams, setTeams] = useState([])
  const [teamRosters, setTeamRosters] = useState({})
  const [matchScores, setMatchScores] = useState([])
  const [statsByMatch, setStatsByMatch] = useState({})
  const [statLogIdsByMatch, setStatLogIdsByMatch] = useState({})
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [savingStat, setSavingStat] = useState('')
  const [scoreOpen, setScoreOpen] = useState(false)
  const [scoreConfirmOpen, setScoreConfirmOpen] = useState(false)
  const [scoreForm, setScoreForm] = useState({ team_score: '', opponent_score: '' })
  const [savingScore, setSavingScore] = useState(false)
  const [error, setError] = useState('')

  const stats = statsByMatch[matchId] || {}
  const selectedPlayerStats = selectedPlayer ? stats[selectedPlayer.player_id] || {} : {}
  const matchTitle = match ? `${getName(teams, match.team_id)} VS ${match.opponent_name}` : 'Match Inputs'
  const bestOf = Number(match?.best_of || 1)
  const hasValidMatchNumber = selectedMatchNumber >= 1 && selectedMatchNumber <= bestOf
  const needsMatchNumber = bestOf > 1 && !hasValidMatchNumber
  const matchNumberLabel = hasValidMatchNumber ? `Match ${selectedMatchNumber}` : ''
  const selectedScoreNumber = hasValidMatchNumber ? selectedMatchNumber : 1
  const currentMatchScore = matchScores.find((score) => Number(score.match_number) === selectedScoreNumber)
  const teamOne = match ? teams.find((team) => String(team.id) === String(match.team_id)) : null
  const teamTwo = match ? teams.find((team) => team.team_name === match.opponent_name) : null
  const canScoreTeamOne = String(teamOne?.coach_id) === String(currentUser?.id)
  const canScoreTeamTwo = String(teamTwo?.coach_id) === String(currentUser?.id)
  const visibleRosterTeams = useMemo(() => {
    if (!match) return []

    return [
      teamOne
        ? { ...teamOne, label: 'Team 1', canInput: String(teamOne.coach_id) === String(currentUser?.id) }
        : null,
      teamTwo
        ? { ...teamTwo, label: 'Team 2', canInput: String(teamTwo.coach_id) === String(currentUser?.id) }
      : null,
    ].filter(Boolean)
  }, [currentUser?.id, match, teamOne, teamTwo])
  const totalPlayers = visibleRosterTeams.reduce((sum, team) => sum + (teamRosters[team.id] || []).length, 0)
  const matchScoreByNumber = useMemo(() => (
    Object.fromEntries(matchScores.map((score) => [Number(score.match_number), score]))
  ), [matchScores])
  const winsNeeded = Math.floor(bestOf / 2) + 1
  const getSeriesLeaderBefore = (number) => {
    const wins = { team: 0, opponent: 0 }

    for (let index = 1; index < number; index += 1) {
      const winner = getScoreWinner(matchScoreByNumber[index])
      if (winner === 'team' || winner === 'opponent') wins[winner] += 1
    }

    return wins.team >= winsNeeded ? 'team' : wins.opponent >= winsNeeded ? 'opponent' : null
  }
  const allPreviousScored = (number) => (
    Array.from({ length: number - 1 }, (_, index) => index + 1)
      .every((item) => isScoreComplete(matchScoreByNumber[item]))
  )
  const matchNumberCards = useMemo(() => {
    if (bestOf <= 1) return []

    return Array.from({ length: bestOf }, (_, index) => index + 1)
      .map((number) => {
        const score = matchScoreByNumber[number]
        const seriesWinnerBefore = getSeriesLeaderBefore(number)
        if (seriesWinnerBefore) return null

        if (number === 1) return { number, state: isScoreComplete(score) ? 'scored' : 'open', score }
        if (number === 2) return { number, state: isScoreComplete(score) ? 'scored' : isScoreComplete(matchScoreByNumber[1]) ? 'open' : 'locked', score }
        return { number, state: isScoreComplete(score) ? 'scored' : allPreviousScored(number) ? 'open' : 'waiting', score }
      })
      .filter(Boolean)
  }, [bestOf, matchScoreByNumber])

  useEffect(() => {
    const load = async () => {
      const [matchRow, teamRows] = await Promise.all([
        getResource('matches', matchId),
        listResource('teams', { limit: 100 }),
      ])
      const scoreRows = await listResource('match-scores', { match_id: matchId, limit: 100, sortBy: 'match_number', sortDir: 'asc' })
      const teamOne = teamRows.find((team) => String(team.id) === String(matchRow.team_id))
      const teamTwo = teamRows.find((team) => team.team_name === matchRow.opponent_name)
      const rosterTeams = [teamOne, teamTwo].filter(Boolean)
      const rosterRows = await Promise.all(
        rosterTeams.map(async (team) => [team.id, await apiRequest(`/teams/${team.id}/members`)]),
      )
      const loadedBestOf = Number(matchRow.best_of || 1)
      const selectedNumber = Number(matchNumber) || (loadedBestOf > 1 ? 0 : 1)
      const performanceLogs = selectedNumber
        ? await apiRequest(`/matches/${matchId}/performance-logs?match_number=${selectedNumber}`)
        : []
      const { stats: loadedStats, logIds } = buildStatsFromLogs(performanceLogs, matchId)

      setMatch(matchRow)
      setTeams(teamRows)
      setMatchScores(scoreRows)
      setTeamRosters(Object.fromEntries(rosterRows))
      setStatsByMatch(loadedStats)
      setStatLogIdsByMatch(logIds)
    }

    load().catch((err) => setError(err.message))
  }, [currentUser?.id, matchId, matchNumber])

  useEffect(() => {
    const missingTeams = visibleRosterTeams.filter((team) => team.id && !teamRosters[team.id])
    if (!missingTeams.length) return

    let alive = true

    Promise.all(
      missingTeams.map(async (team) => [team.id, await apiRequest(`/teams/${team.id}/members`)]),
    )
      .then((rows) => {
        if (!alive) return
        setTeamRosters((current) => ({
          ...current,
          ...Object.fromEntries(rows),
        }))
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })

    return () => {
      alive = false
    }
  }, [teamRosters, visibleRosterTeams])

  const increaseStat = async (stat) => {
    if (!selectedPlayer) return
    const statLabel = stat.label
    const playerId = String(selectedPlayer.player_id)

    setStatsByMatch((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] || {}),
        [playerId]: {
          ...(current[matchId]?.[playerId] || {}),
          [statLabel]: Number(current[matchId]?.[playerId]?.[statLabel] || 0) + 1,
        },
      },
    }))

    try {
      setSavingStat(`${playerId}:${statLabel}`)
      const log = await apiRequest(`/players/${playerId}/performance-logs`, {
        method: 'POST',
        body: {
          session_type: 'match',
          match_id: matchId,
          match_number: selectedMatchNumber || 1,
          season_id: match?.season_id || null,
          action_type: stat.action_type,
          result: stat.result,
          value: 1,
        },
      })
      setStatLogIdsByMatch((current) => ({
        ...current,
        [matchId]: {
          ...(current[matchId] || {}),
          [playerId]: {
            ...(current[matchId]?.[playerId] || {}),
            [statLabel]: [...(current[matchId]?.[playerId]?.[statLabel] || []), log.id],
          },
        },
      }))
    } catch (err) {
      setError(err.message)
      setStatsByMatch((current) => ({
        ...current,
        [matchId]: {
          ...(current[matchId] || {}),
          [playerId]: {
            ...(current[matchId]?.[playerId] || {}),
            [statLabel]: Math.max(0, Number(current[matchId]?.[playerId]?.[statLabel] || 0) - 1),
          },
        },
      }))
    } finally {
      setSavingStat('')
    }
  }

  const decreaseStat = async (statLabel) => {
    if (!selectedPlayer) return
    const playerId = String(selectedPlayer.player_id)
    const currentValue = Number(statsByMatch[matchId]?.[playerId]?.[statLabel] || 0)
    const logIds = statLogIdsByMatch[matchId]?.[playerId]?.[statLabel] || []
    const logId = logIds[logIds.length - 1]

    if (!currentValue || !logId) return

    setStatsByMatch((current) => {
      const value = Number(current[matchId]?.[playerId]?.[statLabel] || 0)

      return {
        ...current,
        [matchId]: {
          ...(current[matchId] || {}),
          [playerId]: {
            ...(current[matchId]?.[playerId] || {}),
            [statLabel]: Math.max(0, value - 1),
          },
        },
      }
    })

    try {
      setSavingStat(`${playerId}:${statLabel}`)
      await deleteResource('performance-logs', logId)
      setStatLogIdsByMatch((current) => ({
        ...current,
        [matchId]: {
          ...(current[matchId] || {}),
          [playerId]: {
            ...(current[matchId]?.[playerId] || {}),
            [statLabel]: (current[matchId]?.[playerId]?.[statLabel] || []).slice(0, -1),
          },
        },
      }))
    } catch (err) {
      setError(err.message)
      setStatsByMatch((current) => ({
        ...current,
        [matchId]: {
          ...(current[matchId] || {}),
          [playerId]: {
            ...(current[matchId]?.[playerId] || {}),
            [statLabel]: Number(current[matchId]?.[playerId]?.[statLabel] || 0) + 1,
          },
        },
      }))
    } finally {
      setSavingStat('')
    }
  }

  const openScore = () => {
    setScoreForm({
      team_score: currentMatchScore?.team_score ?? match?.team_score ?? '',
      opponent_score: currentMatchScore?.opponent_score ?? match?.opponent_score ?? '',
    })
    setScoreOpen(true)
  }

  const requestScoreConfirmation = (event) => {
    event.preventDefault()
    if (!match || (!canScoreTeamOne && !canScoreTeamTwo)) return
    setScoreConfirmOpen(true)
  }

  const saveScore = async () => {
    if (!match || (!canScoreTeamOne && !canScoreTeamTwo)) return
    const payload = {
      match_id: match.id,
      match_number: selectedScoreNumber,
      ...(canScoreTeamOne ? { team_score: scoreForm.team_score === '' ? null : Number(scoreForm.team_score) } : {}),
      ...(canScoreTeamTwo ? { opponent_score: scoreForm.opponent_score === '' ? null : Number(scoreForm.opponent_score) } : {}),
    }

    try {
      setSavingScore(true)
      const nextTeamScore = payload.team_score ?? currentMatchScore?.team_score ?? null
      const nextOpponentScore = payload.opponent_score ?? currentMatchScore?.opponent_score ?? null
      const result = nextTeamScore === null || nextOpponentScore === null
        ? null
        : nextTeamScore > nextOpponentScore
          ? 'win'
          : nextTeamScore < nextOpponentScore
            ? 'loss'
            : 'draw'
      const scorePayload = { ...payload, result }
      const updated = currentMatchScore
        ? await updateResource('match-scores', currentMatchScore.id, scorePayload)
        : await createResource('match-scores', scorePayload)

      setMatchScores((current) => [
        ...current.filter((score) => Number(score.match_number) !== selectedScoreNumber),
        updated,
      ].sort((a, b) => Number(a.match_number) - Number(b.match_number)))

      if (bestOf <= 1) {
        setMatch(await updateResource('matches', match.id, {
          team_score: nextTeamScore,
          opponent_score: nextOpponentScore,
          result,
        }))
      }
      setScoreConfirmOpen(false)
      setScoreOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingScore(false)
    }
  }

  return (
    <AdminLayout title="Match Inputs" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <AdminCard className="admin-match-input-hero">
        <div className="admin-match-input-hero-inner">
          <div className="admin-match-input-main">
            <button
              type="button"
              className="admin-team-back"
              onClick={() => {
                window.location.hash = bestOf > 1 && hasValidMatchNumber ? `coach/matches/${matchId}/sets` : 'coach/matches'
              }}
              aria-label="Back to matches"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="admin-match-input-icon"><Swords size={22} /></span>
            <div>
              <p className="admin-kicker">
                {match?.match_type === 'friendly' ? 'Practice Input Sheet' : 'Match Input Sheet'}
              </p>
              <h2>{matchTitle}</h2>
              <small>
                {match
                  ? `${formatDate(match.match_date)} - ${match.match_type}${matchNumberLabel ? ` - ${matchNumberLabel}` : ''}`
                  : 'Loading match details...'}
              </small>
            </div>
          </div>
          <div className="admin-match-input-summary">
            <span>
              <UsersRound size={17} />
              {totalPlayers} players
            </span>
            {!needsMatchNumber && (
              <AdminButton type="button" onClick={openScore}>
                <Trophy size={16} />
                {isScoreComplete(currentMatchScore) ? 'View' : 'Score'}
              </AdminButton>
            )}
          </div>
        </div>
      </AdminCard>

      {needsMatchNumber && (
        <AdminCard className="admin-match-number-card">
          <div className="admin-match-number-header">
            <p className="admin-kicker">{bestOfLabels[bestOf] || `Best of ${bestOf}`}</p>
            <h2>Choose Match Number</h2>
            <p className="admin-muted">Select which numbered input sheet you want to record for this match.</p>
          </div>
          <div className="admin-match-number-grid">
            {matchNumberCards.map(({ number, state, score }) => (
              <button
                type="button"
                className={`admin-match-number-option ${state}`}
                key={number}
                aria-disabled={state !== 'open' && state !== 'scored'}
                title={state === 'locked' ? 'Need to score the first match first.' : state === 'waiting' ? 'Waiting for decision.' : ''}
                onClick={() => {
                  if (state !== 'open' && state !== 'scored') return
                  window.location.hash = `coach/matches/${matchId}/inputs/${number}`
                }}
              >
                <span className="admin-match-number-status">
                  {state === 'open' && 'Ready'}
                  {state === 'scored' && 'Scored'}
                  {state === 'locked' && 'Locked'}
                  {state === 'waiting' && 'Pending'}
                </span>
                <b>
                  {state === 'locked' ? <Lock size={21} /> : number}
                </b>
                <span className="admin-match-number-title">Match {number}</span>
                {isScoreComplete(score) && (
                  <small>{score.team_score} - {score.opponent_score}</small>
                )}
                {state === 'locked' && <em>Need to score Match 1 first</em>}
                {state === 'waiting' && <em>Waiting for decision</em>}
              </button>
            ))}
          </div>
        </AdminCard>
      )}

      {!needsMatchNumber && visibleRosterTeams.length > 0 && (
        <div className={`admin-match-roster-grid ${visibleRosterTeams.length === 2 ? 'has-versus' : ''}`}>
          {visibleRosterTeams.map((team) => {
            const players = teamRosters[team.id] || []

            return (
              <AdminCard
                className={`admin-match-roster-card ${team.canInput ? 'can-input' : 'view-only'}`}
                key={`${team.label}-${team.id}`}
                style={{ '--team-accent': team.team_color || '#12aabd' }}
              >
                <div className="admin-card-header admin-match-roster-header">
                  <div>
                    <p className="admin-kicker">{team.label}</p>
                    <h2>{team.team_name}</h2>
                    <p className="admin-muted">
                      {team.canInput
                        ? `${players.length} players available for input tracking.`
                        : `${players.length} players - opponent view only.`}
                    </p>
                  </div>
                  {getTeamLogoSrc(team) ? (
                    <img className="admin-match-roster-logo" src={getTeamLogoSrc(team)} alt="" aria-hidden="true" />
                  ) : (
                    <span className="admin-match-roster-logo fallback" style={{ background: team.team_color || '#12aabd' }}>
                      {initials(team.team_name)}
                    </span>
                  )}
                </div>

                {players.length ? (
                  <div className="admin-match-player-list">
                    {players.map((player) => (
                      <button
                        type="button"
                        className={`admin-match-player ${team.canInput ? '' : 'disabled'}`}
                        key={player.player_id}
                        disabled={!team.canInput}
                        onClick={() => {
                          if (!team.canInput) return
                          setSelectedPlayer({ ...player, team_label: team.label, team_name: team.team_name })
                        }}
                      >
                        <b>{player.jersey_number || initials(player.name)}</b>
                        <span>
                          <strong>{player.name}</strong>
                          <small>{player.position || 'No position'} - {player.email}</small>
                        </span>
                        <i>
                          <MousePointerClick size={16} />
                        </i>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState>No players assigned yet.</EmptyState>
                )}
              </AdminCard>
            )
          })}
          {visibleRosterTeams.length === 2 && <div className="admin-roster-versus" aria-hidden="true">VS</div>}
        </div>
      )}

      {!match && !error && <EmptyState>Loading match inputs...</EmptyState>}

      {selectedPlayer && (
        <div className="admin-offcanvas-backdrop" role="presentation" onMouseDown={() => setSelectedPlayer(null)}>
          <aside
            className="admin-offcanvas admin-player-input-offcanvas"
            aria-label="Player input counters"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-offcanvas-header">
              <div>
                <p className="admin-kicker">{selectedPlayer.team_label} - {selectedPlayer.team_name}</p>
                <h2>{selectedPlayer.name}</h2>
                <small>{selectedPlayer.position || 'No position'} - #{selectedPlayer.jersey_number || initials(selectedPlayer.name)}</small>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedPlayer(null)}
                aria-label="Close player inputs"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-password-tip">
              <Swords size={18} />
              <p>Click plus to add one count for this player only.</p>
            </div>

            <div className="admin-stat-input-list">
              {matchStatInputs.map((item) => (
                <div className="admin-stat-input-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </div>
                  <AdminButton
                    type="button"
                    variant="secondary"
                    disabled={savingStat === `${selectedPlayer.player_id}:${item.label}`}
                    onClick={() => decreaseStat(item.label)}
                    aria-label={`Decrease ${item.label}`}
                  >
                    <Minus size={16} />
                  </AdminButton>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    readOnly
                    value={selectedPlayerStats[item.label] || 0}
                    aria-label={`${item.label} count`}
                  />
                  <AdminButton
                    type="button"
                    disabled={savingStat === `${selectedPlayer.player_id}:${item.label}`}
                    onClick={() => increaseStat(item)}
                    aria-label={`Increase ${item.label}`}
                  >
                    <Plus size={16} />
                  </AdminButton>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {scoreOpen && (
        <div className="admin-offcanvas-backdrop" role="presentation" onMouseDown={() => setScoreOpen(false)}>
          <aside
            className="admin-offcanvas admin-score-offcanvas"
            aria-label="Match score"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-offcanvas-header">
              <div>
                <p className="admin-kicker">Match Score</p>
                <h2>{matchTitle}</h2>
                <small>{formatDate(match?.match_date)} - {match?.match_type}</small>
              </div>
              <button
                type="button"
                className="admin-modal-close admin-danger-close"
                onClick={() => {
                  setScoreConfirmOpen(false)
                  setScoreOpen(false)
                }}
                aria-label="Close score"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-password-tip">
              <Trophy size={18} />
              <p>You can only input the score for teams owned by your coach account.</p>
            </div>

            <form className="admin-score-form" onSubmit={requestScoreConfirmation}>
              <label className="admin-field">
                <span>{teamOne?.team_name || 'Team 1'}</span>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={scoreForm.team_score}
                  disabled={isScoreComplete(currentMatchScore) || !canScoreTeamOne}
                  placeholder={isScoreComplete(currentMatchScore) ? 'Final score' : canScoreTeamOne ? 'Enter score' : 'Waiting for team coach'}
                  onChange={(event) => setScoreForm((current) => ({ ...current, team_score: event.target.value }))}
                />
                {isScoreComplete(currentMatchScore) && <small className="admin-field-hint">This score has been finalized and is view-only.</small>}
                {!isScoreComplete(currentMatchScore) && !canScoreTeamOne && <small className="admin-field-hint">Only this team&apos;s coach can input this score.</small>}
              </label>

              <label className="admin-field">
                <span>{teamTwo?.team_name || match?.opponent_name || 'Team 2'}</span>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={scoreForm.opponent_score}
                  disabled={isScoreComplete(currentMatchScore) || !canScoreTeamTwo}
                  placeholder={isScoreComplete(currentMatchScore) ? 'Final score' : canScoreTeamTwo ? 'Enter score' : 'Waiting for team coach'}
                  onChange={(event) => setScoreForm((current) => ({ ...current, opponent_score: event.target.value }))}
                />
                {!isScoreComplete(currentMatchScore) && !canScoreTeamTwo && <small className="admin-field-hint">Only this team&apos;s coach can input this score.</small>}
              </label>

              <div className="admin-score-actions">
                {isScoreComplete(currentMatchScore) ? (
                  <AdminButton type="button" className="admin-danger-button" onClick={() => setScoreOpen(false)}>
                    Close
                  </AdminButton>
                ) : (
                  <>
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setScoreConfirmOpen(false)
                        setScoreOpen(false)
                      }}
                    >
                      Cancel
                    </AdminButton>
                    <AdminButton type="submit" disabled={savingScore || (!canScoreTeamOne && !canScoreTeamTwo)}>
                      Save Score
                    </AdminButton>
                  </>
                )}
              </div>
            </form>
          </aside>
        </div>
      )}

      {scoreConfirmOpen && (
        <div className="admin-sync-backdrop admin-score-confirm-backdrop" role="presentation" onMouseDown={() => !savingScore && setScoreConfirmOpen(false)}>
          <div className="admin-sync-modal admin-score-confirm-modal" role="dialog" aria-modal="true" aria-label="Finalize score" onMouseDown={(event) => event.stopPropagation()}>
            <span className="admin-score-confirm-icon"><Trophy size={24} /></span>
            <h2>Finalize score?</h2>
            <p>
              This score will be saved as final and cannot be undone. Review the numbers before confirming.
            </p>
            <div className="admin-score-confirm-summary">
              <span>{teamOne?.team_name || 'Team 1'}</span>
              <strong>{scoreForm.team_score || 0}</strong>
              <b>VS</b>
              <strong>{scoreForm.opponent_score || 0}</strong>
              <span>{teamTwo?.team_name || match?.opponent_name || 'Team 2'}</span>
            </div>
            <div className="admin-score-confirm-actions">
              <AdminButton type="button" className="admin-warning-button" disabled={savingScore} onClick={() => setScoreConfirmOpen(false)}>
                Review Again
              </AdminButton>
              <AdminButton type="button" disabled={savingScore} onClick={saveScore}>
                {savingScore ? 'Finalizing...' : 'Finalize Score'}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminMatchInputs
