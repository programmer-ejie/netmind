import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card, ListRow, MetricCard, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { currentPlayer } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import { getPlayerSummary, type NetmindUser, type PlayerSummary } from '@/lib/api';

type RadarItem = { label: string; value: number };
type WaterfallItem = { label: string; value: number; type: 'base' | 'gain' | 'loss' };

export default function DashboardScreen() {
  const { colors } = useNetmindTheme();
  const [player, setPlayer] = useState<NetmindUser | null>(null);
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  const loadDashboard = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setMessage('');

    try {
      const saved = await AsyncStorage.getItem('netmind_user');
      const savedUser = saved ? JSON.parse(saved) as NetmindUser : null;

      setPlayer(savedUser);

      if (!savedUser?.id) {
        setSummary(null);
        setMessage('Sign in again to load your dashboard.');
        return;
      }

      setSummary(await getPlayerSummary(savedUser.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load dashboard analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const analytics = useMemo(() => buildDashboardAnalytics(summary), [summary]);
  const profile = summary?.player || player;
  const subtitle = profile
    ? `${profile.name} - ${profile.position || profile.role || currentPlayer.role}`
    : `${currentPlayer.name} - ${currentPlayer.role} for ${currentPlayer.team}`;

  return (
    <Screen
      onRefresh={() => loadDashboard('refresh')}
      refreshing={refreshing}
      title="Dashboard"
      subtitle={subtitle}>
      {message ? (
        <View style={[styles.notice, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
          <Text style={[styles.noticeText, { color: colors.ink }]}>{message}</Text>
        </View>
      ) : null}

      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.court} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading dashboard analytics...</Text>
        </Card>
      ) : null}

      <View style={styles.metrics}>
        {analytics.stats.map((stat) => (
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

      <SectionTitle>Analytics</SectionTitle>
      <View style={styles.analyticsGrid}>
        <RadarCard profile={analytics.radarProfile} score={analytics.profileScore} />
        <WaterfallCard factors={analytics.waterfallFactors} />
      </View>

      <SectionTitle>Recent activity</SectionTitle>
      <Card>
        {analytics.recentActivity.map((item) => (
          <ListRow
            detail={item.detail}
            icon={item.icon}
            key={item.title}
            meta={item.meta}
            title={item.title}
          />
        ))}
      </Card>

      <SectionTitle>Pending tasks</SectionTitle>
      <Card>
        {analytics.pendingTasks.map((item) => (
          <ListRow detail={item.detail} icon={item.icon} key={item.title} meta={item.meta} title={item.title} />
        ))}
      </Card>
    </Screen>
  );
}

function RadarCard({ profile, score }: { profile: RadarItem[]; score: number }) {
  const { colors } = useNetmindTheme();
  const size = 190;
  const center = size / 2;
  const maxRadius = 72;
  const rings = [1, 0.66, 0.33];

  return (
    <Card style={styles.analyticsCard}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.ink }]}>Player profile</Text>
        <Text style={[styles.chartMeta, { color: colors.muted }]}>Radar</Text>
      </View>
      <View style={[styles.radarCanvas, { height: size, width: size }]}>
        {rings.map((ring) => (
          <View
            key={ring}
            style={[
              styles.radarRing,
              {
                borderColor: colors.line,
                height: maxRadius * 2 * ring,
                left: center - maxRadius * ring,
                top: center - maxRadius * ring,
                width: maxRadius * 2 * ring,
              },
            ]}
          />
        ))}
        {profile.map((item, index) => {
          const angle = (index / profile.length) * 360 - 90;
          const radius = (item.value / 100) * maxRadius;
          const radians = (angle * Math.PI) / 180;
          const x = center + Math.cos(radians) * radius;
          const y = center + Math.sin(radians) * radius;
          const labelX = center + Math.cos(radians) * (maxRadius + 22);
          const labelY = center + Math.sin(radians) * (maxRadius + 22);

          return (
            <View key={item.label}>
              <View
                style={[
                  styles.radarSpoke,
                  {
                    backgroundColor: colors.line,
                    left: center,
                    top: center,
                    transform: [{ rotate: `${angle}deg` }],
                    width: maxRadius,
                  },
                ]}
              />
              <View
                style={[
                  styles.radarDot,
                  {
                    backgroundColor: colors.court,
                    left: x - 5,
                    top: y - 5,
                  },
                ]}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.radarLabel,
                  {
                    color: colors.muted,
                    left: labelX - 34,
                    top: labelY - 9,
                  },
                ]}>
                {item.label}
              </Text>
            </View>
          );
        })}
        <View style={[styles.radarCore, { backgroundColor: colors.courtSoft, borderColor: colors.court }]}>
          <Text style={[styles.radarCoreText, { color: colors.court }]}>{score}</Text>
        </View>
      </View>
    </Card>
  );
}

function WaterfallCard({ factors }: { factors: WaterfallItem[] }) {
  const { colors } = useNetmindTheme();
  let runningTotal = 0;
  const bars = factors.map((item) => {
    const start = item.type === 'base' ? 0 : runningTotal;
    const end = item.type === 'base' ? item.value : runningTotal + item.value;
    runningTotal = end;

    return { ...item, start, end };
  });
  const max = Math.max(...bars.map((bar) => Math.max(bar.start, bar.end)), 100);

  return (
    <Card style={styles.analyticsCard}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.ink }]}>Readiness build</Text>
        <Text style={[styles.chartMeta, { color: colors.muted }]}>Waterfall</Text>
      </View>
      <View style={styles.waterfallChart}>
        {bars.map((bar) => {
          const isLoss = bar.type === 'loss';
          const barTop = ((max - Math.max(bar.start, bar.end)) / max) * 128;
          const barHeight = (Math.abs(bar.end - bar.start) / max) * 128 || 6;
          const valueLabel = bar.type === 'base' ? bar.value : `${bar.value > 0 ? '+' : ''}${bar.value}`;

          return (
            <View key={bar.label} style={styles.waterfallColumn}>
              <View style={[styles.waterfallTrack, { backgroundColor: colors.wash }]}>
                <View
                  style={[
                    styles.waterfallBar,
                    {
                      backgroundColor: isLoss ? colors.coral : colors.court,
                      height: Math.max(8, barHeight),
                      top: barTop,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.waterfallValue, { color: isLoss ? colors.coral : colors.court }]}>
                {valueLabel}
              </Text>
              <Text numberOfLines={1} style={[styles.waterfallLabel, { color: colors.muted }]}>
                {bar.label}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function buildDashboardAnalytics(summary: PlayerSummary | null) {
  const wellness = summary?.wellness || {};
  const training = summary?.training || {};
  const drills = summary?.drills || {};
  const injuries = summary?.active_injuries || [];
  const actions = summary?.actions || [];

  const effort = scale10(wellness.avg_rpe, 72);
  const energy = scale10(wellness.avg_energy_level, 70);
  const focus = scale10(wellness.avg_focus_level, 70);
  const confidence = scale10(wellness.avg_confidence_level, 70);
  const fatigue = toNumber(wellness.avg_fatigue, 5);
  const sleep = toNumber(wellness.avg_sleep_hours, 7);
  const recovery = clampScore((sleep / 8) * 70 + (10 - fatigue) * 3);
  const profileScore = Math.round((effort + energy + focus + confidence + recovery) / 5);
  const totalAssignments = toNumber(training.total_assignments, 0);
  const completedTasks = toNumber(training.completed, 0);
  const completionRate = totalAssignments ? Math.round((completedTasks / totalAssignments) * 100) : 0;
  const activeInjuryCount = injuries.length;
  const reflectionCount = actions
    .filter((item) => item.action_type === 'reflection')
    .reduce((sum, item) => sum + toNumber(item.total, 0), 0);

  return {
    stats: [
      { label: 'Reflections', value: String(reflectionCount), delta: 'Match logs' },
      { label: 'Energy', value: `${energy}%`, delta: dbDelta(wellness.last_logged_at, 'Latest reflection') },
      { label: 'Tasks done', value: `${completionRate}%`, delta: `${completedTasks}/${totalAssignments}` },
      { label: 'Recovery', value: `${Math.round(recovery)}%`, delta: dbDelta(wellness.last_checkin_date, 'Latest check-in') },
    ],
    radarProfile: [
      { label: 'Effort', value: effort },
      { label: 'Energy', value: energy },
      { label: 'Focus', value: focus },
      { label: 'Confidence', value: confidence },
      { label: 'Recovery', value: recovery },
    ],
    profileScore,
    waterfallFactors: [
      { label: 'Start', value: 70, type: 'base' as const },
      { label: 'Energy', value: contribution(energy, 70), type: contributionType(energy, 70) },
      { label: 'Focus', value: contribution(focus, 70), type: contributionType(focus, 70) },
      { label: 'Fatigue', value: -Math.max(0, Math.round((fatigue - 5) * 3)), type: 'loss' as const },
      { label: 'Sleep', value: Math.round((sleep - 7) * 4), type: sleep >= 7 ? 'gain' as const : 'loss' as const },
    ],
    recentActivity: [
      {
        title: 'Latest reflection',
        detail: `${reflectionCount} match reflection${reflectionCount === 1 ? '' : 's'} saved`,
        meta: dbDelta(wellness.last_logged_at, 'No logs'),
        icon: 'edit-note' as const,
      },
      {
        title: 'Wellness check-in',
        detail: `Fatigue ${formatMetric(fatigue)}/10 - Sleep ${formatMetric(sleep)}h`,
        meta: dbDelta(wellness.last_checkin_date, 'No check-in'),
        icon: 'favorite' as const,
      },
      {
        title: 'Training work',
        detail: `${formatMetric(drills.total_reps || 0)} reps logged`,
        meta: `${Math.round(toNumber(drills.avg_success_rate, 0))}% success`,
        icon: 'fitness-center' as const,
      },
    ],
    pendingTasks: [
      {
        title: 'Training assignments',
        detail: `${Math.max(0, totalAssignments - completedTasks)} still open`,
        meta: `${completedTasks}/${totalAssignments} done`,
        icon: 'assignment' as const,
      },
      {
        title: 'Wellness recovery',
        detail: activeInjuryCount ? `${activeInjuryCount} active injury flag${activeInjuryCount === 1 ? '' : 's'}` : 'No active injury flags',
        meta: activeInjuryCount ? 'Review' : 'Clear',
        icon: 'health-and-safety' as const,
      },
    ],
  };
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function scale10(value: unknown, fallback: number) {
  const number = toNumber(value, Number.NaN);
  if (!Number.isFinite(number)) return fallback;
  return clampScore(number * 10);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function contribution(value: number, baseline: number) {
  return Math.round((value - baseline) / 3);
}

function contributionType(value: number, baseline: number): 'gain' | 'loss' {
  return value >= baseline ? 'gain' : 'loss';
}

function dbDelta(value?: string | null, fallback = 'No data') {
  if (!value) return fallback;
  return String(value).slice(0, 10);
}

function formatMetric(value: unknown) {
  const number = toNumber(value, 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '800',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actions: {
    gap: 10,
  },
  analyticsGrid: {
    gap: 12,
  },
  analyticsCard: {
    gap: 12,
  },
  chartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  chartMeta: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  radarCanvas: {
    alignSelf: 'center',
    position: 'relative',
  },
  radarRing: {
    borderRadius: 999,
    borderWidth: 1,
    position: 'absolute',
  },
  radarSpoke: {
    height: 1,
    position: 'absolute',
    transformOrigin: 'left center',
  },
  radarDot: {
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  radarLabel: {
    fontSize: 10,
    fontWeight: '900',
    position: 'absolute',
    textAlign: 'center',
    width: 68,
  },
  radarCore: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    left: 67,
    position: 'absolute',
    top: 67,
    width: 56,
  },
  radarCoreText: {
    fontSize: 18,
    fontWeight: '900',
  },
  waterfallChart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 178,
  },
  waterfallColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  waterfallTrack: {
    borderRadius: 8,
    height: 128,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  waterfallBar: {
    borderRadius: 8,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  waterfallValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  waterfallLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
});
