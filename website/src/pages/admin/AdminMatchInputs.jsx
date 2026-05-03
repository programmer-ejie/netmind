import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Minus, MousePointerClick, Plus, Swords, Trophy, UsersRound, X } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  EmptyState,
  formatDate,
  getName,
  initials,
} from './AdminLayout'
import { apiRequest, getResource, listResource, readSavedUser, updateResource } from '../../lib/api'

const matchStatInputs = [
  { id: 1, label: 'Kill', description: 'Spike that scores' },
  { id: 2, label: 'Stuff Block', description: 'Block that scores' },
  { id: 3, label: 'Ace', description: 'Serve that scores' },
  { id: 4, label: 'Error', description: 'Any mistake' },
  { id: 5, label: 'Dig', description: 'Saved a spike' },
  { id: 6, label: 'Assist', description: 'Set to Kill' },
  { id: 7, label: 'Perfect Pass', description: 'Clearn Recieve' },
]

const readStoredStats = () => {
  try {
    return JSON.parse(localStorage.getItem('netmind_match_input_stats') || '{}')
  } catch {
    return {}
  }
}

const AdminMatchInputs = ({ matchId, currentPath = `#admin/matches/${matchId}/inputs` }) => {
  const currentUser = readSavedUser()
  const [match, setMatch] = useState(null)
  const [teams, setTeams] = useState([])
  const [teamRosters, setTeamRosters] = useState({})
  const [statsByMatch, setStatsByMatch] = useState(readStoredStats)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [scoreForm, setScoreForm] = useState({ team_score: '', opponent_score: '' })
  const [savingScore, setSavingScore] = useState(false)
  const [error, setError] = useState('')

  const stats = statsByMatch[matchId] || {}
  const selectedPlayerStats = selectedPlayer ? stats[selectedPlayer.player_id] || {} : {}
  const matchTitle = match ? `${getName(teams, match.team_id)} VS ${match.opponent_name}` : 'Match Inputs'
  const teamOne = match ? teams.find((team) => String(team.id) === String(match.team_id)) : null
  const teamTwo = match ? teams.find((team) => team.team_name === match.opponent_name) : null
  const canScoreTeamOne = String(teamOne?.coach_id) === String(currentUser?.id)
  const canScoreTeamTwo = String(teamTwo?.coach_id) === String(currentUser?.id)
  const visibleRosterTeams = useMemo(() => {
    if (!match || match.match_type !== 'friendly') return []

    return [
      teamOne && String(teamOne.coach_id) === String(currentUser?.id)
        ? { ...teamOne, label: 'Team 1' }
        : null,
      teamTwo && String(teamTwo.coach_id) === String(currentUser?.id)
        ? { ...teamTwo, label: 'Team 2' }
      : null,
    ].filter(Boolean)
  }, [currentUser?.id, match, teamOne, teamTwo])
  const totalPlayers = visibleRosterTeams.reduce((sum, team) => sum + (teamRosters[team.id] || []).length, 0)

  useEffect(() => {
    const load = async () => {
      const [matchRow, teamRows] = await Promise.all([
        getResource('matches', matchId),
        listResource('teams', { limit: 100 }),
      ])
      const teamOne = teamRows.find((team) => String(team.id) === String(matchRow.team_id))
      const teamTwo = teamRows.find((team) => team.team_name === matchRow.opponent_name)
      const rosterTeams = matchRow.match_type === 'friendly'
        ? [teamOne, teamTwo].filter((team) => team && String(team.coach_id) === String(currentUser?.id))
        : []
      const rosterRows = await Promise.all(
        rosterTeams.map(async (team) => [team.id, await apiRequest(`/teams/${team.id}/members`)]),
      )

      setMatch(matchRow)
      setTeams(teamRows)
      setTeamRosters(Object.fromEntries(rosterRows))
    }

    load().catch((err) => setError(err.message))
  }, [currentUser?.id, matchId])

  useEffect(() => {
    localStorage.setItem('netmind_match_input_stats', JSON.stringify(statsByMatch))
  }, [statsByMatch])

  const increaseStat = (statLabel) => {
    if (!selectedPlayer) return

    setStatsByMatch((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] || {}),
        [selectedPlayer.player_id]: {
          ...(current[matchId]?.[selectedPlayer.player_id] || {}),
          [statLabel]: Number(current[matchId]?.[selectedPlayer.player_id]?.[statLabel] || 0) + 1,
        },
      },
    }))
  }

  const decreaseStat = (statLabel) => {
    if (!selectedPlayer) return

    setStatsByMatch((current) => {
      const currentValue = Number(current[matchId]?.[selectedPlayer.player_id]?.[statLabel] || 0)

      return {
        ...current,
        [matchId]: {
          ...(current[matchId] || {}),
          [selectedPlayer.player_id]: {
            ...(current[matchId]?.[selectedPlayer.player_id] || {}),
            [statLabel]: Math.max(0, currentValue - 1),
          },
        },
      }
    })
  }

  const openScore = () => {
    setScoreForm({
      team_score: match?.team_score ?? '',
      opponent_score: match?.opponent_score ?? '',
    })
    setScoreOpen(true)
  }

  const saveScore = async (event) => {
    event.preventDefault()
    if (!match || (!canScoreTeamOne && !canScoreTeamTwo)) return

    const payload = {
      ...(canScoreTeamOne ? { team_score: scoreForm.team_score === '' ? null : Number(scoreForm.team_score) } : {}),
      ...(canScoreTeamTwo ? { opponent_score: scoreForm.opponent_score === '' ? null : Number(scoreForm.opponent_score) } : {}),
    }

    try {
      setSavingScore(true)
      const updated = await updateResource('matches', match.id, payload)
      setMatch(updated)
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
                window.location.hash = 'admin/matches'
              }}
              aria-label="Back to matches"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="admin-match-input-icon"><Swords size={22} /></span>
            <div>
              <p className="admin-kicker">Practice Input Sheet</p>
              <h2>{matchTitle}</h2>
              <small>{match ? `${formatDate(match.match_date)} · ${match.match_type}` : 'Loading match details...'}</small>
            </div>
          </div>
          <div className="admin-match-input-summary">
            <span>
              <UsersRound size={17} />
              {totalPlayers} players
            </span>
            <AdminButton type="button" onClick={openScore}>
              <Trophy size={16} />
              Score
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      {visibleRosterTeams.length > 0 && (
        <div className={`admin-match-roster-grid ${visibleRosterTeams.length === 2 ? 'has-versus' : ''}`}>
          {visibleRosterTeams.map((team) => {
            const players = teamRosters[team.id] || []

            return (
              <AdminCard className="admin-match-roster-card" key={`${team.label}-${team.id}`}>
                <div className="admin-card-header admin-match-roster-header">
                  <div>
                    <p className="admin-kicker">{team.label}</p>
                    <h2>{team.team_name}</h2>
                    <p className="admin-muted">{players.length} players available for input tracking.</p>
                  </div>
                  {team.logo_url ? (
                    <img className="admin-match-roster-logo" src={team.logo_url} alt="" aria-hidden="true" />
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
                        className="admin-match-player"
                        key={player.player_id}
                        onClick={() => setSelectedPlayer({ ...player, team_label: team.label, team_name: team.team_name })}
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
                    onClick={() => increaseStat(item.label)}
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
                className="admin-modal-close"
                onClick={() => setScoreOpen(false)}
                aria-label="Close score"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-password-tip">
              <Trophy size={18} />
              <p>You can only input the score for teams owned by your coach account.</p>
            </div>

            <form className="admin-score-form" onSubmit={saveScore}>
              <label className="admin-field">
                <span>{teamOne?.team_name || 'Team 1'}</span>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={scoreForm.team_score}
                  disabled={!canScoreTeamOne}
                  placeholder={canScoreTeamOne ? 'Enter score' : 'Waiting for team coach'}
                  onChange={(event) => setScoreForm((current) => ({ ...current, team_score: event.target.value }))}
                />
                {!canScoreTeamOne && <small className="admin-field-hint">Only this team&apos;s coach can input this score.</small>}
              </label>

              <label className="admin-field">
                <span>{teamTwo?.team_name || match?.opponent_name || 'Team 2'}</span>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={scoreForm.opponent_score}
                  disabled={!canScoreTeamTwo}
                  placeholder={canScoreTeamTwo ? 'Enter score' : 'Waiting for team coach'}
                  onChange={(event) => setScoreForm((current) => ({ ...current, opponent_score: event.target.value }))}
                />
                {!canScoreTeamTwo && <small className="admin-field-hint">Only this team&apos;s coach can input this score.</small>}
              </label>

              <div className="admin-score-actions">
                <AdminButton type="button" variant="secondary" onClick={() => setScoreOpen(false)}>Cancel</AdminButton>
                <AdminButton type="submit" disabled={savingScore || (!canScoreTeamOne && !canScoreTeamTwo)}>
                  {savingScore ? 'Saving...' : 'Save Score'}
                </AdminButton>
              </div>
            </form>
          </aside>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminMatchInputs
