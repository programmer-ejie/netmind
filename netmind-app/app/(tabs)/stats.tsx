import { StyleSheet, Text, View } from 'react-native';

import { Card, MetricCard, MiniBarChart, ProgressBar, Screen, SectionTitle } from '@/components/netmind-ui';
import { jumpTrend, palette, strengths } from '@/constants/netmind';

export default function StatsScreen() {
  return (
    <Screen title="My Stats" subtitle="Track performance trends and where your training is paying off.">
      <View style={styles.metrics}>
        <MetricCard label="Kill rate" value="46%" delta="+8% this month" tone={palette.coral} />
        <MetricCard label="Avg jump" value="59cm" delta="+3cm" tone={palette.gold} />
      </View>

      <SectionTitle>Jump trend</SectionTitle>
      <Card>
        <MiniBarChart values={jumpTrend} />
        <Text style={styles.caption}>Last 7 sessions, measured in centimeters.</Text>
      </Card>

      <SectionTitle>Strengths</SectionTitle>
      <Card style={styles.strengthCard}>
        {strengths.map((item) => (
          <View key={item.label} style={styles.strengthRow}>
            <View style={styles.strengthHeader}>
              <Text style={styles.strengthLabel}>{item.label}</Text>
              <Text style={styles.strengthScore}>{item.score}</Text>
            </View>
            <ProgressBar value={item.score} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: 12,
  },
  caption: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  strengthCard: {
    gap: 16,
  },
  strengthRow: {
    gap: 8,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  strengthLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  strengthScore: {
    color: palette.court,
    fontWeight: '900',
  },
});
