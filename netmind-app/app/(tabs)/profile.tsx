import { StyleSheet, Text, View } from 'react-native';

import { Card, MetricCard, Screen, SectionTitle } from '@/components/netmind-ui';
import { careerStats, currentPlayer, palette } from '@/constants/netmind';

export default function ProfileScreen() {
  return (
    <Screen title="Profile" subtitle="Player information, team identity, and career totals.">
      <Card style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{currentPlayer.number}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{currentPlayer.name}</Text>
          <Text style={styles.meta}>{currentPlayer.role}</Text>
          <Text style={styles.meta}>{currentPlayer.team}</Text>
        </View>
      </Card>

      <SectionTitle>Personal details</SectionTitle>
      <Card style={styles.details}>
        <Detail label="Height" value={currentPlayer.height} />
        <Detail label="Dominant hand" value={currentPlayer.dominantHand} />
        <Detail label="Season" value={currentPlayer.season} />
      </Card>

      <SectionTitle>Career stats</SectionTitle>
      <View style={styles.metrics}>
        {careerStats.map((stat) => (
          <MetricCard key={stat.label} label={stat.label} value={stat.value} tone={palette.blue} />
        ))}
      </View>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.court,
    borderRadius: 8,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  meta: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  details: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  detailLabel: {
    color: palette.muted,
    fontWeight: '800',
  },
  detailValue: {
    color: palette.ink,
    flex: 1,
    fontWeight: '900',
    textAlign: 'right',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
