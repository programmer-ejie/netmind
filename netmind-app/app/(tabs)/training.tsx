import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ProgressBar, Screen, SectionTitle } from '@/components/netmind-ui';
import { palette } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import { toLocalDateKey } from '@/lib/dateKeys';
import {
  listPlayerTrainingAssignments,
  updateTrainingAssignmentStatus,
  type NetmindUser,
  type TrainingAssignment,
} from '@/lib/api';

type AssignmentStatus = 'pending' | 'in_progress' | 'completed';
type TaskFilter = 'all' | AssignmentStatus;

const filterOptions: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Done' },
];

const formatDate = (value?: string | null) => {
  if (!value) return 'No due date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const getDueDateTime = (assignment: TrainingAssignment) => {
  if (!assignment.due_date) return Number.POSITIVE_INFINITY;

  const date = new Date(assignment.due_date);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;

  return date.getTime();
};

const getDateGroupKey = (assignment: TrainingAssignment) => {
  if (!assignment.due_date) return 'no-date';

  const date = new Date(assignment.due_date);
  if (Number.isNaN(date.getTime())) return `custom-${assignment.due_date}`;

  return toLocalDateKey(date);
};

const getDateGroupLabel = (assignment: TrainingAssignment) => formatDate(assignment.due_date);

const isPastDue = (assignment: TrainingAssignment) => {
  if (!assignment.due_date || getNormalizedStatus(assignment.status) === 'completed') return false;

  const dueDate = new Date(assignment.due_date);
  if (Number.isNaN(dueDate.getTime())) return false;

  dueDate.setHours(23, 59, 59, 999);
  return dueDate.getTime() < Date.now();
};

const getAssignmentTitle = (assignment: TrainingAssignment) => (
  assignment.drill_name || assignment.focus_area || 'Training assignment'
);

const getAssignmentProgress = (assignment: TrainingAssignment) => {
  if (assignment.status === 'completed') return 100;
  if (assignment.status === 'in_progress') return 50;
  return 0;
};

const getStatusLabel = (status?: string | null) => {
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In progress';
  return 'Not started';
};

const getNormalizedStatus = (status?: string | null): AssignmentStatus => {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in_progress';
  return 'pending';
};

const getNextProgressAction = (status?: string | null): {
  status: AssignmentStatus;
  label: string;
  helper: string;
  progress: number;
} => {
  if (status === 'completed') {
    return {
      status: 'pending',
      label: 'Reopen task',
      helper: 'Move this back to Not started if it was marked complete by mistake.',
      progress: 0,
    };
  }

  if (status === 'in_progress') {
    return {
      status: 'completed',
      label: 'Mark completed',
      helper: 'Finish the workflow and let your trainer see this as completed.',
      progress: 100,
    };
  }

  return {
    status: 'in_progress',
    label: 'Start progress',
    helper: 'Move this assignment into In progress when you begin the drill.',
    progress: 50,
  };
};

const getAssignmentDetail = (assignment: TrainingAssignment) => {
  const details = [
    assignment.focus_area,
    assignment.target_reps ? `${assignment.target_reps} reps` : '',
    assignment.target_success_rate ? `${assignment.target_success_rate}% target` : '',
  ].filter(Boolean);

  return details.join(' - ') || assignment.drill_description || 'Assigned by your training staff.';
};

const getTutorialUrl = (assignment?: TrainingAssignment | null) => {
  const rawUrl = assignment?.video_url?.trim();
  if (!rawUrl) return '';
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
};

export default function TrainingScreen() {
  const { colors } = useNetmindTheme();
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<TrainingAssignment | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');

  const loadAssignments = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const savedUser = await AsyncStorage.getItem('netmind_user');
      const user = savedUser ? JSON.parse(savedUser) as NetmindUser : null;

      if (!user?.id) {
        setAssignments([]);
        setError('Sign in again to load your training tasks.');
        return;
      }

      const rows = await listPlayerTrainingAssignments(user.id);
      setAssignments(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load training tasks.');
    } finally {
      if (mode === 'refresh') {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, [loadAssignments])
  );

  const updateProgress = async (assignmentId: number, status: AssignmentStatus) => {
    setUpdatingId(assignmentId);
    setError('');

    try {
      const updated = await updateTrainingAssignmentStatus(assignmentId, status);
      setAssignments((current) => current.map((assignment) => (
        assignment.id === assignmentId ? { ...assignment, ...updated } : assignment
      )));
      setSelectedAssignment((current) => (
        current?.id === assignmentId ? { ...current, ...updated } : current
      ));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update training task.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAssignments = assignments.filter((assignment) => (
    activeFilter === 'all' || getNormalizedStatus(assignment.status) === activeFilter
  ));
  const sortedAssignments = [...filteredAssignments].sort((first, second) => {
    const firstTime = getDueDateTime(first);
    const secondTime = getDueDateTime(second);

    if (firstTime !== secondTime) return firstTime - secondTime;

    return getAssignmentTitle(first).localeCompare(getAssignmentTitle(second));
  });
  const dateGroups = sortedAssignments.reduce<{
    key: string;
    label: string;
    assignments: TrainingAssignment[];
  }[]>((groups, assignment) => {
    const key = getDateGroupKey(assignment);
    const group = groups.find((currentGroup) => currentGroup.key === key);

    if (group) {
      group.assignments.push(assignment);
      return groups;
    }

    groups.push({
      key,
      label: getDateGroupLabel(assignment),
      assignments: [assignment],
    });

    return groups;
  }, []);
  const filterCounts = {
    all: assignments.length,
    pending: assignments.filter((assignment) => getNormalizedStatus(assignment.status) === 'pending').length,
    in_progress: assignments.filter((assignment) => getNormalizedStatus(assignment.status) === 'in_progress').length,
    completed: assignments.filter((assignment) => getNormalizedStatus(assignment.status) === 'completed').length,
  };
  const selectedProgress = selectedAssignment ? getAssignmentProgress(selectedAssignment) : 0;
  const nextAction = getNextProgressAction(selectedAssignment?.status);
  const isSavingSelected = updatingId === selectedAssignment?.id;
  const activeFilterLabel = filterOptions.find((option) => option.value === activeFilter)?.label || 'Tasks';

  const openTutorial = useCallback(async (assignment: TrainingAssignment) => {
    const tutorialUrl = getTutorialUrl(assignment);
    if (!tutorialUrl) return;

    try {
      const supported = await Linking.canOpenURL(tutorialUrl);
      if (!supported) {
        setError('Unable to open this tutorial link.');
        return;
      }

      await Linking.openURL(tutorialUrl);
    } catch {
      setError('Unable to open this tutorial link.');
    }
  }, []);

  return (
    <Screen
      onRefresh={() => loadAssignments('refresh')}
      refreshing={refreshing}
      title="Training Tasks"
      subtitle="Pending and completed assignments from your coaching staff.">
      {error ? <Text style={[styles.errorText, { color: palette.coral }]}>{error}</Text> : null}
      {loading ? (
        <Card style={styles.centerCard}>
          <ActivityIndicator color={colors.court} />
          <Text style={[styles.progressText, { color: colors.muted }]}>Loading training assignments...</Text>
        </Card>
      ) : null}

      <View style={styles.filterRow}>
        {filterOptions.map((option) => {
          const active = activeFilter === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => setActiveFilter(option.value)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: active ? colors.court : colors.surface,
                  borderColor: active ? colors.court : colors.line,
                },
                pressed ? styles.buttonPressed : null,
              ]}>
              <Text style={[styles.filterText, { color: active ? '#ffffff' : colors.ink }]}>
                {option.label}
              </Text>
              <Text style={[styles.filterCount, { color: active ? '#ffffff' : colors.muted }]}>
                {filterCounts[option.value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>{activeFilterLabel}</SectionTitle>
      {!loading && !filteredAssignments.length ? (
        <Card style={styles.taskCard}>
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>No training tasks here</Text>
          <Text style={[styles.progressText, { color: colors.muted }]}>
            Try another status filter or wait for a new trainer assignment.
          </Text>
        </Card>
      ) : null}
      {dateGroups.map((group) => (
        <View key={group.key} style={styles.dateGroup}>
          <View style={styles.dateGroupHeader}>
            <Text style={[styles.dateGroupLabel, { color: colors.ink }]}>{group.label}</Text>
            <Text style={[styles.dateGroupCount, { color: colors.muted }]}>
              {group.assignments.length} {group.assignments.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>

          <View style={styles.dateGroupList}>
            {group.assignments.map((assignment) => {
              const isUpdating = updatingId === assignment.id;
              const status = getNormalizedStatus(assignment.status);
              const overdue = isPastDue(assignment);
              const statusColor = status === 'completed'
                ? palette.aqua
                : overdue
                  ? palette.coral
                : status === 'in_progress'
                  ? palette.gold
                  : colors.court;

              return (
                <Pressable
                  key={assignment.id}
                  disabled={isUpdating}
                  onPress={() => setSelectedAssignment(assignment)}
                  style={({ pressed }) => pressed ? styles.cardPressed : null}>
                  <Card style={[styles.compactTaskCard, overdue ? styles.overdueTaskCard : null]}>
                    <View style={styles.taskHeader}>
                      <Text numberOfLines={1} style={[styles.taskTitle, { color: colors.ink }]}>
                        {getAssignmentTitle(assignment)}
                      </Text>
                      <Text style={overdue ? styles.overdueBadge : styles.badge}>
                        {overdue ? 'Overdue' : formatDate(assignment.due_date)}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.compactDetail, { color: colors.muted }]}>
                      {getAssignmentDetail(assignment)}
                    </Text>
                    {overdue ? (
                      <Text style={styles.overdueText}>Past due since {formatDate(assignment.due_date)}</Text>
                    ) : null}
                    {getTutorialUrl(assignment) ? (
                      <Pressable
                        onPress={() => openTutorial(assignment)}
                        style={({ pressed }) => [
                          styles.tutorialButton,
                          { backgroundColor: colors.wash, borderColor: colors.line },
                          pressed ? styles.buttonPressed : null,
                        ]}>
                        <MaterialIcons name="play-circle-outline" size={18} color={colors.court} />
                        <Text style={[styles.tutorialButtonText, { color: colors.court }]}>Watch tutorial</Text>
                      </Pressable>
                    ) : null}
                    <View style={styles.statusRow}>
                      <Text style={[styles.progressText, { color: colors.muted }]}>
                        {getAssignmentProgress(assignment)}% complete
                      </Text>
                      <Text
                        style={[
                          styles.statusPillSmall,
                          {
                            backgroundColor: status === 'completed' ? colors.courtSoft : colors.wash,
                            borderColor: statusColor,
                            color: status === 'completed' ? colors.court : statusColor,
                          },
                        ]}>
                        {isUpdating ? 'Saving...' : getStatusLabel(assignment.status)}
                      </Text>
                    </View>
                    <ProgressBar color={statusColor} value={getAssignmentProgress(assignment)} />
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedAssignment(null)}
        transparent
        visible={Boolean(selectedAssignment)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.progressModal, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>
              {selectedAssignment ? getAssignmentTitle(selectedAssignment) : 'Training task'}
            </Text>
            <Text style={[styles.modalDetail, { color: colors.muted }]}>
              {selectedAssignment ? getAssignmentDetail(selectedAssignment) : ''}
            </Text>
            <ProgressBar color={selectedProgress === 100 ? palette.aqua : palette.gold} value={selectedProgress} />
            <Text style={[styles.modalStatus, { color: colors.court }]}>
              Current: {selectedAssignment ? getStatusLabel(selectedAssignment.status) : ''}
            </Text>
            {selectedAssignment && isPastDue(selectedAssignment) ? (
              <View style={styles.modalWarning}>
                <Text style={styles.modalWarningTitle}>Overdue</Text>
                <Text style={styles.modalWarningText}>
                  This task was due {formatDate(selectedAssignment.due_date)}. Update progress when you start or finish it.
                </Text>
              </View>
            ) : null}
            {selectedAssignment && getTutorialUrl(selectedAssignment) ? (
              <Pressable
                onPress={() => openTutorial(selectedAssignment)}
                style={({ pressed }) => [
                  styles.modalTutorialButton,
                  { backgroundColor: colors.wash, borderColor: colors.line },
                  pressed ? styles.buttonPressed : null,
                ]}>
                <MaterialIcons name="smart-display" size={20} color={colors.court} />
                <Text style={[styles.modalTutorialText, { color: colors.court }]}>Watch tutorial</Text>
              </Pressable>
            ) : null}

            <View style={[styles.statusPanel, { backgroundColor: colors.wash, borderColor: colors.line }]}>
              <View style={styles.statusPanelHeader}>
                <Text style={[styles.statusPanelLabel, { color: colors.muted }]}>Status</Text>
                <Text style={[styles.statusPill, { backgroundColor: colors.courtSoft, color: colors.court }]}>
                  {selectedAssignment ? getStatusLabel(selectedAssignment.status) : ''}
                </Text>
              </View>
              <Text style={[styles.statusPanelHelper, { color: colors.muted }]}>{nextAction.helper}</Text>
              <Text style={[styles.levelPercent, { color: colors.court }]}>Next: {nextAction.progress}%</Text>
            </View>

            <Pressable
              disabled={!selectedAssignment || isSavingSelected}
              onPress={() => selectedAssignment && updateProgress(selectedAssignment.id, nextAction.status)}
              style={({ pressed }) => [
                styles.progressActionButton,
                { backgroundColor: colors.court },
                pressed || isSavingSelected ? styles.buttonPressed : null,
              ]}>
              <Text style={styles.progressActionText}>{isSavingSelected ? 'Saving...' : nextAction.label}</Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedAssignment(null)}
              style={[styles.closeButton, { borderColor: colors.line }]}>
              <Text style={[styles.closeButtonText, { color: colors.ink }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    gap: 10,
  },
  compactTaskCard: {
    gap: 9,
    padding: 12,
  },
  overdueTaskCard: {
    borderColor: palette.coral,
  },
  cardPressed: {
    opacity: 0.82,
  },
  centerCard: {
    alignItems: 'center',
    gap: 10,
  },
  taskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  compactDetail: {
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#fff4d7',
    borderRadius: 8,
    color: '#8a5a00',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overdueBadge: {
    backgroundColor: '#fff0ee',
    borderRadius: 8,
    color: '#b83225',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overdueText: {
    color: '#b83225',
    fontSize: 12,
    fontWeight: '900',
  },
  tutorialButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  tutorialButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statusPillSmall: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '900',
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '900',
  },
  dateGroup: {
    gap: 9,
  },
  dateGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  dateGroupLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  dateGroupCount: {
    fontSize: 12,
    fontWeight: '900',
  },
  dateGroupList: {
    gap: 10,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 37, 44, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  progressModal: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalDetail: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  modalStatus: {
    fontSize: 13,
    fontWeight: '900',
  },
  modalWarning: {
    backgroundColor: '#fff0ee',
    borderColor: palette.coral,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  modalWarningTitle: {
    color: '#b83225',
    fontSize: 13,
    fontWeight: '900',
  },
  modalWarningText: {
    color: '#8d2a21',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  modalTutorialButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modalTutorialText: {
    fontSize: 14,
    fontWeight: '900',
  },
  statusPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  statusPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPanelLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusPanelHelper: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  statusPill: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  levelPercent: {
    fontSize: 13,
    fontWeight: '900',
  },
  progressActionButton: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  progressActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
