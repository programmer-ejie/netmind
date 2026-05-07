import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, ListRow, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import {
  listPlayerPerformanceLogs,
  listResource,
  listTeamMatches,
  submitPlayerPerformanceReflection,
  type Match,
  type MatchScore,
  type NetmindUser,
  type PerformanceLog,
  type TeamMember,
} from '@/lib/api';

const bodyConditions = [
  { label: 'Good', value: 'none' },
  { label: 'Sore', value: 'minor' },
  { label: 'Pain', value: 'moderate' },
  { label: 'Injured', value: 'injured' },
] as const;

const statusFilters = [
  { label: 'Pending', value: 'pending' },
  { label: 'Logged', value: 'logged' },
] as const;

export default function PerformanceScreen() {
  const [player, setPlayer] = useState<NetmindUser | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchScores, setMatchScores] = useState<MatchScore[]>([]);
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]['value']>('pending');
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [selectedLog, setSelectedLog] = useState<PerformanceLog | null>(null);
  const [effort, setEffort] = useState('');
  const [energy, setEnergy] = useState('');
  const [confidence, setConfidence] = useState('');
  const [focus, setFocus] = useState('');
  const [bodyCondition, setBodyCondition] = useState<(typeof bodyConditions)[number]['value']>('none');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reflectionModalVisible, setReflectionModalVisible] = useState(false);
  const [reflectionMode, setReflectionMode] = useState<'create' | 'view'>('create');
  const [message, setMessage] = useState('');
  const { colors } = useNetmindTheme();

  const reflectedMatchIds = useMemo(
    () => new Set(logs.filter(isMatchReflection).map((log) => String(log.match_id))),
    [logs]
  );
  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) || null,
    [matches, selectedMatchId]
  );
  const visibleMatches = useMemo(
    () => matches.filter((match) => {
      const hasReflection = reflectedMatchIds.has(String(match.id));
      return statusFilter === 'pending' ? !hasReflection : hasReflection;
    }),
    [matches, reflectedMatchIds, statusFilter]
  );

  useEffect(() => {
    let alive = true;

    const loadPerformanceContext = async () => {
      setLoading(true);
      setMessage('');

      try {
        const saved = await AsyncStorage.getItem('netmind_user');
        const savedUser = saved ? JSON.parse(saved) as NetmindUser : null;

        if (!alive) return;
        setPlayer(savedUser);

        if (!savedUser?.id) {
          setMessage('Sign in again to load your matches.');
          return;
        }

        const teamLinks = await listResource<TeamMember>('team-members', {
          player_id: savedUser.id,
          is_active: 1,
        });
        const activeTeamIds = [...new Set(teamLinks.data.map((link) => link.team_id))];
        const teamMatches = (await Promise.all(activeTeamIds.map((teamId) => listTeamMatches(teamId)))).flat();
        const scoreRows = await listResource<MatchScore>('match-scores', {
          limit: 500,
          sortBy: 'match_number',
          sortDir: 'asc',
        });
        const uniqueMatches = [...new Map(teamMatches.map((match) => [match.id, match])).values()]
          .filter((match) => isCompletedMatch(match, scoreRows.data))
          .sort((first, second) => dateKey(second.match_date).localeCompare(dateKey(first.match_date)));
        const savedLogs = await listPlayerPerformanceLogs(savedUser.id);

        if (!alive) return;
        setMatches(uniqueMatches);
        setMatchScores(scoreRows.data);
        setLogs(savedLogs);
      } catch (error) {
        if (!alive) return;
        setMessage(error instanceof Error ? error.message : 'Unable to load performance matches.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadPerformanceContext();

    return () => {
      alive = false;
    };
  }, []);

  const openReflectionModal = (match: Match) => {
    setSelectedMatchId(match.id);
    setSelectedLog(null);
    setReflectionMode('create');
    setEffort('');
    setEnergy('');
    setConfidence('');
    setFocus('');
    setBodyCondition('none');
    setNotes('');
    setMessage('');
    setReflectionModalVisible(true);
  };

  const openLoggedReflection = (match: Match) => {
    const log = logs.find((item) => isMatchReflection(item) && String(item.match_id) === String(match.id));
    if (!log) return;

    setSelectedMatchId(match.id);
    setSelectedLog(log);
    setReflectionMode('view');
    setEffort(String(log.rpe ?? ''));
    setEnergy(String(log.energy_level ?? ''));
    setConfidence(String(log.confidence_level ?? ''));
    setFocus(String(log.focus_level ?? ''));
    setBodyCondition(log.injury_status || 'none');
    setNotes(log.notes || '');
    setMessage('');
    setReflectionModalVisible(true);
  };

  const submitReflection = async () => {
    if (!player?.id || !selectedMatch || saving) return;

    const effortLevel = Number(effort);
    const energyLevel = Number(energy);
    const confidenceLevel = Number(confidence);
    const focusLevel = Number(focus);

    if (
      !isValidScale(effortLevel) ||
      !isValidScale(energyLevel) ||
      !isValidScale(confidenceLevel) ||
      !isValidScale(focusLevel)
    ) {
      setMessage('Enter effort, energy, confidence, and focus from 1-10.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const saved = await submitPlayerPerformanceReflection(player.id, {
        session_type: 'match',
        match_id: selectedMatch.id,
        action_type: 'reflection',
        result: 'normal',
        rpe: effortLevel,
        energy_level: energyLevel,
        confidence_level: confidenceLevel,
        focus_level: focusLevel,
        injury_status: bodyCondition,
        notes: notes.trim() || null,
      });

      setLogs((current) => [saved, ...current.filter((log) => log.id !== saved.id)]);
      setNotes('');
      setReflectionModalVisible(false);
      setStatusFilter('logged');
      setMessage('Performance reflection saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save performance reflection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Log Performance" subtitle="Reflect on coach-created matches without re-entering coach stats.">
      {message ? (
        <View style={[styles.notice, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
          <Text style={[styles.noticeText, { color: colors.ink }]}>{message}</Text>
        </View>
      ) : null}

      <SectionTitle>Match</SectionTitle>
      <View style={styles.statusTabs}>
        {statusFilters.map((filter) => {
          const selected = statusFilter === filter.value;

          return (
            <Pressable
              accessibilityRole="button"
              key={filter.value}
              onPress={() => setStatusFilter(filter.value)}
              style={[
                styles.statusTab,
                {
                  backgroundColor: selected ? colors.court : colors.surface,
                  borderColor: selected ? colors.court : colors.line,
                },
              ]}>
              <Text style={[styles.statusTabText, { color: selected ? '#ffffff' : colors.ink }]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.court} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading matches with your team...</Text>
        </Card>
      ) : visibleMatches.length ? (
        <View style={styles.matchList}>
          {visibleMatches.map((match) => (
            <MatchOption
              key={match.id}
              match={match}
              scores={matchScores}
              logged={reflectedMatchIds.has(String(match.id))}
              onLogPress={() => openReflectionModal(match)}
              onViewPress={() => openLoggedReflection(match)}
            />
          ))}
        </View>
      ) : (
        <Card>
          <ListRow
            detail={statusFilter === 'pending'
              ? 'Completed matches without reflections will appear here.'
              : 'Saved match reflections will appear here.'}
            icon={statusFilter === 'pending' ? 'sports-volleyball' : 'history'}
            title={statusFilter === 'pending' ? 'No pending reflections' : 'No logged reflections'}
          />
        </Card>
      )}

      <SectionTitle>Recent reflections</SectionTitle>
      <Card>
        {logs.filter(isMatchReflection).slice(0, 3).map((log) => {
          const match = matches.find((item) => item.id === log.match_id);

          return (
            <ListRow
              detail={`Effort ${log.rpe}/10 - Energy ${log.energy_level}/10 - Focus ${log.focus_level ?? '-'}/10`}
              icon="edit-note"
              key={log.id}
              meta={log.created_at ? dateKey(log.created_at) : undefined}
              title={match ? `vs ${match.opponent_name}` : 'Match reflection'}
            />
          );
        })}
        {!logs.filter(isMatchReflection).length ? (
          <ListRow detail="Your post-match reflections will appear here." icon="history" title="No reflections yet" />
        ) : null}
      </Card>

      <Modal
        animationType="slide"
        onRequestClose={() => setReflectionModalVisible(false)}
        transparent
        visible={reflectionModalVisible}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close performance reflection"
            onPress={() => setReflectionModalVisible(false)}
            style={styles.modalScrim}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            style={styles.keyboardAvoider}>
            <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleGroup}>
                  <Text style={[styles.modalTitle, { color: colors.ink }]}>Match Reflection</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                    {selectedMatch ? `vs ${selectedMatch.opponent_name} - ${dateKey(selectedMatch.match_date)}` : 'Selected match'}
                    {selectedLog?.created_at ? ` - Logged ${dateKey(selectedLog.created_at)}` : ''}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close performance reflection"
                  onPress={() => setReflectionModalVisible(false)}
                  style={[styles.closeButton, { backgroundColor: colors.wash, borderColor: colors.line }]}>
                  <MaterialIcons name="close" size={21} color={colors.muted} />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <SectionTitle>Player reflection</SectionTitle>
                <Card style={styles.formCard}>
                  <Field
                    editable={reflectionMode !== 'view'}
                    label="Effort level (1-10)"
                    onChangeText={setEffort}
                    value={effort}
                  />
                  <Field
                    editable={reflectionMode !== 'view'}
                    label="Energy level (1-10)"
                    onChangeText={setEnergy}
                    value={energy}
                  />
                  <Field
                    editable={reflectionMode !== 'view'}
                    label="Confidence (1-10)"
                    onChangeText={setConfidence}
                    value={confidence}
                  />
                  <Field
                    editable={reflectionMode !== 'view'}
                    label="Focus (1-10)"
                    onChangeText={setFocus}
                    value={focus}
                  />
                </Card>

                <SectionTitle>Body condition</SectionTitle>
                <View style={styles.conditionGrid}>
                  {bodyConditions.map((condition) => {
                    const selected = bodyCondition === condition.value;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        disabled={reflectionMode === 'view'}
                        key={condition.value}
                        onPress={() => setBodyCondition(condition.value)}
                        style={[
                          styles.conditionButton,
                          {
                            backgroundColor: selected ? colors.court : colors.surface,
                            borderColor: selected ? colors.court : colors.line,
                          },
                        ]}>
                        <Text style={[styles.conditionText, { color: selected ? '#ffffff' : colors.ink }]}>
                          {condition.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <SectionTitle>Notes</SectionTitle>
                <TextInput
                  multiline
                  onChangeText={setNotes}
                  editable={reflectionMode !== 'view'}
                  placeholder="How did you feel during the match? Mention confidence, focus, pain, or anything coach should know."
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.notes,
                    { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink },
                  ]}
                  textAlignVertical="top"
                  value={notes}
                />

                {reflectionMode === 'create' ? (
                  <PrimaryButton
                    disabled={saving || !player?.id || !selectedMatch}
                    icon="save"
                    onPress={submitReflection}
                    title={saving ? 'Saving...' : 'Save performance reflection'}
                  />
                ) : null}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

function MatchOption({
  match,
  scores,
  logged,
  onLogPress,
  onViewPress,
}: {
  match: Match;
  scores: MatchScore[];
  logged: boolean;
  onLogPress: () => void;
  onViewPress: () => void;
}) {
  const { colors } = useNetmindTheme();
  const outcome = getMatchOutcome(match, scores);
  const outcomeColor = getOutcomeColor(outcome, colors);
  const outcomeCardStyle = outcome === 'Win' || outcome === 'Lose'
    ? {
        borderColor: outcomeColor,
        shadowColor: outcomeColor,
        shadowOpacity: logged ? 0.18 : 0.1,
        shadowRadius: logged ? 10 : 6,
      }
    : null;

  return (
    <View
      style={[
        styles.matchCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
        outcomeCardStyle,
      ]}>
      <View style={styles.matchIcon}>
        <MaterialIcons name={logged ? 'check-circle' : 'sports-volleyball'} size={22} color={outcomeColor} />
      </View>
      <View style={styles.matchBody}>
        <Text style={[styles.matchTitle, { color: colors.ink }]}>vs {match.opponent_name}</Text>
        <Text style={[styles.matchMeta, { color: colors.muted }]}>
          {dateKey(match.match_date)} - {match.match_type || 'match'}
        </Text>
      </View>
      <Text style={[styles.resultPill, { color: outcomeColor }]}>{outcome}</Text>
      {logged ? (
        <Pressable
          accessibilityRole="button"
          onPress={onViewPress}
          style={[styles.viewButton, { backgroundColor: colors.wash, borderColor: colors.line }]}>
          <Text style={[styles.viewButtonText, { color: colors.court }]}>View</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={onLogPress}
          style={[styles.logButton, { backgroundColor: colors.court }]}>
          <Text style={styles.logButtonText}>Log</Text>
        </Pressable>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
}) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        editable={editable}
        keyboardType="number-pad"
        onChangeText={onChangeText}
        style={[
          styles.input,
          { backgroundColor: colors.wash, borderColor: colors.line, color: colors.ink },
        ]}
        value={value}
      />
    </View>
  );
}

function isValidScale(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

function dateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
}

function isCompletedMatch(match: Match, scores: MatchScore[]) {
  return Boolean(match.result) || hasMainScore(match) || getMatchScores(match, scores).some(hasScore);
}

function getMatchOutcome(match: Match, scores: MatchScore[]) {
  const scoredSets = getMatchScores(match, scores).filter(hasScore);

  if (scoredSets.length) {
    const wins = scoredSets.reduce(
      (total, score) => {
        const teamScore = Number(score.team_score);
        const opponentScore = Number(score.opponent_score);

        if (teamScore > opponentScore) return { ...total, team: total.team + 1 };
        if (teamScore < opponentScore) return { ...total, opponent: total.opponent + 1 };
        return total;
      },
      { team: 0, opponent: 0 }
    );

    if (wins.team > wins.opponent) return 'Win';
    if (wins.team < wins.opponent) return 'Lose';
    if (wins.team || wins.opponent) return 'Draw';
  }

  const result = String(match.result || '').toLowerCase();

  if (result === 'win') return 'Win';
  if (result === 'loss') return 'Lose';
  if (result === 'draw') return 'Draw';

  const teamScore = Number(match.team_score);
  const opponentScore = Number(match.opponent_score);

  if (Number.isNaN(teamScore) || Number.isNaN(opponentScore)) return 'Done';
  if (teamScore > opponentScore) return 'Win';
  if (teamScore < opponentScore) return 'Lose';
  return 'Draw';
}

function getMatchScores(match: Match, scores: MatchScore[]) {
  return scores.filter((score) => String(score.match_id) === String(match.id));
}

function hasScore(score: MatchScore) {
  return score.team_score != null && score.opponent_score != null;
}

function hasMainScore(match: Match) {
  return match.team_score != null && match.opponent_score != null;
}

function isMatchReflection(log: PerformanceLog) {
  return log.session_type === 'match' && log.action_type === 'reflection' && log.match_id != null;
}

function getOutcomeColor(outcome: string, colors: ReturnType<typeof useNetmindTheme>['colors']) {
  if (outcome === 'Win') return colors.court;
  if (outcome === 'Lose') return colors.coral;
  if (outcome === 'Draw') return colors.gold;
  return colors.muted;
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusTabs: {
    flexDirection: 'row',
    gap: 10,
  },
  statusTab: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  statusTabText: {
    fontSize: 14,
    fontWeight: '900',
  },
  matchList: {
    gap: 10,
  },
  matchCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 68,
    padding: 12,
  },
  matchIcon: {
    width: 24,
  },
  matchBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  matchMeta: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  resultPill: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  loggedPill: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  viewButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  logButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  logButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 18, 25, 0.58)',
  },
  keyboardAvoider: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  modalSheet: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    maxHeight: '88%',
    padding: 16,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  modalTitleGroup: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modalContent: {
    gap: 16,
    paddingBottom: 18,
    paddingTop: 16,
  },
  formCard: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: '900',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  conditionButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: '46%',
    paddingHorizontal: 12,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '900',
  },
  notes: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 118,
    padding: 14,
  },
});
