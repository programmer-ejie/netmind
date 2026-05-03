import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PropsWithChildren } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/netmind';

export function Screen({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>NetMind Volleyball</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function MetricCard({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: string;
}) {
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricDot, { backgroundColor: tone ?? palette.court }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {delta ? <Text style={styles.metricDelta}>{delta}</Text> : null}
    </Card>
  );
}

export function PrimaryButton({
  title,
  icon,
  variant = 'solid',
  ...props
}: PressableProps & {
  title: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  variant?: 'solid' | 'outline';
}) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' ? styles.buttonOutline : styles.buttonSolid,
        pressed ? styles.buttonPressed : null,
      ]}>
      {icon ? (
        <MaterialIcons
          name={icon}
          size={20}
          color={variant === 'outline' ? palette.court : '#ffffff'}
        />
      ) : null}
      <Text style={variant === 'outline' ? styles.buttonOutlineText : styles.buttonSolidText}>
        {title}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = palette.court }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(value, 100))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function ListRow({
  title,
  detail,
  meta,
  icon = 'chevron-right',
}: {
  title: string;
  detail?: string;
  meta?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <MaterialIcons name={icon} size={20} color={palette.court} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
    </View>
  );
}

export function MiniBarChart({ values }: { values: number[] }) {
  const max = Math.max(...values);
  return (
    <View style={styles.chart}>
      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.chartColumn}>
          <View style={[styles.chartBar, { height: `${(value / max) * 100}%` }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.wash,
  },
  screen: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 110,
    gap: 16,
  },
  header: {
    gap: 5,
    paddingTop: 4,
  },
  eyebrow: {
    color: palette.court,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    gap: 5,
  },
  metricDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: '800',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  metricDelta: {
    color: palette.court,
    fontSize: 12,
    fontWeight: '800',
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  buttonSolid: {
    backgroundColor: palette.court,
  },
  buttonOutline: {
    backgroundColor: '#ffffff',
    borderColor: palette.line,
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.76,
  },
  buttonSolidText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonOutlineText: {
    color: palette.court,
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: '#e8eef2',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: palette.courtSoft,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  rowDetail: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 140,
    paddingTop: 10,
  },
  chartColumn: {
    backgroundColor: '#e8eef2',
    borderRadius: 8,
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBar: {
    backgroundColor: palette.court,
    borderRadius: 8,
    minHeight: 12,
    width: '100%',
  },
});
