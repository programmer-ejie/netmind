import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListRow, MetricCard, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { currentPlayer } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import {
  getPlayerSummary,
  listPlayerPerformanceLogs,
  type NetmindUser,
  type PerformanceLog,
  type PlayerSummary,
} from '@/lib/api';

type RadarItem = { label: string; value: number };
type WaterfallItem = { label: string; value: number; type: 'base' | 'gain' | 'loss' };
type DashboardTab = 'performance' | 'analytics';
type MeasurementType = 'jump' | 'spike' | 'heart';
type MeasurementEntry = {
  id?: number | string;
  date: string;
  metric: string;
  type: MeasurementType;
  value: number;
};
type AnalysisItem = { title: string; suggestion: string };
type PlayerAnalysis = {
  ready: boolean;
  entries: MeasurementEntry[];
  needsImprovement: AnalysisItem[];
  keepItUp: string[];
  tip: string;
};

export default function DashboardScreen() {
  const { colors } = useNetmindTheme();
  const [player, setPlayer] = useState<NetmindUser | null>(null);
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [performanceLogs, setPerformanceLogs] = useState<PerformanceLog[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('performance');
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
        setPerformanceLogs([]);
        setMessage('Sign in again to load your dashboard.');
        return;
      }

      const [nextSummary, nextPerformanceLogs] = await Promise.all([
        getPlayerSummary(savedUser.id),
        listPlayerPerformanceLogs(savedUser.id),
      ]);
      setSummary(nextSummary);
      setPerformanceLogs(nextPerformanceLogs);
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
  const performanceAnalysis = useMemo(() => buildPlayerAnalysis(performanceLogs), [performanceLogs]);
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

      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <DashboardTabButton
          active={activeTab === 'performance'}
          icon="stacked-line-chart"
          label="Performance"
          onPress={() => setActiveTab('performance')}
        />
        <DashboardTabButton
          active={activeTab === 'analytics'}
          icon="analytics"
          label="Analytics"
          onPress={() => setActiveTab('analytics')}
        />
      </View>

      {activeTab === 'performance' ? (
        <>
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

          <PerformanceAnalysisCard playerName={profile?.name || currentPlayer.name} analysis={performanceAnalysis} />
        </>
      ) : (
        <>
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
        </>
      )}
    </Screen>
  );
}

function DashboardTabButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useNetmindTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tabButton, { backgroundColor: active ? colors.court : 'transparent' }]}>
      <MaterialIcons name={icon} size={20} color={active ? '#ffffff' : colors.court} />
      <Text style={[styles.tabText, { color: active ? '#ffffff' : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

function PerformanceAnalysisCard({ playerName, analysis }: { playerName: string; analysis: PlayerAnalysis }) {
  const { colors } = useNetmindTheme();

  if (!analysis.ready) {
    return (
      <>
        <SectionTitle>Performance analysis</SectionTitle>
        <Card style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <View style={[styles.analysisIcon, { backgroundColor: colors.courtSoft }]}>
              <MaterialIcons name="insights" size={22} color={colors.court} />
            </View>
            <View style={styles.analysisTitleBlock}>
              <Text style={[styles.analysisKicker, { color: colors.court }]}>Collecting baseline</Text>
              <Text style={[styles.analysisTitle, { color: colors.ink }]}>{playerName}</Text>
              <Text style={[styles.analysisText, { color: colors.muted }]}>
                {Math.max(0, 5 - analysis.entries.length)} more measurement entries needed before suggestions appear.
              </Text>
            </View>
          </View>
        </Card>
      </>
    );
  }

  return (
    <>
      <SectionTitle>Performance analysis</SectionTitle>
      <Card style={styles.analysisCard}>
        <View style={styles.analysisHeader}>
          <View style={[styles.analysisIcon, { backgroundColor: colors.courtSoft }]}>
            <MaterialIcons name="analytics" size={22} color={colors.court} />
          </View>
          <View style={styles.analysisTitleBlock}>
            <Text style={[styles.analysisKicker, { color: colors.court }]}>After 5 new entries</Text>
            <Text style={[styles.analysisTitle, { color: colors.ink }]}>{playerName}</Text>
          </View>
        </View>

        <PerformanceRadarFigure entries={analysis.entries} />

        <View style={styles.analysisColumns}>
          <View style={[styles.analysisPanel, { backgroundColor: colors.wash, borderColor: colors.line }]}>
            <View style={styles.analysisPanelTitle}>
              <MaterialIcons name="warning-amber" size={18} color={colors.coral} />
              <Text style={[styles.analysisPanelHeading, { color: colors.coral }]}>Needs improvement</Text>
            </View>
            {analysis.needsImprovement.map((item) => (
              <View key={item.title} style={styles.analysisBullet}>
                <Text style={[styles.analysisBulletTitle, { color: colors.ink }]}>{item.title}</Text>
                <Text style={[styles.analysisText, { color: colors.muted }]}>{item.suggestion}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.analysisPanel, { backgroundColor: colors.wash, borderColor: colors.line }]}>
            <View style={styles.analysisPanelTitle}>
              <MaterialIcons name="check-circle-outline" size={18} color={colors.court} />
              <Text style={[styles.analysisPanelHeading, { color: colors.court }]}>Keep it up</Text>
            </View>
            {analysis.keepItUp.map((item) => (
              <Text key={item} style={[styles.analysisText, { color: colors.muted }]}>
                {item}
              </Text>
            ))}
          </View>
        </View>

        <View style={[styles.analysisTip, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
          <MaterialIcons name="lightbulb-outline" size={18} color={colors.court} />
          <Text style={[styles.analysisTipText, { color: colors.ink }]}>{analysis.tip}</Text>
        </View>
      </Card>
    </>
  );
}

function PerformanceRadarFigure({ entries }: { entries: MeasurementEntry[] }) {
  const { colors } = useNetmindTheme();
  const profile = buildPerformanceRadarProfile(entries);
  const score = Math.round(profile.reduce((sum, item) => sum + item.value, 0) / Math.max(profile.length, 1));
  const size = 210;
  const center = size / 2;
  const maxRadius = 78;
  const rings = [1, 0.66, 0.33];

  return (
    <View style={[styles.performanceRadarFigure, { backgroundColor: colors.wash, borderColor: colors.line }]}>
      <View style={styles.performanceRadarHeader}>
        <View>
          <Text style={[styles.trendLegendText, { color: colors.court }]}>Radar profile</Text>
          <Text style={[styles.analysisText, { color: colors.muted }]}>Latest training inputs</Text>
        </View>
        <View style={[styles.performanceRadarScore, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
          <Text style={[styles.performanceRadarScoreValue, { color: colors.court }]}>{score}</Text>
          <Text style={[styles.performanceRadarScoreLabel, { color: colors.muted }]}>Score</Text>
        </View>
      </View>

      <View style={[styles.performanceRadarCanvas, { height: size, width: size }]}>
        {rings.map((ring) => (
          <View
            key={ring}
            style={[
              styles.performanceRadarRing,
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
          const labelX = center + Math.cos(radians) * (maxRadius + 26);
          const labelY = center + Math.sin(radians) * (maxRadius + 26);

          return (
            <View key={item.label}>
              <View
                style={[
                  styles.performanceRadarSpoke,
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
                  styles.performanceRadarDot,
                  {
                    backgroundColor: item.value >= 75 ? colors.court : item.value >= 50 ? colors.gold : colors.coral,
                    left: x - 6,
                    top: y - 6,
                  },
                ]}
              />
              <Text
                numberOfLines={2}
                style={[
                  styles.performanceRadarLabel,
                  {
                    color: colors.muted,
                    left: labelX - 40,
                    top: labelY - 13,
                  },
                ]}>
                {item.label}
              </Text>
            </View>
          );
        })}
        <View style={[styles.performanceRadarCore, { backgroundColor: colors.surface, borderColor: colors.court }]}>
          <Text style={[styles.performanceRadarCoreText, { color: colors.court }]}>{score}</Text>
        </View>
      </View>
    </View>
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

function getLogMetric(log: PerformanceLog) {
  return String(log.notes || '').match(/metric:\s*([a-z_]+)/i)?.[1] || '';
}

function getLogDate(log: PerformanceLog) {
  return (
    String(log.notes || '').match(/session_date:\s*([0-9-]+)/i)?.[1]
    || String(log.created_at || '').slice(0, 10)
  );
}

function extractMeasurementEntries(logs: PerformanceLog[] = []): MeasurementEntry[] {
  return logs
    .reduce<MeasurementEntry[]>((entries, log) => {
      const metric = getLogMetric(log);
      const value = toNumber(log.value, Number.NaN);
      if (!Number.isFinite(value) || !metric) return entries;

      const type: MeasurementType | '' =
        metric === 'highest_jump' || metric === 'total_jumps'
          ? 'jump'
          : metric === 'strongest_spike' || metric === 'total_spikes'
            ? 'spike'
            : metric === 'avg_heart_rate'
              ? 'heart'
              : '';

      if (!type) return entries;

      entries.push({
        id: log.id,
        date: getLogDate(log),
        metric,
        type,
        value,
      });

      return entries;
    }, [])
    .sort((first, second) => first.date.localeCompare(second.date) || Number(first.id || 0) - Number(second.id || 0));
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function valuesFor(entries: MeasurementEntry[], metric: string) {
  return entries.filter((entry) => entry.metric === metric).map((entry) => entry.value);
}

function latestValue(values: number[]) {
  return values.length ? values[values.length - 1] : null;
}

function previousValue(values: number[]) {
  return values.length >= 2 ? values[values.length - 2] : null;
}

function percentChange(previous: number, latest: number) {
  return previous ? ((latest - previous) / previous) * 100 : 0;
}

function recentRange(values: number[], count = 3) {
  const recent = values.slice(-count);
  if (recent.length < count) return null;
  return Math.max(...recent) - Math.min(...recent);
}

function addTrendRecommendation({
  values,
  label,
  unit = '',
  goodThreshold = 4,
  badThreshold = -5,
  improveText,
  declineText,
  steadyText,
  needsImprovement,
  keepItUp,
}: {
  values: number[];
  label: string;
  unit?: string;
  goodThreshold?: number;
  badThreshold?: number;
  improveText?: string;
  declineText?: string;
  steadyText?: string;
  needsImprovement: AnalysisItem[];
  keepItUp: string[];
}) {
  const previous = previousValue(values);
  const latest = latestValue(values);
  if (previous === null || latest === null) return;

  const change = percentChange(previous, latest);
  const suffix = unit ? ` ${unit}` : '';

  if (change <= badThreshold) {
    needsImprovement.push({
      title: `${label} dropped ${Math.abs(change).toFixed(0)}%`,
      suggestion: declineText || `Previous ${previous.toFixed(1)}${suffix}, latest ${latest.toFixed(1)}${suffix}. Reduce load and check technique.`,
    });
  } else if (change >= goodThreshold) {
    keepItUp.push(improveText || `${label} improved ${change.toFixed(0)}% over the last entry.`);
  } else if (steadyText) {
    keepItUp.push(steadyText);
  }
}

function buildPlayerAnalysis(logs: PerformanceLog[] = []): PlayerAnalysis {
  const entries = extractMeasurementEntries(logs);
  if (entries.length < 5) {
    return { ready: false, entries, needsImprovement: [], keepItUp: [], tip: '' };
  }

  const jumpValues = valuesFor(entries, 'highest_jump');
  const totalJumpValues = valuesFor(entries, 'total_jumps');
  const spikeValues = valuesFor(entries, 'strongest_spike');
  const totalSpikeValues = valuesFor(entries, 'total_spikes');
  const heartValues = valuesFor(entries, 'avg_heart_rate');
  const needsImprovement: AnalysisItem[] = [];
  const keepItUp: string[] = [];

  addTrendRecommendation({
    values: jumpValues,
    label: 'Jump height',
    unit: 'in',
    declineText: 'Add plyometrics 2x/week, reduce heavy jump volume for one session, and review approach mechanics.',
    steadyText: 'Jump height is holding steady across recent sessions.',
    needsImprovement,
    keepItUp,
  });

  const jumpRange = recentRange(jumpValues, 3);
  if (jumpRange !== null && jumpRange >= 5) {
    needsImprovement.push({
      title: `Jump consistency varies by ${jumpRange.toFixed(1)} inches`,
      suggestion: 'Use a fixed approach rhythm and film takeoff timing before adding more volume.',
    });
  } else if (jumpRange !== null) {
    keepItUp.push('Jump consistency is controlled across the last three jump readings.');
  }

  if (spikeValues.length >= 3) {
    const recent = spikeValues.slice(-3);
    const range = Math.max(...recent) - Math.min(...recent);

    if (range <= 3) {
      needsImprovement.push({
        title: `Spike speed plateaued at ${Math.min(...recent).toFixed(0)}-${Math.max(...recent).toFixed(0)} km/h`,
        suggestion: 'Add wrist strength and faster approach-speed work next block.',
      });
    } else if (recent[recent.length - 1] >= Math.max(...recent.slice(0, -1))) {
      keepItUp.push('Spike speed is trending upward in recent sessions.');
    }
  }

  addTrendRecommendation({
    values: spikeValues,
    label: 'Strongest spike',
    unit: 'km/h',
    goodThreshold: 3,
    badThreshold: -4,
    declineText: 'Check shoulder fatigue and add medicine-ball throws before max-speed attacks.',
    needsImprovement,
    keepItUp,
  });

  const latestTotalJumps = latestValue(totalJumpValues);
  const latestTotalSpikes = latestValue(totalSpikeValues);
  if (latestTotalJumps !== null) {
    if (latestTotalJumps >= 70) {
      needsImprovement.push({
        title: `Jump load is high at ${latestTotalJumps.toFixed(0)} jumps`,
        suggestion: 'Reduce extra jump drills next session and prioritize landing quality.',
      });
    } else if (latestTotalJumps >= 35) {
      keepItUp.push('Jump volume is in a productive training range.');
    } else {
      needsImprovement.push({
        title: `Jump volume is low at ${latestTotalJumps.toFixed(0)} jumps`,
        suggestion: 'Add controlled approach-jump sets if the player is not on a recovery day.',
      });
    }
  }

  if (latestTotalSpikes !== null) {
    if (latestTotalSpikes >= 45) {
      needsImprovement.push({
        title: `Spike volume is high at ${latestTotalSpikes.toFixed(0)} spikes`,
        suggestion: 'Limit max-effort swings and add shoulder recovery work after practice.',
      });
    } else if (latestTotalSpikes >= 15) {
      keepItUp.push('Spike volume is enough to evaluate attack rhythm without overloading the shoulder.');
    } else {
      needsImprovement.push({
        title: `Spike volume is low at ${latestTotalSpikes.toFixed(0)} spikes`,
        suggestion: 'Add target-based attack reps when shoulder status is clear.',
      });
    }
  }

  if (latestTotalJumps !== null && latestTotalSpikes !== null && latestTotalJumps > 0) {
    const spikeRate = (latestTotalSpikes / latestTotalJumps) * 100;
    if (spikeRate < 25) {
      needsImprovement.push({
        title: `Attack conversion is low at ${spikeRate.toFixed(0)} spikes per 100 jumps`,
        suggestion: 'Pair approach jumps with controlled arm-swing timing instead of isolated jumping.',
      });
    } else if (spikeRate <= 75) {
      keepItUp.push('Jump-to-spike balance looks useful for volleyball-specific power.');
    } else {
      needsImprovement.push({
        title: `Spike-to-jump ratio is heavy at ${spikeRate.toFixed(0)} spikes per 100 jumps`,
        suggestion: 'Add non-swing jump mechanics to protect shoulder load while keeping leg power work.',
      });
    }
  }

  if (heartValues.length >= 2) {
    const early = average(heartValues.slice(0, Math.ceil(heartValues.length / 2)));
    const recent = average(heartValues.slice(-Math.ceil(heartValues.length / 2)));
    if (early !== null && recent !== null) {
      const change = early ? ((recent - early) / early) * 100 : 0;
      if (change <= -5) {
        keepItUp.push(`Average heart-rate load improved ${Math.abs(change).toFixed(0)}%.`);
      } else if (change >= 8) {
        needsImprovement.push({
          title: `Average heart-rate load rose ${change.toFixed(0)}%`,
          suggestion: 'Add recovery intervals and monitor fatigue before high-volume drills.',
        });
      }
    }
  }

  const latestHeart = latestValue(heartValues);
  if (latestHeart !== null) {
    if (latestHeart >= 175) {
      needsImprovement.push({
        title: `Heart-rate load is very high at ${latestHeart.toFixed(0)} bpm`,
        suggestion: 'Use longer rest blocks and avoid stacking max jump and max spike sets.',
      });
    } else if (latestHeart >= 150 && latestHeart <= 165) {
      keepItUp.push('Heart rate is in a strong volleyball conditioning zone for power work.');
    } else if (latestHeart < 120) {
      needsImprovement.push({
        title: `Heart-rate load is low at ${latestHeart.toFixed(0)} bpm`,
        suggestion: 'Increase drill tempo if the goal is conditioning, or mark the day as recovery.',
      });
    }
  }

  if (!needsImprovement.length) {
    needsImprovement.push({
      title: 'No major regression detected',
      suggestion: 'Keep logging jump, spike, and heart-rate data every training day.',
    });
  }

  if (!keepItUp.length) {
    keepItUp.push('Consistent data logging is improving the quality of player decisions.');
  }

  const tip = latestHeart
    ? `Target controlled spikes while heart rate is near ${Math.max(120, latestHeart - 5).toFixed(0)}-${(latestHeart + 5).toFixed(0)} bpm, then compare jump height after the set.`
    : 'Capture heart rate with jump and spike values next session to unlock better workload guidance.';

  return { ready: true, entries, needsImprovement, keepItUp, tip };
}

function buildPerformanceRadarProfile(entries: MeasurementEntry[]): RadarItem[] {
  const highestJump = latestValue(valuesFor(entries, 'highest_jump'));
  const strongestSpike = latestValue(valuesFor(entries, 'strongest_spike'));
  const totalJumps = latestValue(valuesFor(entries, 'total_jumps'));
  const totalSpikes = latestValue(valuesFor(entries, 'total_spikes'));
  const heartRate = latestValue(valuesFor(entries, 'avg_heart_rate'));
  const jumpRange = recentRange(valuesFor(entries, 'highest_jump'), 3);
  const spikeRange = recentRange(valuesFor(entries, 'strongest_spike'), 3);
  const spikeBalance = totalJumps !== null && totalJumps > 0 && totalSpikes !== null
    ? clampScore(100 - Math.abs((totalSpikes / totalJumps) * 100 - 50) * 1.6)
    : 55;
  const loadScore = totalJumps !== null || totalSpikes !== null
    ? Math.round(((scoreRange(totalJumps, 35, 70, true) ?? 55) + (scoreRange(totalSpikes, 15, 45, true) ?? 55) + spikeBalance) / 3)
    : 55;
  const consistencyScore = Math.round((
    (jumpRange === null ? 55 : clampScore(100 - jumpRange * 10))
    + (spikeRange === null ? 55 : clampScore(100 - spikeRange * 12))
  ) / 2);

  return [
    { label: 'Jump', value: scoreRange(highestJump, 20, 36) ?? 55 },
    { label: 'Spike', value: scoreRange(strongestSpike, 45, 85) ?? 55 },
    { label: 'Load', value: loadScore },
    { label: 'Heart', value: heartRate === null ? 55 : clampScore(100 - Math.abs(heartRate - 155) * 1.8) },
    { label: 'Consistency', value: consistencyScore },
  ];
}

function scoreRange(value: number | null, low: number, high: number, sweetSpot = false) {
  if (value === null) return null;
  if (sweetSpot) {
    const target = (low + high) / 2;
    const halfRange = (high - low) / 2;
    return clampScore(100 - (Math.abs(value - target) / Math.max(halfRange, 1)) * 45);
  }
  return clampScore(((value - low) / Math.max(high - low, 1)) * 100);
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
  tabBar: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '900',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actions: {
    gap: 10,
  },
  analysisCard: {
    gap: 14,
  },
  analysisHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  analysisIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  analysisTitleBlock: {
    flex: 1,
    gap: 3,
  },
  analysisKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  analysisText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  performanceRadarFigure: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  performanceRadarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  trendLegendText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  performanceRadarScore: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  performanceRadarScoreValue: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  performanceRadarScoreLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  performanceRadarCanvas: {
    alignSelf: 'center',
    position: 'relative',
  },
  performanceRadarRing: {
    borderRadius: 999,
    borderWidth: 1,
    position: 'absolute',
  },
  performanceRadarSpoke: {
    height: 1,
    position: 'absolute',
    transformOrigin: 'left center',
  },
  performanceRadarDot: {
    borderRadius: 6,
    height: 12,
    position: 'absolute',
    width: 12,
  },
  performanceRadarLabel: {
    fontSize: 10,
    fontWeight: '900',
    position: 'absolute',
    textAlign: 'center',
    width: 80,
  },
  performanceRadarCore: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    left: 77,
    position: 'absolute',
    top: 77,
    width: 56,
  },
  performanceRadarCoreText: {
    fontSize: 18,
    fontWeight: '900',
  },
  analysisColumns: {
    gap: 10,
  },
  analysisPanel: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  analysisPanelTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  analysisPanelHeading: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  analysisBullet: {
    gap: 4,
  },
  analysisBulletTitle: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  analysisTip: {
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 12,
  },
  analysisTipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
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
