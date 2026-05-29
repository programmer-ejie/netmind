import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, MetricCard, Screen, SectionTitle } from '@/components/netmind-ui';
import { palette, strengths } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import { listPlayerPerformanceLogs, type NetmindUser, type PerformanceLog } from '@/lib/api';

type TrendMetric = 'highest_jump' | 'strongest_spike' | 'avg_heart_rate';

type TrendEntry = {
  id?: number | string;
  date: string;
  metric: string;
  value: number;
};

const trendMetrics: {
  key: TrendMetric;
  label: string;
  shortLabel: string;
  unit: string;
  tone: string;
}[] = [
  { key: 'highest_jump', label: 'Jump height', shortLabel: 'Jump', unit: 'in', tone: palette.gold },
  { key: 'strongest_spike', label: 'Spike speed', shortLabel: 'Spike', unit: 'km/h', tone: palette.coral },
  { key: 'avg_heart_rate', label: 'Heart rate', shortLabel: 'Heart', unit: 'bpm', tone: palette.court },
];

export default function StatsScreen() {
  const { colors } = useNetmindTheme();
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [player, setPlayer] = useState<NetmindUser | null>(null);
  const [activeMetric, setActiveMetric] = useState<TrendMetric>('highest_jump');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  const loadStats = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setMessage('');

    try {
      const saved = await AsyncStorage.getItem('netmind_user');
      const savedUser = saved ? JSON.parse(saved) as NetmindUser : null;
      setPlayer(savedUser);

      if (!savedUser?.id) {
        setLogs([]);
        setMessage('Sign in again to load your performance trends.');
        return;
      }

      setLogs(await listPlayerPerformanceLogs(savedUser.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load performance trends.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const trendEntries = useMemo(() => extractTrendEntries(logs), [logs]);
  const activeConfig = trendMetrics.find((item) => item.key === activeMetric) || trendMetrics[0];
  const activeSeries = useMemo(
    () => trendEntries.filter((entry) => entry.metric === activeMetric).slice(-8),
    [activeMetric, trendEntries]
  );
  const trendSummary = useMemo(
    () => buildTrendSummary(activeSeries, activeMetric, activeConfig.unit, player?.age),
    [activeConfig.unit, activeMetric, activeSeries, player?.age]
  );
  const latestJump = latestFor(trendEntries, 'highest_jump');
  const latestSpike = latestFor(trendEntries, 'strongest_spike');

  return (
    <Screen
      onRefresh={() => loadStats('refresh')}
      refreshing={refreshing}
      title="My Stats"
      subtitle="Track performance trends and where your training is paying off.">
      {message ? (
        <View style={[styles.notice, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
          <Text style={[styles.noticeText, { color: colors.ink }]}>{message}</Text>
        </View>
      ) : null}

      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.court} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading performance trends...</Text>
        </Card>
      ) : null}

      <View style={styles.metrics}>
        <MetricCard
          label="Latest jump"
          value={latestJump ? `${formatNumber(latestJump.value)}in` : '--'}
          delta={latestJump ? latestJump.date : 'No jump logs'}
          tone={palette.gold}
        />
        <MetricCard
          label="Latest spike"
          value={latestSpike ? `${formatNumber(latestSpike.value)}km/h` : '--'}
          delta={latestSpike ? latestSpike.date : 'No spike logs'}
          tone={palette.coral}
        />
      </View>

      <SectionTitle>Performance trends</SectionTitle>
      <Card style={styles.trendCard}>
        <View style={[styles.segmentedControl, { backgroundColor: colors.wash, borderColor: colors.line }]}>
          {trendMetrics.map((item) => {
            const active = item.key === activeMetric;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={item.key}
                onPress={() => setActiveMetric(item.key)}
                style={[styles.segmentButton, active ? { backgroundColor: colors.surface, borderColor: item.tone } : null]}>
                <View style={[styles.segmentDot, { backgroundColor: item.tone }]} />
                <Text style={[styles.segmentText, { color: active ? colors.ink : colors.muted }]}>{item.shortLabel}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.trendHeader}>
          <View>
            <Text style={[styles.trendTitle, { color: colors.ink }]}>{activeConfig.label}</Text>
            <Text style={[styles.caption, { color: colors.muted }]}>Last {Math.max(activeSeries.length, 0)} logged readings</Text>
          </View>
          <View style={[styles.trendBadge, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
            <MaterialIcons name={trendSummary.icon} size={17} color={trendSummary.color} />
            <Text style={[styles.trendBadgeText, { color: trendSummary.color }]}>{trendSummary.label}</Text>
          </View>
        </View>

        <LineTrendChart color={activeConfig.tone} entries={activeSeries} unit={activeConfig.unit} />

        <Text style={[styles.caption, { color: colors.muted }]}>{trendSummary.detail}</Text>
      </Card>

      <SectionTitle>Strengths</SectionTitle>
      <Card style={styles.strengthRadarCard}>
        <StrengthRadarChart items={strengths} />
      </Card>
    </Screen>
  );
}

function LineTrendChart({ color, entries, unit }: { color: string; entries: TrendEntry[]; unit: string }) {
  const { colors } = useNetmindTheme();
  const width = 300;
  const height = 170;
  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const values = entries.map((entry) => entry.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = Math.max(max - min, 1);
  const points = entries.map((entry, index) => {
    const x = padding + (entries.length === 1 ? chartWidth / 2 : (index / (entries.length - 1)) * chartWidth);
    const y = padding + ((max - entry.value) / range) * chartHeight;
    return { ...entry, x, y };
  });

  if (entries.length < 2) {
    return (
      <View style={[styles.emptyChart, { backgroundColor: colors.wash, borderColor: colors.line }]}>
        <MaterialIcons name="show-chart" size={28} color={colors.court} />
        <Text style={[styles.emptyChartText, { color: colors.muted }]}>
          Log at least two readings to draw a visible trend.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.lineChart, { backgroundColor: colors.wash, borderColor: colors.line, width }]}>
      <View style={[styles.gridLine, { backgroundColor: colors.line, top: padding }]} />
      <View style={[styles.gridLine, { backgroundColor: colors.line, top: height / 2 }]} />
      <View style={[styles.gridLine, { backgroundColor: colors.line, top: height - padding }]} />

      {points.slice(1).map((point, index) => {
        const previous = points[index];
        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={`${point.id || point.date}-${index}-line`}
            style={[
              styles.lineSegment,
              {
                backgroundColor: color,
                left: previous.x,
                top: previous.y,
                transform: [{ rotate: `${angle}deg` }],
                width: length,
              },
            ]}
          />
        );
      })}

      {points.map((point, index) => (
        <View key={`${point.id || point.date}-${index}-point`}>
          <View style={[styles.chartPoint, { backgroundColor: color, left: point.x - 5, top: point.y - 5 }]} />
          <Text style={[styles.pointValue, { color: colors.ink, left: point.x - 20, top: Math.max(4, point.y - 26) }]}>
            {formatNumber(point.value)}
          </Text>
        </View>
      ))}

      <Text style={[styles.axisLabel, { color: colors.muted, left: 10, top: padding - 8 }]}>
        {formatNumber(max)} {unit}
      </Text>
      <Text style={[styles.axisLabel, { color: colors.muted, left: 10, top: height - padding - 8 }]}>
        {formatNumber(min)} {unit}
      </Text>
      <Text style={[styles.dateLabel, { color: colors.muted, left: padding - 4 }]}>{shortDate(points[0].date)}</Text>
      <Text style={[styles.dateLabel, { color: colors.muted, right: padding - 4 }]}>{shortDate(points[points.length - 1].date)}</Text>
    </View>
  );
}

function StrengthRadarChart({ items }: { items: { label: string; score: number }[] }) {
  const { colors } = useNetmindTheme();
  const size = 260;
  const center = size / 2;
  const radius = 86;
  const labelRadius = 112;
  const rings = [1, 0.7, 0.4];
  const points = items.map((item, index) => {
    const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2;
    const scale = Math.max(0, Math.min(item.score, 100)) / 100;

    return {
      ...item,
      angle,
      x: center + Math.cos(angle) * radius * scale,
      y: center + Math.sin(angle) * radius * scale,
      labelX: center + Math.cos(angle) * labelRadius,
      labelY: center + Math.sin(angle) * labelRadius,
    };
  });

  return (
    <View style={styles.strengthRadarWrap}>
      <View style={[styles.strengthRadarCanvas, { height: size, width: size }]}>
        {rings.map((ring) => (
          <View
            key={ring}
            style={[
              styles.strengthRadarRing,
              {
                borderColor: colors.line,
                height: radius * 2 * ring,
                left: center - radius * ring,
                top: center - radius * ring,
                width: radius * 2 * ring,
              },
            ]}
          />
        ))}
        {items.map((item, index) => {
          const angle = (index / items.length) * 360 - 90;

          return (
            <View
              key={`${item.label}-axis`}
              style={[
                styles.strengthRadarAxis,
                {
                  backgroundColor: colors.line,
                  left: center,
                  top: center,
                  transform: [{ rotate: `${angle}deg` }],
                  width: radius,
                },
              ]}
            />
          );
        })}
        {points.map((point, index) => {
          const next = points[(index + 1) % points.length];
          const dx = next.x - point.x;
          const dy = next.y - point.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          return (
            <View
              key={`${point.label}-edge`}
              style={[
                styles.strengthRadarEdge,
                {
                  backgroundColor: colors.court,
                  left: point.x,
                  top: point.y,
                  transform: [{ rotate: `${angle}deg` }],
                  width: length,
                },
              ]}
            />
          );
        })}
        {points.map((point) => (
          <View key={`${point.label}-point`}>
            <View style={[styles.strengthRadarPoint, { backgroundColor: colors.court, left: point.x - 6, top: point.y - 6 }]} />
            <Text
              numberOfLines={2}
              style={[
                styles.strengthRadarLabel,
                {
                  color: colors.muted,
                  left: point.labelX - 42,
                  top: point.labelY - 12,
                },
              ]}>
              {shortStrengthLabel(point.label)}
            </Text>
          </View>
        ))}
        <View style={[styles.strengthRadarCore, { backgroundColor: colors.courtSoft, borderColor: colors.court }]}>
          <Text style={[styles.strengthRadarCoreText, { color: colors.court }]}>
            {Math.round(items.reduce((sum, item) => sum + item.score, 0) / Math.max(items.length, 1))}
          </Text>
        </View>
      </View>
      <View style={styles.strengthRadarLegend}>
        {items.map((item) => (
          <View key={item.label} style={[styles.strengthRadarLegendItem, { backgroundColor: colors.wash, borderColor: colors.line }]}>
            <Text style={[styles.strengthRadarLegendScore, { color: colors.court }]}>{item.score}</Text>
            <Text style={[styles.strengthRadarLegendLabel, { color: colors.muted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function extractTrendEntries(logs: PerformanceLog[] = []): TrendEntry[] {
  return logs
    .reduce<TrendEntry[]>((entries, log) => {
      const metric = getLogMetric(log);
      const value = toNumber(log.value, Number.NaN);

      if (!Number.isFinite(value) || !trendMetrics.some((item) => item.key === metric)) return entries;

      entries.push({
        id: log.id,
        date: getLogDate(log),
        metric,
        value,
      });

      return entries;
    }, [])
    .sort((first, second) => first.date.localeCompare(second.date));
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

function latestFor(entries: TrendEntry[], metric: TrendMetric) {
  return entries.filter((entry) => entry.metric === metric).at(-1);
}

function buildTrendSummary(entries: TrendEntry[], metric: TrendMetric, unit: string, age?: number | string | null) {
  const latest = entries.at(-1);
  const previous = entries.at(-2);

  if (metric === 'avg_heart_rate') {
    if (!latest) {
      return {
        color: palette.court,
        detail: 'Log heart rate after training to classify workload as low, normal, or high.',
        icon: 'trending-flat' as const,
        label: 'Collecting',
      };
    }
    const heartRateRange = getPostTrainingHeartRateRange(age);

    if (latest.value < heartRateRange.low) {
      return {
        color: palette.gold,
        detail: `Latest heart rate is ${formatNumber(latest.value)} ${unit}, below the expected post-training range of ${heartRateRange.label}. This may indicate a light or recovery session.`,
        icon: 'favorite-border' as const,
        label: 'Low',
      };
    }

    if (latest.value <= heartRateRange.high) {
      return {
        color: palette.court,
        detail: `Latest heart rate is ${formatNumber(latest.value)} ${unit}, within the expected post-training range of ${heartRateRange.label}.`,
        icon: 'favorite' as const,
        label: 'Normal',
      };
    }

    return {
      color: palette.coral,
      detail: `Latest heart rate is ${formatNumber(latest.value)} ${unit}, above the expected post-training range of ${heartRateRange.label}. Review fatigue, recovery, and rest periods before heavy drills.`,
      icon: 'warning-amber' as const,
      label: 'High',
    };
  }

  if (!latest || !previous) {
    return {
      color: palette.court,
      detail: 'More readings are needed before the app can compare recent performance.',
      icon: 'trending-flat' as const,
      label: 'Collecting',
    };
  }

  const change = latest.value - previous.value;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'steady';
  const formattedChange = `${change > 0 ? '+' : ''}${formatNumber(change)} ${unit}`;

  if (direction === 'up') {
    return {
      color: palette.court,
      detail: `Latest ${metric === 'highest_jump' ? 'jump height' : 'spike speed'} improved by ${formattedChange} compared with the previous log.`,
      icon: 'trending-up' as const,
      label: 'Improving',
    };
  }

  if (direction === 'down') {
    return {
      color: palette.coral,
      detail: `Latest ${metric === 'highest_jump' ? 'jump height' : 'spike speed'} dropped by ${formatNumber(Math.abs(change))} ${unit} compared with the previous log.`,
      icon: 'trending-down' as const,
      label: 'Needs review',
    };
  }

  return {
    color: palette.gold,
    detail: `Latest ${metric === 'highest_jump' ? 'jump height' : 'spike speed'} stayed steady at ${formatNumber(latest.value)} ${unit}.`,
    icon: 'trending-flat' as const,
    label: 'Stable',
  };
}

function getPostTrainingHeartRateRange(age?: number | string | null) {
  const playerAge = toNumber(age, Number.NaN);

  if (Number.isFinite(playerAge) && playerAge > 0) {
    const maxHeartRate = 220 - playerAge;
    const low = Math.round(maxHeartRate * 0.6);
    const high = Math.round(maxHeartRate * 0.85);

    return {
      low,
      high,
      label: `${low}-${high} bpm`,
    };
  }

  return {
    low: 120,
    high: 170,
    label: '120-170 bpm',
  };
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function shortDate(date: string) {
  const [, month = '', day = ''] = date.match(/^\d{4}-(\d{2})-(\d{2})/) || [];
  return month && day ? `${month}/${day}` : date.slice(0, 5);
}

function shortStrengthLabel(label: string) {
  return label.split(' ')[0];
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
    gap: 12,
  },
  trendCard: {
    gap: 14,
  },
  segmentedControl: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 5,
  },
  segmentButton: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 8,
  },
  segmentDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '900',
  },
  trendHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  trendBadge: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 9,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lineChart: {
    alignSelf: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 170,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLine: {
    height: 1,
    left: 24,
    opacity: 0.7,
    position: 'absolute',
    right: 24,
  },
  lineSegment: {
    height: 3,
    position: 'absolute',
    transformOrigin: 'left center',
  },
  chartPoint: {
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  pointValue: {
    fontSize: 10,
    fontWeight: '900',
    position: 'absolute',
    textAlign: 'center',
    width: 40,
  },
  axisLabel: {
    fontSize: 9,
    fontWeight: '800',
    position: 'absolute',
  },
  dateLabel: {
    bottom: 5,
    fontSize: 10,
    fontWeight: '900',
    position: 'absolute',
  },
  emptyChart: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 170,
    justifyContent: 'center',
    padding: 18,
    width: 300,
  },
  emptyChartText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  strengthRadarCard: {
    gap: 14,
  },
  strengthRadarWrap: {
    gap: 14,
  },
  strengthRadarCanvas: {
    alignSelf: 'center',
    position: 'relative',
  },
  strengthRadarRing: {
    borderRadius: 8,
    borderWidth: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  strengthRadarAxis: {
    height: 1,
    position: 'absolute',
    transformOrigin: 'left center',
  },
  strengthRadarEdge: {
    height: 4,
    position: 'absolute',
    transformOrigin: 'left center',
  },
  strengthRadarPoint: {
    borderRadius: 6,
    height: 12,
    position: 'absolute',
    width: 12,
  },
  strengthRadarLabel: {
    fontSize: 10,
    fontWeight: '900',
    position: 'absolute',
    textAlign: 'center',
    textTransform: 'uppercase',
    width: 84,
  },
  strengthRadarCore: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    left: 102,
    position: 'absolute',
    top: 102,
    width: 56,
  },
  strengthRadarCoreText: {
    fontSize: 18,
    fontWeight: '900',
  },
  strengthRadarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  strengthRadarLegendItem: {
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 2,
    minHeight: 54,
    padding: 10,
  },
  strengthRadarLegendScore: {
    fontSize: 16,
    fontWeight: '900',
  },
  strengthRadarLegendLabel: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
});
