import { StyleSheet, Text, View } from 'react-native';

import { Card, ProgressBar, Screen, SectionTitle } from '@/components/netmind-ui';
import { palette, trainingTasks } from '@/constants/netmind';

export default function TrainingScreen() {
  const pending = trainingTasks.filter((task) => !task.completed);
  const completed = trainingTasks.filter((task) => task.completed);

  return (
    <Screen title="Training Tasks" subtitle="Pending and completed assignments from your coaching staff.">
      <SectionTitle>Pending</SectionTitle>
      {pending.map((task) => (
        <Card key={task.title} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.badge}>{task.due}</Text>
          </View>
          <ProgressBar color={palette.gold} value={task.progress} />
          <Text style={styles.progressText}>{task.progress}% complete</Text>
        </Card>
      ))}

      <SectionTitle>Completed</SectionTitle>
      {completed.map((task) => (
        <Card key={task.title} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.doneBadge}>Done</Text>
          </View>
          <ProgressBar color={palette.aqua} value={task.progress} />
          <Text style={styles.progressText}>{task.due}</Text>
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
    color: palette.ink,
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
    backgroundColor: palette.courtSoft,
    borderRadius: 8,
    color: palette.courtDark,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
});
