import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, ProgressBar, Screen, SectionTitle } from '@/components/netmind-ui';
import { wellnessScores } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';

export default function WellnessScreen() {
  const [fatigue, setFatigue] = useState('4');
  const [rpe, setRpe] = useState('6');
  const [sleep, setSleep] = useState('7.5');
  const [notes, setNotes] = useState('Legs feel fresh. Slight shoulder tightness after serving.');
  const { colors } = useNetmindTheme();

  return (
    <Screen title="Wellness Log" subtitle="Submit fatigue, RPE, and sleep so trainers can review recovery.">
      <SectionTitle>Recovery snapshot</SectionTitle>
      <Card style={styles.scoreCard}>
        {wellnessScores.map((item) => (
          <View key={item.label} style={styles.scoreRow}>
            <View style={styles.scoreHeader}>
              <Text style={[styles.scoreLabel, { color: colors.ink }]}>{item.label}</Text>
              <Text style={[styles.scoreValue, { color: colors.muted }]}>
                {item.value}/{item.max}
              </Text>
            </View>
            <ProgressBar value={(item.value / item.max) * 100} />
          </View>
        ))}
      </Card>

      <SectionTitle>Today&apos;s check-in</SectionTitle>
      <Card style={styles.formCard}>
        <Field label="Fatigue (1-10)" onChangeText={setFatigue} value={fatigue} />
        <Field label="RPE (1-10)" onChangeText={setRpe} value={rpe} />
        <Field label="Sleep hours" onChangeText={setSleep} value={sleep} />
      </Card>

      <SectionTitle>Recovery notes</SectionTitle>
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
      <PrimaryButton icon="favorite" title="Submit wellness log" />
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
  scoreCard: {
    gap: 16,
  },
  scoreRow: {
    gap: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  scoreValue: {
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
