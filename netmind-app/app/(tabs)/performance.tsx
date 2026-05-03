import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { performanceMetrics } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';

const logTypes = ['Spike', 'Jump', 'Run'] as const;

export default function PerformanceScreen() {
  const [activeLog, setActiveLog] = useState<(typeof logTypes)[number]>('Spike');
  const [spikes, setSpikes] = useState('24');
  const [jump, setJump] = useState('59');
  const [runKm, setRunKm] = useState('3.8');
  const [notes, setNotes] = useState('Felt strong on cross-court attacks. Need faster landing control.');
  const { colors } = useNetmindTheme();

  return (
    <Screen title="Log Performance" subtitle="Self-log spike, jump, and run data after training or matches.">
      <SectionTitle>Log type</SectionTitle>
      <View style={styles.actionGrid}>
        {logTypes.map((item) => {
          const selected = activeLog === item;

          return (
            <Pressable
              key={item}
              onPress={() => setActiveLog(item)}
              style={[
                styles.typeButton,
                {
                  backgroundColor: selected ? colors.court : colors.surface,
                  borderColor: selected ? colors.court : colors.line,
                },
              ]}>
              <Text style={[styles.typeButtonText, { color: selected ? '#ffffff' : colors.ink }]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Today</SectionTitle>
      <View style={styles.metrics}>
        {performanceMetrics.map((metric) => (
          <Card key={metric.label} style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.ink }]}>{metric.value}</Text>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>{metric.label}</Text>
          </Card>
        ))}
      </View>

      <SectionTitle>Player inputs</SectionTitle>
      <Card style={styles.formCard}>
        <Field label="Spike count" onChangeText={setSpikes} value={spikes} />
        <Field label="Best jump height (cm)" onChangeText={setJump} value={jump} />
        <Field label="Run distance (km)" onChangeText={setRunKm} value={runKm} />
      </Card>

      <SectionTitle>Player notes</SectionTitle>
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

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
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

const styles = StyleSheet.create({
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '900',
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
  notes: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 118,
    padding: 14,
  },
});
