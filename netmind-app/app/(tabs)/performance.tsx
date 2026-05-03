import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, ProgressBar, Screen, SectionTitle } from '@/components/netmind-ui';
import { palette, performanceMetrics } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';

const skillSliders = [
  { label: 'Attack power', value: 82, color: palette.coral },
  { label: 'Serve control', value: 76, color: palette.blue },
  { label: 'Defense focus', value: 88, color: palette.court },
];

export default function PerformanceScreen() {
  const [notes, setNotes] = useState('Felt strong on cross-court attacks. Need faster block recovery.');
  const { colors } = useNetmindTheme();

  return (
    <Screen title="Log Performance" subtitle="Record match or training data while the session is fresh.">
      <SectionTitle>Quick actions</SectionTitle>
      <View style={styles.actionGrid}>
        <PrimaryButton icon="sports-volleyball" title="Match" />
        <PrimaryButton icon="fitness-center" title="Training" variant="outline" />
      </View>

      <SectionTitle>Session totals</SectionTitle>
      <View style={styles.metrics}>
        {performanceMetrics.map((metric) => (
          <Card key={metric.label} style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.ink }]}>{metric.value}</Text>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>{metric.label}</Text>
          </Card>
        ))}
      </View>

      <SectionTitle>Skill sliders</SectionTitle>
      <Card style={styles.sliderCard}>
        {skillSliders.map((item) => (
          <View key={item.label} style={styles.sliderRow}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: colors.ink }]}>{item.label}</Text>
              <Text style={[styles.sliderValue, { color: colors.muted }]}>{item.value}%</Text>
            </View>
            <ProgressBar color={item.color} value={item.value} />
          </View>
        ))}
      </Card>

      <SectionTitle>Coach notes</SectionTitle>
      <TextInput
        multiline
        onChangeText={setNotes}
        placeholderTextColor={colors.muted}
        style={[
          styles.notes,
          { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink },
        ]}
        textAlignVertical="top"
        value={notes}
      />
      <PrimaryButton icon="save" title="Save performance log" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    minWidth: '47%',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  sliderCard: {
    gap: 16,
  },
  sliderRow: {
    gap: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontWeight: '800',
  },
  sliderValue: {
    fontWeight: '800',
  },
  notes: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 118,
    padding: 14,
  },
});
