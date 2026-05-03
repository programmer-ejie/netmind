import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { Card, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { injuryChecklist } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';

export default function InjuryScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState('2');
  const [notes, setNotes] = useState('');
  const { colors } = useNetmindTheme();

  const toggleArea = (area: string) => {
    setSelected((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area]
    );
  };

  return (
    <Screen title="Report Injury" subtitle="Flag pain or discomfort early so trainers can respond on the website.">
      <SectionTitle>Body check</SectionTitle>
      <Card style={styles.checkCard}>
        {injuryChecklist.map((area) => {
          const active = selected.includes(area);

          return (
            <Pressable
              key={area}
              onPress={() => toggleArea(area)}
              style={[
                styles.checkRow,
                {
                  backgroundColor: active ? colors.courtSoft : colors.wash,
                  borderColor: active ? colors.court : colors.line,
                },
              ]}>
              <Text style={[styles.checkText, { color: colors.ink }]}>{area}</Text>
              <Text style={[styles.checkMark, { color: active ? colors.court : colors.muted }]}>
                {active ? 'Selected' : 'Clear'}
              </Text>
            </Pressable>
          );
        })}
      </Card>

      <SectionTitle>Severity</SectionTitle>
      <Card style={styles.formCard}>
        <Text style={[styles.label, { color: colors.muted }]}>Pain level (0-10)</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setSeverity}
          style={[
            styles.input,
            { backgroundColor: colors.wash, borderColor: colors.line, color: colors.ink },
          ]}
          value={severity}
        />
      </Card>

      <SectionTitle>Details</SectionTitle>
      <TextInput
        multiline
        onChangeText={setNotes}
        placeholder="Describe what happened, where it hurts, and when it started."
        placeholderTextColor={colors.muted}
        style={[
          styles.notes,
          { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink },
        ]}
        textAlignVertical="top"
        value={notes}
      />
      <PrimaryButton icon="health-and-safety" title="Submit injury report" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkCard: {
    gap: 10,
  },
  checkRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  checkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '900',
  },
  formCard: {
    gap: 8,
  },
  label: {
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
    minHeight: 132,
    padding: 14,
  },
});
