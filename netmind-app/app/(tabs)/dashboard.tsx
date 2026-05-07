import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Card, ListRow, MetricCard, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { currentPlayer, dashboardStats, pendingTasks, recentActivity } from '@/constants/netmind';

export default function DashboardScreen() {
  return (
    <Screen
      title="Dashboard"
      subtitle={`${currentPlayer.name} - ${currentPlayer.role} for ${currentPlayer.team}`}>
      <View style={styles.metrics}>
        {dashboardStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          icon="add-chart"
          onPress={() => router.push('/(tabs)/performance')}
          title="Log match reflection"
        />
        <PrimaryButton
          icon="favorite"
          onPress={() => router.push('/(tabs)/wellness')}
          title="Log fatigue, RPE, sleep"
          variant="outline"
        />
      </View>

      <SectionTitle>Recent activity</SectionTitle>
      <Card>
        {recentActivity.slice(0, 3).map((item) => (
          <ListRow
            detail={item.detail}
            icon="notifications-none"
            key={item.title}
            meta={item.time}
            title={item.title}
          />
        ))}
      </Card>

      <SectionTitle>Pending tasks</SectionTitle>
      <Card>
        {pendingTasks.map((item) => (
          <ListRow detail={item.due} icon="schedule" key={item.task} meta={item.status} title={item.task} />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actions: {
    gap: 10,
  },
});
