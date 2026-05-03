import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminModal,
  AdminSelect,
  AdminTextarea,
  EmptyState,
  StatusBadge,
  formatDate,
  getName,
} from './AdminLayout'
import { createResource, deleteResource, listResource, updateResource } from '../../lib/api'

const actualMatchTypes = ['league', 'tournament', 'playoff']
const matchTypes = ['friendly', ...actualMatchTypes]
const results = ['win', 'loss', 'draw']

const blankMatch = {
  team_id: '',
  opponent_name: '',
  match_date: '',
  is_home: true,
  result: '',
  team_score: '',
  opponent_score: '',
  season_id: '',
  match_type: 'friendly',
  notes: '',
}

const AdminMatches = ({ currentPath = '#admin/matches' }) => {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [seasons, setSeasons] = useState([])
  const [activeView, setActiveView] = useState('practice')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankMatch)
  const [error, setError] = useState('')

  const practiceMatches = useMemo(
    () => matches.filter((match) => match.match_type === 'friendly'),
    [matches],
  )

  const actualMatches = useMemo(
    () => matches.filter((match) => actualMatchTypes.includes(match.match_type)),
    [matches],
  )

  const visibleMatches = activeView === 'practice' ? practiceMatches : actualMatches

  const load = async () => {
    const [matchRows, teamRows, seasonRows] = await Promise.all([
      listResource('matches', { limit: 100, sortBy: 'match_date', sortDir: 'asc' }),
      listResource('teams', { limit: 100 }),
      listResource('seasons', { limit: 100 }),
    ])

    setMatches(matchRows)
    setTeams(teamRows)
    setSeasons(seasonRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const openCreate = (view = activeView) => {
    setEditing(null)
    setForm({
      ...blankMatch,
      team_id: teams[0]?.id || '',
      season_id: seasons[0]?.id || '',
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
      is_home: Boolean(match.is_home),
      result: match.result || '',
      team_score: match.team_score ?? '',
      opponent_score: match.opponent_score ?? '',
      season_id: match.season_id || '',
      match_type: match.match_type || 'friendly',
      notes: match.notes || '',
    })
    setActiveView(match.match_type === 'friendly' ? 'practice' : 'actual')
    setModalOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()

    const payload = {
      team_id: form.team_id,
      opponent_name: form.opponent_name,
      match_date: form.match_date,
      is_home: Boolean(form.is_home),
      result: form.result || null,
      team_score: form.team_score === '' ? null : Number(form.team_score),
      opponent_score: form.opponent_score === '' ? null : Number(form.opponent_score),
      season_id: form.season_id || null,
      match_type: form.match_type,
      notes: form.notes || null,
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

      <div className="admin-stat-grid compact">
        <AdminCard>
          <span className="admin-muted">Practice Matches</span>
          <strong>{practiceMatches.length}</strong>
        </AdminCard>
        <AdminCard>
          <span className="admin-muted">Actual Matches</span>
          <strong>{actualMatches.length}</strong>
        </AdminCard>
        <AdminCard>
          <span className="admin-muted">Total Scheduled</span>
          <strong>{matches.length}</strong>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="admin-card-header">
          <div>
            <h2>{activeView === 'practice' ? 'Practice Matches' : 'Actual Matches'}</h2>
            <p className="admin-muted">Separate friendly practice sessions from official competition matches.</p>
          </div>
          <div className="admin-card-actions">
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
            <AdminButton onClick={() => openCreate(activeView)}>
              <Plus size={17} />
              Add Match
            </AdminButton>
          </div>
        </div>

        <div className="admin-table">
          <table className="admin-native-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Team</th>
                <th>Date</th>
                <th>Type</th>
                <th>Score</th>
                <th>Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleMatches.map((match) => (
                <tr key={match.id}>
                  <td>
                    <strong>{match.is_home ? 'vs' : '@'} {match.opponent_name}</strong>
                    <small className="admin-block-muted">{match.notes || 'No notes'}</small>
                  </td>
                  <td>{getName(teams, match.team_id)}</td>
                  <td>{formatDate(match.match_date)}</td>
                  <td><StatusBadge tone={match.match_type === 'friendly' ? 'secondary' : 'primary'}>{match.match_type}</StatusBadge></td>
                  <td>{match.team_score ?? '-'} - {match.opponent_score ?? '-'}</td>
                  <td>{match.result ? <StatusBadge tone={match.result === 'win' ? 'success' : match.result === 'loss' ? 'error' : 'warning'}>{match.result}</StatusBadge> : '-'}</td>
                  <td>
                    <div className="admin-actions">
                      <AdminButton variant="secondary" onClick={() => openEdit(match)} aria-label="Edit match">
                        <Edit3 size={15} />
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => removeMatch(match)} aria-label="Delete match">
                        <Trash2 size={15} />
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleMatches.length && (
            <EmptyState>
              No {activeView === 'practice' ? 'practice' : 'actual'} matches yet.
            </EmptyState>
          )}
        </div>
      </AdminCard>

      <AdminModal open={modalOpen} title={editing ? 'Edit Match' : 'Add Match'} onClose={() => setModalOpen(false)}>
        <form className="admin-form" onSubmit={submit}>
          <AdminField label="Match Category">
            <AdminSelect
              value={form.match_type === 'friendly' ? 'practice' : 'actual'}
              onChange={(event) => {
                const nextView = event.target.value
                setForm((current) => ({
                  ...current,
                  match_type: nextView === 'practice' ? 'friendly' : 'league',
                }))
              }}
            >
              <option value="practice">Practice</option>
              <option value="actual">Actual Match</option>
            </AdminSelect>
          </AdminField>

          <AdminField label="Team">
            <AdminSelect required value={form.team_id} onChange={(event) => setForm((current) => ({ ...current, team_id: event.target.value }))}>
              <option value="">Select team</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
            </AdminSelect>
          </AdminField>

          <AdminField label="Opponent">
            <AdminInput required value={form.opponent_name} onChange={(event) => setForm((current) => ({ ...current, opponent_name: event.target.value }))} placeholder="Cebu Spikers" />
          </AdminField>

          <AdminField label="Date">
            <AdminInput required type="date" value={form.match_date} onChange={(event) => setForm((current) => ({ ...current, match_date: event.target.value }))} />
          </AdminField>

          <AdminField label="Match Type">
            <AdminSelect value={form.match_type} onChange={(event) => setForm((current) => ({ ...current, match_type: event.target.value }))}>
              {matchTypes.map((type) => <option key={type}>{type}</option>)}
            </AdminSelect>
          </AdminField>

          <AdminField label="Season">
            <AdminSelect value={form.season_id} onChange={(event) => setForm((current) => ({ ...current, season_id: event.target.value }))}>
              <option value="">No season</option>
              {seasons.map((season) => <option key={season.id} value={season.id}>{season.season_name}</option>)}
            </AdminSelect>
          </AdminField>

          <label className="admin-check-field">
            <input
              type="checkbox"
              checked={Boolean(form.is_home)}
              onChange={(event) => setForm((current) => ({ ...current, is_home: event.target.checked }))}
            />
            Home match
          </label>

          <div className="admin-form-grid">
            <AdminField label="Team Score">
              <AdminInput type="number" min="0" value={form.team_score} onChange={(event) => setForm((current) => ({ ...current, team_score: event.target.value }))} />
            </AdminField>
            <AdminField label="Opponent Score">
              <AdminInput type="number" min="0" value={form.opponent_score} onChange={(event) => setForm((current) => ({ ...current, opponent_score: event.target.value }))} />
            </AdminField>
          </div>

          <AdminField label="Result">
            <AdminSelect value={form.result} onChange={(event) => setForm((current) => ({ ...current, result: event.target.value }))}>
              <option value="">Not played</option>
              {results.map((result) => <option key={result}>{result}</option>)}
            </AdminSelect>
          </AdminField>

          <AdminField label="Notes">
            <AdminTextarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </AdminField>

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
