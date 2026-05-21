import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, ChevronLeft, ChevronRight, ClipboardList, Edit3, Info, Plus, Swords, Trash2, Trophy } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  AdminSelect,
  EmptyState,
  StatCardSkeleton,
  StatusBadge,
  TableSkeletonRows,
  formatDate,
  getName,
} from './AdminLayout'
import { apiRequest, createResource, deleteResource, listResource, readSavedUser, updateResource } from '../../lib/api'

const actualMatchTypes = ['league', 'tournament', 'playoff']
const MATCHES_PER_PAGE = 5
const MATCHES_TAB_STORAGE_KEY = 'netmind:matches-active-tab'
const MATCHES_STATUS_STORAGE_KEY = 'netmind:matches-status-filter'
const matchTabs = new Set(['practice', 'actual'])
const statusFilters = new Set(['all', 'ongoing', 'scored'])
const bestOfLabels = {
  1: 'Best of One',
  3: 'Best of Three',
  5: 'Best of Five',
}
const statusFilterOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'ongoing', label: 'On-going' },
  { value: 'scored', label: 'Scored' },
]

const countLabel = (count, singular, plural = `${singular}s`) => (
  `${count} ${count === 1 ? singular : plural}`
)
const totalSets = (rows) => rows.reduce((sum, match) => sum + Number(match.best_of || 1), 0)
const sortMatchesDesc = (rows) => (
  rows.slice().sort((a, b) => (
    new Date(b.match_date || 0) - new Date(a.match_date || 0)
    || Number(b.id || 0) - Number(a.id || 0)
  ))
)
const isScoreComplete = (score) => (
  score?.team_score !== null && score?.team_score !== undefined
  && score?.opponent_score !== null && score?.opponent_score !== undefined
)
const mergeTeams = (...groups) => (
  [...new Map(groups.flat().filter(Boolean).map((team) => [String(team.id), team])).values()]
)

const getSavedMatchesTab = () => {
  const saved = window.localStorage.getItem(MATCHES_TAB_STORAGE_KEY)
  return matchTabs.has(saved) ? saved : 'practice'
}

const getSavedMatchesStatusFilter = () => {
  const saved = window.localStorage.getItem(MATCHES_STATUS_STORAGE_KEY)
  return statusFilters.has(saved) ? saved : 'all'
}

const blankMatch = {
  team_id: '',
  opponent_name: '',
  match_date: '',
  best_of: '1',
  is_home: true,
  match_type: 'friendly',
}

const AdminMatches = ({ currentPath = '#coach/matches' }) => {
  const currentUser = readSavedUser()
  const [matches, setMatches] = useState([])
  const [matchScores, setMatchScores] = useState([])
  const [teams, setTeams] = useState([])
  const [opponentTeamOptions, setOpponentTeamOptions] = useState([])
  const [activeView, setActiveView] = useState(getSavedMatchesTab)
  const [practicePage, setPracticePage] = useState(1)
  const [actualPage, setActualPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(getSavedMatchesStatusFilter)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankMatch)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const ownedTeams = useMemo(() => (
    teams.filter((team) => String(team.coach_id) === String(currentUser?.id))
  ), [currentUser?.id, teams])

  const practiceMatches = useMemo(
    () => sortMatchesDesc(matches.filter((match) => match.match_type === 'friendly')),
    [matches],
  )

  const actualMatches = useMemo(
    () => sortMatchesDesc(matches.filter((match) => actualMatchTypes.includes(match.match_type))),
    [matches],
  )

  const getWinner = (score) => {
    if (
      score?.team_score === null || score?.team_score === undefined
      || score?.opponent_score === null || score?.opponent_score === undefined
    ) return null

    if (Number(score.team_score) > Number(score.opponent_score)) return 'team'
    if (Number(score.team_score) < Number(score.opponent_score)) return 'opponent'
    return null
  }
  const isMatchScored = useCallback((match) => {
    const bestOf = Number(match.best_of || 1)
    const scores = matchScores.filter((score) => String(score.match_id) === String(match.id))

    if (bestOf <= 1) {
      return isScoreComplete(scores.find((item) => Number(item.match_number) === 1) || match)
    }

    return Array.from({ length: bestOf }).every((_, index) => (
      isScoreComplete(scores.find((score) => Number(score.match_number) === index + 1))
    ))
  }, [matchScores])
  const tabMatches = activeView === 'practice' ? practiceMatches : actualMatches
  const visibleMatches = useMemo(() => (
    tabMatches.filter((match) => {
      if (statusFilter === 'scored') return isMatchScored(match)
      if (statusFilter === 'ongoing') return !isMatchScored(match)
      return true
    })
  ), [isMatchScored, statusFilter, tabMatches])
  const activePage = activeView === 'practice' ? practicePage : actualPage
  const totalMatchPages = Math.max(1, Math.ceil(visibleMatches.length / MATCHES_PER_PAGE))
  const pagedMatches = useMemo(() => {
    const start = (activePage - 1) * MATCHES_PER_PAGE
    return visibleMatches.slice(start, start + MATCHES_PER_PAGE)
  }, [activePage, visibleMatches])
  const isActualMatchForm = actualMatchTypes.includes(form.match_type)
  const teamOneOptions = useMemo(
    () => (
      isActualMatchForm
        ? ownedTeams
        : ownedTeams.filter((team) => team.team_name !== form.opponent_name)
    ),
    [form.opponent_name, isActualMatchForm, ownedTeams],
  )
  const getOpponentTeamsForMatchType = useCallback((matchType) => (
    actualMatchTypes.includes(matchType)
      ? opponentTeamOptions
      : teams.filter((team) => String(team.id) !== String(form.team_id))
  ), [form.team_id, opponentTeamOptions, teams])
  const opponentTeams = useMemo(
    () => getOpponentTeamsForMatchType(form.match_type),
    [form.match_type, getOpponentTeamsForMatchType],
  )

  const updateMatchType = (matchType) => {
    const nextOpponentTeams = getOpponentTeamsForMatchType(matchType)

    setForm((current) => ({
      ...current,
      match_type: matchType,
      opponent_name: nextOpponentTeams.some((team) => team.team_name === current.opponent_name)
        ? current.opponent_name
        : '',
    }))
  }

  const updateTeam = (teamId) => {
    const selectedTeam = teams.find((team) => String(team.id) === String(teamId))

    setForm((current) => ({
      ...current,
      team_id: teamId,
      opponent_name: !isActualMatchForm && selectedTeam?.team_name === current.opponent_name
        ? ''
        : current.opponent_name,
    }))
  }

  const formatBestOf = (value) => bestOfLabels[Number(value)] || 'Best of One'
  const formatSeriesResult = (match) => {
    const bestOf = Number(match.best_of || 1)
    const scores = matchScores.filter((score) => String(score.match_id) === String(match.id))

    if (bestOf <= 1) {
      const score = scores.find((item) => Number(item.match_number) === 1) || match
      const winner = getWinner(score)

      if (winner === 'team') return '1 - 0'
      if (winner === 'opponent') return '0 - 1'
      return '----'
    }

    const wins = scores.reduce((current, score) => {
      const winner = getWinner(score)
      if (winner === 'team') return { ...current, team: current.team + 1 }
      if (winner === 'opponent') return { ...current, opponent: current.opponent + 1 }
      return current
    }, { team: 0, opponent: 0 })

    return wins.team || wins.opponent ? `${wins.team} - ${wins.opponent}` : '----'
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [matchRows, scoreRows, teamRows, opponentRows] = await Promise.all([
      listResource('matches', { limit: 100, sortBy: 'match_date', sortDir: 'asc' }),
      listResource('match-scores', { limit: 100, sortBy: 'match_number', sortDir: 'asc' }),
      listResource('teams', { limit: 100 }),
      apiRequest('/teams/opponents'),
    ])
    const allTeamRows = mergeTeams(teamRows, opponentRows)
    const ownedTeamRows = teamRows.filter((team) => String(team.coach_id) === String(currentUser?.id))
    const ownedTeamIds = new Set(ownedTeamRows.map((team) => String(team.id)))
    const ownedTeamNames = new Set(ownedTeamRows.map((team) => team.team_name))
    const scopedMatches = matchRows.filter((match) => (
      ownedTeamIds.has(String(match.team_id)) || ownedTeamNames.has(match.opponent_name)
    ))

    setMatches(scopedMatches)
    setMatchScores(scoreRows)
    setTeams(allTeamRows)
    setOpponentTeamOptions(opponentRows)
    setLoading(false)
  }, [currentUser?.id])

  useEffect(() => {
    load().catch((err) => {
      setError(err.message)
      setLoading(false)
    })
  }, [load])

  useEffect(() => {
    window.localStorage.setItem(MATCHES_TAB_STORAGE_KEY, activeView)
  }, [activeView])

  useEffect(() => {
    window.localStorage.setItem(MATCHES_STATUS_STORAGE_KEY, statusFilter)
  }, [statusFilter])

  useEffect(() => {
    setPracticePage((current) => Math.min(Math.max(current, 1), Math.max(1, Math.ceil(practiceMatches.length / MATCHES_PER_PAGE))))
  }, [practiceMatches.length])

  useEffect(() => {
    setActualPage((current) => Math.min(Math.max(current, 1), Math.max(1, Math.ceil(actualMatches.length / MATCHES_PER_PAGE))))
  }, [actualMatches.length])

  const goToPreviousMatchPage = () => {
    if (activeView === 'practice') {
      setPracticePage((current) => Math.max(1, current - 1))
      return
    }

    setActualPage((current) => Math.max(1, current - 1))
  }

  const goToNextMatchPage = () => {
    if (activeView === 'practice') {
      setPracticePage((current) => Math.min(totalMatchPages, current + 1))
      return
    }

    setActualPage((current) => Math.min(totalMatchPages, current + 1))
  }

  const openCreate = (view = activeView) => {
    setEditing(null)
    setForm({
      ...blankMatch,
      team_id: ownedTeams[0]?.id || '',
      match_type: view === 'practice' ? 'friendly' : 'league',
    })
    setActiveView(view)
    setModalOpen(true)
  }

  const openEdit = (match) => {
    setEditing(match)
    setForm({
      team_id: match.team_id || '',
      opponent_name: match.opponent_name || '',
      match_date: match.match_date ? String(match.match_date).slice(0, 10) : '',
      best_of: match.best_of ? String(match.best_of) : '1',
      is_home: Boolean(match.is_home),
      match_type: match.match_type || 'friendly',
    })
    setActiveView(match.match_type === 'friendly' ? 'practice' : 'actual')
    setModalOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()

    const payload = editing
      ? {
        match_date: form.match_date,
        match_type: form.match_type,
      }
      : {
        team_id: form.team_id,
        opponent_name: form.opponent_name,
        match_date: form.match_date,
        best_of: Number(form.best_of),
        is_home: Boolean(form.is_home),
        match_type: form.match_type,
      }

    try {
      if (editing) await updateResource('matches', editing.id, payload)
      else await createResource('matches', payload)
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeMatch = async (match) => {
    if (!window.confirm(`Delete match against ${match.opponent_name}?`)) return

    try {
      await deleteResource('matches', match.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminLayout title="Matches" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-match-stats">
        {loading ? (
          <>
            <StatCardSkeleton label="Loading practice match count" />
            <StatCardSkeleton label="Loading actual match count" />
            <StatCardSkeleton label="Loading scheduled match count" />
          </>
        ) : (
          <>
        <AdminCard className="admin-match-stat practice">
          <span><ClipboardList size={19} /></span>
          <div>
            <p>Practice Matches</p>
            <strong>{countLabel(practiceMatches.length, 'Match', 'Matches')}</strong>
            <small>{countLabel(totalSets(practiceMatches), 'set')} total</small>
          </div>
        </AdminCard>
        <AdminCard className="admin-match-stat actual">
          <span><Trophy size={19} /></span>
          <div>
            <p>Actual Matches</p>
            <strong>{countLabel(actualMatches.length, 'Match', 'Matches')}</strong>
            <small>{countLabel(totalSets(actualMatches), 'set')} total</small>
          </div>
        </AdminCard>
        <AdminCard className="admin-match-stat scheduled">
          <span><CalendarCheck2 size={19} /></span>
          <div>
            <p>Total Scheduled</p>
            <strong>{countLabel(matches.length, 'Match', 'Matches')}</strong>
            <small>{countLabel(totalSets(matches), 'set')} total</small>
          </div>
        </AdminCard>
          </>
        )}
      </div>

      <AdminCard className="admin-matches-card">
        <div className="admin-card-header admin-match-header">
          <div className="admin-match-title">
            <span><Swords size={21} /></span>
            <div>
              <h2>{activeView === 'practice' ? 'Practice Matches' : 'Actual Matches'}</h2>
              <p className="admin-muted">
                {activeView === 'practice'
                  ? 'Friendly sessions for testing lineups, rotations, and player readiness.'
                  : 'Official competition records for league, tournament, and playoff tracking.'}
              </p>
            </div>
          </div>
          <div className="admin-card-actions">
            <div className="admin-match-status-filter">
              <span>Status</span>
              <details className="admin-match-status-menu">
                <summary>
                  {statusFilterOptions.find((option) => option.value === statusFilter)?.label || 'All statuses'}
                  <ChevronRight size={15} />
                </summary>
                <div>
                  {statusFilterOptions.map((option) => (
                    <button
                      type="button"
                      className={option.value === statusFilter ? 'active' : ''}
                      key={option.value}
                      onClick={(event) => {
                        setStatusFilter(option.value)
                        event.currentTarget.closest('details')?.removeAttribute('open')
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </details>
            </div>
            <div className="admin-segmented" role="tablist" aria-label="Match view">
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
            <AdminButton className="admin-matches-add-button admin-success-action-button" onClick={() => openCreate(activeView)} aria-label="Add match" title="Add match">
              <Plus size={38} />
            </AdminButton>
          </div>
        </div>

        {loading ? (
          <div className="admin-table admin-matches-table admin-matches-table-centered">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Date</th>
                  <th>Best Of</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <TableSkeletonRows rows={5} columns={6} />
              </tbody>
            </table>
          </div>
        ) : visibleMatches.length ? (
          <div className="admin-table admin-matches-table admin-matches-table-centered">
            <table className="admin-native-table">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Date</th>
                  <th>Best Of</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedMatches.map((match) => {
                  const canManageMatch = ownedTeams.some((team) => String(team.id) === String(match.team_id))

                  return (
                    <tr
                      key={match.id}
                      className="admin-match-click-row"
                      onClick={() => {
                        window.location.hash = Number(match.best_of || 1) > 1
                          ? `coach/matches/${match.id}/sets`
                          : `coach/matches/${match.id}/inputs`
                      }}
                    >
                      <td>
                        <strong className="admin-match-versus">
                          <span>{getName(teams, match.team_id)}</span>
                          <b>VS</b>
                          <span>{match.opponent_name}</span>
                        </strong>
                      </td>
                      <td>{formatDate(match.match_date)}</td>
                      <td>{formatBestOf(match.best_of)}</td>
                      <td><StatusBadge tone={match.match_type === 'friendly' ? 'secondary' : 'primary'}>{match.match_type}</StatusBadge></td>
                      <td>{formatSeriesResult(match)}</td>
                      <td>
                        <div className="admin-actions" onClick={(event) => event.stopPropagation()}>
                          {canManageMatch ? (
                            <>
                              <AdminButton variant="secondary" onClick={() => openEdit(match)} aria-label="Edit match">
                                <Edit3 size={15} />
                              </AdminButton>
                              <AdminButton variant="danger" onClick={() => removeMatch(match)} aria-label="Delete match">
                                <Trash2 size={15} />
                              </AdminButton>
                            </>
                          ) : (
                            <StatusBadge tone="secondary">Score only</StatusBadge>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="admin-pagination admin-matches-pagination" aria-label={`${activeView === 'practice' ? 'Practice' : 'Actual'} matches pagination`}>
              <button
                type="button"
                className="admin-pagination-button"
                aria-label="Previous matches page"
                disabled={activePage <= 1}
                onClick={goToPreviousMatchPage}
              >
                <ChevronLeft size={17} />
              </button>
              <span>Page {activePage} of {totalMatchPages}</span>
              <button
                type="button"
                className="admin-pagination-button"
                aria-label="Next matches page"
                disabled={activePage >= totalMatchPages}
                onClick={goToNextMatchPage}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        ) : (
          <div className="admin-matches-empty-wrap">
            <EmptyState>
              <div className="admin-match-empty">
                <span><Swords size={24} /></span>
                <strong>No {activeView === 'practice' ? 'practice' : 'actual'} matches yet</strong>
                <p>
                  Add a match to start tracking teams, opponents, and match schedules.
                </p>
                <AdminButton type="button" onClick={() => openCreate(activeView)}>
                  <Plus size={16} />
                  Add Match
                </AdminButton>
              </div>
            </EmptyState>
          </div>
        )}
      </AdminCard>

      <AdminModal open={modalOpen} title={editing ? 'Edit Match' : 'Add Match'} onClose={() => setModalOpen(false)}>
        <form className="admin-form" onSubmit={submit}>
          <AdminField label="Match Category">
            <AdminSelect
              value={form.match_type === 'friendly' ? 'practice' : 'actual'}
              onChange={(event) => {
                const nextView = event.target.value
                const nextMatchType = nextView === 'practice' ? 'friendly' : 'league'

                updateMatchType(nextMatchType)
              }}
            >
              <option value="practice">Practice</option>
              <option value="actual">Actual Match</option>
            </AdminSelect>
          </AdminField>

          <div className="admin-password-tip">
            <Info size={18} />
            <p>
              {editing
                ? 'Update the match category or scheduled date.'
                : isActualMatchForm
                ? 'Actual matches only need teams, date, best-of format, and official match type.'
                : 'Practice matches only need the team, opponent, date, and best-of format for quick scheduling.'}
            </p>
          </div>

          {!editing && (
            <>
              <AdminField label={isActualMatchForm ? 'Team' : 'Team 1'}>
                <AdminSelect required value={form.team_id} onChange={(event) => updateTeam(event.target.value)}>
                  <option value="">Select team</option>
                  {teamOneOptions.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
                </AdminSelect>
              </AdminField>

              <AdminField label={isActualMatchForm ? 'Opponent' : 'Team 2'}>
                <AdminSelect
                  required
                  value={form.opponent_name}
                  onChange={(event) => setForm((current) => ({ ...current, opponent_name: event.target.value }))}
                >
                  <option value="">
                    {isActualMatchForm ? 'Select opponent team' : 'Select practice opponent'}
                  </option>
                  {opponentTeams.map((team) => (
                    <option key={team.id} value={team.team_name}>
                      {team.team_name}
                    </option>
                  ))}
                </AdminSelect>
                {isActualMatchForm && !opponentTeams.length && (
                  <small className="admin-field-hint">No teams from other coaches are available yet.</small>
                )}
              </AdminField>
            </>
          )}

          <AdminField label="Date">
            <AdminInput required type="date" value={form.match_date} onChange={(event) => setForm((current) => ({ ...current, match_date: event.target.value }))} />
          </AdminField>

          {!editing && (
            <AdminField label="Best Of">
              <AdminSelect value={form.best_of} onChange={(event) => setForm((current) => ({ ...current, best_of: event.target.value }))}>
                <option value="1">Best of One</option>
                <option value="3">Best of Three</option>
                <option value="5">Best of Five</option>
              </AdminSelect>
            </AdminField>
          )}

          {isActualMatchForm && (
            <>
              <AdminField label="Match Type">
                <AdminSelect value={form.match_type} onChange={(event) => updateMatchType(event.target.value)}>
                  {actualMatchTypes.map((type) => <option key={type}>{type}</option>)}
                </AdminSelect>
              </AdminField>
            </>
          )}

          <div className="admin-form-actions">
            <AdminButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">{editing ? 'Save Match' : 'Add Match'}</AdminButton>
          </div>
        </form>
      </AdminModal>

    </AdminLayout>
  )
}

export default AdminMatches
