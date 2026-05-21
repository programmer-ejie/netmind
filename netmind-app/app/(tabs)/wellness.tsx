import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, PrimaryButton, ProgressBar, Screen, SectionTitle } from '@/components/netmind-ui';
import { injuryChecklist } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import { toLocalDateKey } from '@/lib/dateKeys';
import {
  listPlayerWellnessCheckIns,
  reportPlayerInjury,
  submitPlayerWellnessCheckIn,
  type NetmindUser,
  type WellnessCheckIn,
} from '@/lib/api';

export default function WellnessScreen() {
  const today = useMemo(() => new Date(), []);
  const todayKey = toLocalDateKey(today);
  const monthKey = todayKey.slice(0, 7);
  const [fatigue, setFatigue] = useState('');
  const [rpe, setRpe] = useState('');
  const [sleep, setSleep] = useState('');
  const [player, setPlayer] = useState<NetmindUser | null>(null);
  const [checkIns, setCheckIns] = useState<WellnessCheckIn[]>([]);
  const [checkedInDates, setCheckedInDates] = useState<string[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [savingInjury, setSavingInjury] = useState(false);
  const [message, setMessage] = useState('');
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [injuryModalVisible, setInjuryModalVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState('0');
  const [notes, setNotes] = useState('');
  const [injuryNotes, setInjuryNotes] = useState('');
  const { colors } = useNetmindTheme();
  const latestCheckIn = checkIns[0] || null;
  const snapshotScores = latestCheckIn ? [
    { label: 'Fatigue', value: Number(latestCheckIn.fatigue_level), max: 10 },
    { label: 'RPE', value: Number(latestCheckIn.rpe), max: 10 },
    { label: 'Sleep', value: Number(latestCheckIn.sleep_hours), max: 10 },
  ] : [];

  const loadCheckIns = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoadingCheckIns(true);
    }
    setMessage('');

    try {
      const saved = await AsyncStorage.getItem('netmind_user');
      const savedUser = saved ? JSON.parse(saved) as NetmindUser : null;

      setPlayer(savedUser);

      if (!savedUser?.id) {
        setCheckedInDates([]);
        setMessage('Sign in again to load wellness check-ins.');
        return;
      }

      const rows = await listPlayerWellnessCheckIns(savedUser.id, monthKey);

      setCheckIns(rows);
      setCheckedInDates(rows.map((row) => dateKeyFromValue(row.checkin_date)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load wellness check-ins.');
    } finally {
      setLoadingCheckIns(false);
      setRefreshing(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadCheckIns();
  }, [loadCheckIns]);

  const toggleArea = (area: string) => {
    setSelected((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area]
    );
  };

  const openTodayCheckIn = () => {
    const existingToday = checkIns.find((checkIn) => dateKeyFromValue(checkIn.checkin_date) === todayKey);

    setFatigue(existingToday ? String(existingToday.fatigue_level) : '');
    setRpe(existingToday ? String(existingToday.rpe) : '');
    setSleep(existingToday ? String(existingToday.sleep_hours) : '');
    setNotes(existingToday?.notes || '');
    setCheckInModalVisible(true);
  };

  const submitWellnessLog = async () => {
    if (!player?.id || savingCheckIn) return;

    const fatigueLevel = Number(fatigue);
    const rpeLevel = Number(rpe);
    const sleepHours = Number(sleep);

    if (!isValidRange(fatigueLevel, 1, 10) || !isValidRange(rpeLevel, 1, 10) || !isValidRange(sleepHours, 0, 24)) {
      setMessage('Enter fatigue 1-10, RPE 1-10, and valid sleep hours.');
      return;
    }

    setSavingCheckIn(true);
    setMessage('');

    try {
      const saved = await submitPlayerWellnessCheckIn(player.id, {
        checkin_date: todayKey,
        fatigue_level: fatigueLevel,
        rpe: rpeLevel,
        sleep_hours: sleepHours,
        notes: notes.trim() || null,
      });
      const savedDate = dateKeyFromValue(saved.checkin_date);

      setCheckIns((current) => {
        const withoutSavedDate = current.filter((checkIn) => dateKeyFromValue(checkIn.checkin_date) !== savedDate);
        return [saved, ...withoutSavedDate].sort((first, second) => (
          dateKeyFromValue(second.checkin_date).localeCompare(dateKeyFromValue(first.checkin_date))
        ));
      });
      setCheckedInDates((dates) => dates.includes(savedDate) ? dates : [...dates, savedDate]);
      setCheckInModalVisible(false);
      setMessage('Wellness check-in saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save wellness check-in.');
    } finally {
      setSavingCheckIn(false);
    }
  };

  const submitInjuryReport = async () => {
    if (!player?.id || savingInjury) return;

    setSavingInjury(true);
    setMessage('');

    try {
      await reportPlayerInjury(player.id, {
        injury_type: selected[0] || 'Player reported pain',
        body_part: getBodyPart(selected[0]),
        severity: getSeverity(severity),
        occurred_at: todayKey,
        reported_by: player.id,
        notes: [selected.length ? `Areas: ${selected.join(', ')}` : '', injuryNotes.trim()]
          .filter(Boolean)
          .join('\n') || null,
      });

      setInjuryModalVisible(false);
      setMessage('Injury report submitted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit injury report.');
    } finally {
      setSavingInjury(false);
    }
  };

  return (
    <Screen
      onRefresh={() => loadCheckIns('refresh')}
      refreshing={refreshing}
      title="Wellness Log"
      subtitle="Submit fatigue, RPE, and sleep so trainers can review recovery.">
      <View style={styles.topAction}>
        <PrimaryButton
          icon="health-and-safety"
          onPress={() => setInjuryModalVisible(true)}
          title="Report an injury"
          variant="outline"
        />
      </View>

      {message ? (
        <View style={[styles.notice, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
          <Text style={[styles.noticeText, { color: colors.ink }]}>{message}</Text>
        </View>
      ) : null}

      <SectionTitle>Recovery snapshot</SectionTitle>
      <Card style={styles.scoreCard}>
        <Text style={[styles.snapshotMeta, { color: colors.muted }]}>
          {latestCheckIn ? `Latest check-in: ${dateKeyFromValue(latestCheckIn.checkin_date)}` : 'No saved check-in yet.'}
        </Text>
        {snapshotScores.map((item) => (
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
      {loadingCheckIns ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.court} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading check-in calendar...</Text>
        </Card>
      ) : (
        <CheckInCalendar
          checkedInDates={checkedInDates}
          onTodayPress={openTodayCheckIn}
          today={today}
        />
      )}
      <RecoveryAdvice checkIn={latestCheckIn} />

      <Modal
        animationType="slide"
        onRequestClose={() => setCheckInModalVisible(false)}
        transparent
        visible={checkInModalVisible}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close wellness check-in"
            onPress={() => setCheckInModalVisible(false)}
            style={styles.modalScrim}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            style={styles.keyboardAvoider}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={[styles.modalTitle, { color: colors.ink }]}>Today&apos;s Check-In</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  The yellow calendar number is today&apos;s date. Enter your wellness values below.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close wellness check-in"
                onPress={() => setCheckInModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: colors.wash, borderColor: colors.line }]}>
                <MaterialIcons name="close" size={21} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Card style={styles.formCard}>
                <Field label="Fatigue (1-10)" onChangeText={setFatigue} value={fatigue} />
                <Field label="RPE (1-10)" onChangeText={setRpe} value={rpe} />
                <Field label="Sleep hours" onChangeText={setSleep} value={sleep} />
              </Card>

              <SectionTitle>Recovery notes</SectionTitle>
              <TextInput
                multiline
                onChangeText={setNotes}
                placeholder="Add recovery notes or anything trainers should review."
                placeholderTextColor={colors.muted}
                style={[
                  styles.notes,
                  { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink },
                ]}
                textAlignVertical="top"
                value={notes}
              />
              <PrimaryButton
                disabled={savingCheckIn || !player?.id}
                icon="favorite"
                onPress={submitWellnessLog}
                title={savingCheckIn ? 'Saving...' : 'Submit wellness log'}
              />
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setInjuryModalVisible(false)}
        transparent
        visible={injuryModalVisible}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close injury report"
            onPress={() => setInjuryModalVisible(false)}
            style={styles.modalScrim}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            style={styles.keyboardAvoider}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={[styles.modalTitle, { color: colors.ink }]}>Report an Injury</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  Flag pain or discomfort early so trainers can respond.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close injury report"
                onPress={() => setInjuryModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: colors.wash, borderColor: colors.line }]}>
                <MaterialIcons name="close" size={21} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
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

              <SectionTitle>Pain level</SectionTitle>
              <Card style={styles.formCard}>
                <Field label="Pain level (0-10)" onChangeText={setSeverity} value={severity} />
              </Card>

              <SectionTitle>Injury details</SectionTitle>
              <TextInput
                multiline
                onChangeText={setInjuryNotes}
                placeholder="Describe what happened, where it hurts, and when it started."
                placeholderTextColor={colors.muted}
                style={[
                  styles.notes,
                  { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink },
                ]}
                textAlignVertical="top"
                value={injuryNotes}
              />
              <PrimaryButton
                disabled={savingInjury || !player?.id}
                icon="health-and-safety"
                onPress={submitInjuryReport}
                title={savingInjury ? 'Submitting...' : 'Submit injury report'}
              />
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

function RecoveryAdvice({ checkIn }: { checkIn: WellnessCheckIn | null }) {
  const { colors } = useNetmindTheme();
  const advice = getRecoveryAdvice(checkIn);

  return (
    <Card style={styles.adviceCard}>
      <View style={styles.adviceHeader}>
        <MaterialIcons name="tips-and-updates" size={20} color={colors.court} />
        <Text style={[styles.adviceTitle, { color: colors.ink }]}>Recovery advice</Text>
      </View>
      {advice.map((item) => (
        <View key={item.title} style={[styles.adviceItem, { borderColor: colors.line }]}>
          <Text style={[styles.adviceItemTitle, { color: colors.ink }]}>{item.title}</Text>
          <Text style={[styles.adviceText, { color: colors.muted }]}>{item.detail}</Text>
        </View>
      ))}
    </Card>
  );
}

function CheckInCalendar({
  checkedInDates,
  onTodayPress,
  today,
}: {
  checkedInDates: string[];
  onTodayPress: () => void;
  today: Date;
}) {
  const { colors } = useNetmindTheme();
  const todayKey = toLocalDateKey(today);
  const checkedIn = new Set(checkedInDates);
  const days = buildCalendarDays(today);
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Card style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Text style={[styles.calendarTitle, { color: colors.ink }]}>{monthLabel}</Text>
        <Text style={[styles.calendarHint, { color: colors.muted }]}>Click the yellow one to check in.</Text>
        <View style={styles.legend}>
          <LegendItem color={colors.gold} label="Today" />
          <LegendItem color={colors.court} label="Checked" />
          <LegendItem color={colors.coral} label="Missed" />
        </View>
      </View>

      <View style={styles.weekHeader}>
        {weekdays.map((day, index) => (
          <Text key={`${day}-${index}`} style={[styles.weekday, { color: colors.muted }]}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {days.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;

          const dayKey = toLocalDateKey(day);
          const isToday = dayKey === todayKey;
          const isChecked = checkedIn.has(dayKey);
          const isPast = day < startOfDay(today);
          const statusColor = isChecked ? colors.court : isToday ? colors.gold : isPast ? colors.coral : colors.wash;
          const textColor = isChecked || isToday || isPast ? '#ffffff' : colors.muted;
          const borderColor = isChecked ? colors.court : isToday ? colors.gold : colors.line;
          const DayContainer = isToday ? Pressable : View;

          return (
            <DayContainer
              accessibilityLabel={isToday ? 'Open today wellness check-in' : undefined}
              accessibilityRole={isToday ? 'button' : undefined}
              key={dayKey}
              onPress={isToday ? onTodayPress : undefined}
              style={[
                styles.dayCell,
                {
                  backgroundColor: statusColor,
                  borderColor,
                },
              ]}>
              <Text style={[styles.dayText, { color: textColor }]}>{day.getDate()}</Text>
            </DayContainer>
          );
        })}
      </View>
    </Card>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.muted }]}>{label}</Text>
    </View>
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

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildCalendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array(firstDay.getDay()).fill(null);

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKeyFromValue(value: string | Date) {
  if (typeof value === 'string') return value.slice(0, 10);
  return toLocalDateKey(value);
}

function isValidRange(value: number, min: number, max: number) {
  return !Number.isNaN(value) && value >= min && value <= max;
}

function getRecoveryAdvice(checkIn: WellnessCheckIn | null) {
  if (!checkIn) {
    return [{
      title: 'Check in first',
      detail: 'Tap today’s yellow date and submit fatigue, RPE, and sleep to get recovery advice.',
    }];
  }

  const fatigue = Number(checkIn.fatigue_level);
  const rpe = Number(checkIn.rpe);
  const sleep = Number(checkIn.sleep_hours);

  return [
    getFatigueAdvice(fatigue),
    getRpeAdvice(rpe),
    getSleepAdvice(sleep),
    getCombinedAdvice(fatigue, rpe, sleep),
  ];
}

function getFatigueAdvice(value: number) {
  if (value <= 2) {
    return {
      title: 'Fatigue is low',
      detail: 'You can handle normal training. Keep warm-ups sharp and continue regular hydration.',
    };
  }

  if (value <= 4) {
    return {
      title: 'Fatigue is manageable',
      detail: 'Do mobility after training and add light stretching for calves, hips, and shoulders.',
    };
  }

  if (value <= 6) {
    return {
      title: 'Fatigue is building',
      detail: 'Reduce extra reps today, cool down longer, and use ice on sore areas for 10-15 minutes.',
    };
  }

  if (value <= 8) {
    return {
      title: 'Fatigue is high',
      detail: 'Prioritize recovery work, avoid max jumps or heavy conditioning, and tell your trainer.',
    };
  }

  return {
    title: 'Fatigue is very high',
    detail: 'Take a recovery-focused day if possible. Hydrate, sleep early, and report any pain immediately.',
  };
}

function getRpeAdvice(value: number) {
  if (value <= 2) {
    return {
      title: 'Session load was light',
      detail: 'A short skill session or easy activation work is fine if your coach planned it.',
    };
  }

  if (value <= 4) {
    return {
      title: 'Session load was moderate-low',
      detail: 'Keep recovery simple: fluids, balanced meal, and a short stretch routine.',
    };
  }

  if (value <= 6) {
    return {
      title: 'Session load was moderate',
      detail: 'Watch your legs tomorrow. Add foam rolling and avoid unnecessary extra jumps.',
    };
  }

  if (value <= 8) {
    return {
      title: 'Session load was hard',
      detail: 'Use cooldown, ice sore joints if needed, and keep the next session controlled.',
    };
  }

  return {
    title: 'Session load was very hard',
    detail: 'Recovery should be the priority: no extra conditioning, early sleep, and trainer follow-up.',
  };
}

function getSleepAdvice(value: number) {
  if (value < 5) {
    return {
      title: 'Sleep is too low',
      detail: 'Keep training intensity conservative. Aim for a nap or earlier bedtime tonight.',
    };
  }

  if (value < 6.5) {
    return {
      title: 'Sleep is below target',
      detail: 'Hydrate early, limit late screen time, and avoid extra workload after practice.',
    };
  }

  if (value < 8) {
    return {
      title: 'Sleep is solid',
      detail: 'You are in a good range. Maintain your routine and refuel after training.',
    };
  }

  return {
    title: 'Sleep is strong',
    detail: 'Great recovery base. Keep the same sleep window and stay consistent.',
  };
}

function getCombinedAdvice(fatigue: number, rpe: number, sleep: number) {
  if (fatigue >= 7 && rpe >= 7) {
    return {
      title: 'Trainer flag',
      detail: 'High fatigue with high RPE means elevated recovery risk. Ask your trainer to adjust today’s load.',
    };
  }

  if (fatigue >= 6 && sleep < 6.5) {
    return {
      title: 'Recovery priority',
      detail: 'Fatigue plus low sleep suggests you need lighter volume, more fluids, and earlier rest.',
    };
  }

  if (rpe >= 8 && sleep >= 8) {
    return {
      title: 'Hard work, good base',
      detail: 'You handled a hard load with strong sleep. Still cool down and monitor soreness tomorrow.',
    };
  }

  return {
    title: 'Daily focus',
    detail: 'Keep notes honest. If pain appears, use Report an injury instead of waiting for the next check-in.',
  };
}

function getBodyPart(area?: string) {
  const normalized = String(area || '').toLowerCase();

  if (normalized.includes('ankle')) return 'ankle';
  if (normalized.includes('knee')) return 'knee';
  if (normalized.includes('shoulder')) return 'shoulder';
  if (normalized.includes('back')) return 'back';
  return 'other';
}

function getSeverity(value: string) {
  const level = Number(value);

  if (level >= 7) return 'severe';
  if (level >= 4) return 'moderate';
  return 'mild';
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  loadingCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '800',
  },
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
  snapshotMeta: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  formCard: {
    gap: 16,
  },
  adviceCard: {
    gap: 10,
    padding: 14,
  },
  adviceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  adviceItem: {
    borderTopWidth: 1,
    gap: 3,
    paddingTop: 9,
  },
  adviceItemTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  adviceText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  calendarCard: {
    gap: 12,
  },
  calendarHeader: {
    gap: 10,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  calendarHint: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '800',
  },
  weekHeader: {
    flexDirection: 'row',
    gap: 6,
  },
  weekday: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    width: '12%',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  topAction: {
    marginTop: -2,
  },
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoider: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 37, 44, 0.46)',
  },
  modalSheet: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    maxHeight: '86%',
    padding: 18,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  modalTitleGroup: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modalContent: {
    gap: 14,
    paddingBottom: 28,
    paddingTop: 14,
  },
});
