import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ProgressBar, Screen, SectionTitle } from '@/components/netmind-ui';
import { palette, trainingTasks } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';

export default function TrainingScreen() {
  const { colors, isDark } = useNetmindTheme();
  const [completedTitles, setCompletedTitles] = useState(
    trainingTasks.filter((task) => task.completed).map((task) => task.title)
  );
  const pending = trainingTasks.filter((task) => !completedTitles.includes(task.title));
  const completed = trainingTasks.filter((task) => task.completed);

  return (
    <Screen title="Training Tasks" subtitle="Pending and completed assignments from your coaching staff.">
      <SectionTitle>Pending</SectionTitle>
      {pending.map((task) => (
        <Card key={task.title} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={[styles.taskTitle, { color: colors.ink }]}>{task.title}</Text>
            <Text style={styles.badge}>{task.due}</Text>
          </View>
          <ProgressBar color={palette.gold} value={task.progress} />
          <Text style={[styles.progressText, { color: colors.muted }]}>{task.progress}% complete</Text>
          <Pressable
            onPress={() => setCompletedTitles((current) => [...current, task.title])}
            style={[styles.completeButton, { backgroundColor: colors.court }]}>
            <Text style={styles.completeButtonText}>Mark training complete</Text>
          </Pressable>
        </Card>
      ))}

      <SectionTitle>Completed</SectionTitle>
      {[...completed, ...trainingTasks.filter((task) => completedTitles.includes(task.title) && !task.completed)].map((task) => (
        <Card key={task.title} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={[styles.taskTitle, { color: colors.ink }]}>{task.title}</Text>
            <Text
              style={[
                styles.doneBadge,
                { backgroundColor: colors.courtSoft, color: isDark ? colors.courtMist : colors.courtDark },
              ]}>
              Done
            </Text>
          </View>
          <ProgressBar color={palette.aqua} value={100} />
          <Text style={[styles.progressText, { color: colors.muted }]}>{task.due}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  taskCard: {
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
  badge: {
    backgroundColor: '#fff4d7',
    borderRadius: 8,
    color: '#8a5a00',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  doneBadge: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  completeButton: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
