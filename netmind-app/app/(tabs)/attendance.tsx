import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import {
  checkInWithAttendanceQr,
  getAttendanceQrInfo,
  listPlayerAttendanceLogs,
  listPlayerPerformanceLogs,
  type AttendanceLog,
  type AttendanceQrInfo,
  type NetmindUser,
  type PerformanceLog,
} from '@/lib/api';

type ScanStatus = 'idle' | 'checking' | 'success' | 'error';
type AttendanceTab = 'qr' | 'logs';
type ReportForm = {
  totalJumps: string;
  totalSpikes: string;
  avgHeartRate: string;
};
type ReportSummary = {
  attendanceLogId: string;
  totalJumps?: number;
  totalSpikes?: number;
  avgHeartRate?: number;
};

const initialReportForm: ReportForm = {
  totalJumps: '',
  totalSpikes: '',
  avgHeartRate: '',
};
const LOGS_PER_PAGE = 4;

function extractQrToken(value: string) {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    const token = parsed.searchParams.get('token');
    if (token) return token;
  } catch {
    // Plain tokens are allowed for manual testing and copied QR payloads.
  }

  const tokenMatch = trimmed.match(/token=([^&\s]+)/i);
  if (tokenMatch?.[1]) return decodeURIComponent(tokenMatch[1]);

  return trimmed;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseReportNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function logDateTime(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function dateKey(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function sortAttendanceLogs(logs: AttendanceLog[]) {
  return [...logs].sort((first, second) => {
    const sessionOrder = logDateTime(second.session_date) - logDateTime(first.session_date);
    if (sessionOrder !== 0) return sessionOrder;

    const createdOrder = logDateTime(second.created_at) - logDateTime(first.created_at);
    if (createdOrder !== 0) return createdOrder;

    return Number(second.id) - Number(first.id);
  });
}

function findExistingAttendanceLog(info: AttendanceQrInfo, logs: AttendanceLog[]) {
  return logs.find((log) => (
    String(log.team_id) === String(info.team_id)
    && String(log.session_type) === String(info.session_type)
    && dateKey(log.session_date) === dateKey(info.session_date)
  ));
}

function getLogPage(logs: AttendanceLog[], logId: number | string) {
  const index = logs.findIndex((log) => String(log.id) === String(logId));
  return index < 0 ? 1 : Math.floor(index / LOGS_PER_PAGE) + 1;
}

function readMetric(log: PerformanceLog) {
  const notes = log.notes || '';
  const attendanceLogId = notes.match(/attendance_log_id:\s*(\d+)/i)?.[1];
  const metric = notes.match(/metric:\s*([a-z_]+)/i)?.[1];

  if (!attendanceLogId || !metric) return null;
  return {
    attendanceLogId,
    metric,
    value: Number(log.value),
  };
}

function buildReportSummaries(logs: PerformanceLog[]) {
  const summaries = new Map<string, ReportSummary>();

  logs.forEach((log) => {
    const metric = readMetric(log);
    if (!metric || Number.isNaN(metric.value)) return;

    const summary = summaries.get(metric.attendanceLogId) || { attendanceLogId: metric.attendanceLogId };

    if (metric.metric === 'total_jumps') summary.totalJumps = metric.value;
    if (metric.metric === 'total_spikes') summary.totalSpikes = metric.value;
    if (metric.metric === 'avg_heart_rate') summary.avgHeartRate = metric.value;

    summaries.set(metric.attendanceLogId, summary);
  });

  return summaries;
}

export default function AttendanceScreen() {
  const { colors, isDark } = useNetmindTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [activeTab, setActiveTab] = useState<AttendanceTab>('qr');
  const [currentUser, setCurrentUser] = useState<NetmindUser | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState('Tap Scan QR when your trainer displays the attendance code.');
  const [pendingToken, setPendingToken] = useState('');
  const [qrInfo, setQrInfo] = useState<AttendanceQrInfo | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [reportLogs, setReportLogs] = useState<PerformanceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
  const [reportForm, setReportForm] = useState<ReportForm>(initialReportForm);
  const [logsPage, setLogsPage] = useState(1);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScan = useRef({ token: '', scannedAt: 0 });

  const loadLogs = useCallback(async (userId: number | string) => {
    setLoadingLogs(true);

    try {
      const [attendance, performance] = await Promise.all([
        listPlayerAttendanceLogs(userId),
        listPlayerPerformanceLogs(userId),
      ]);
      setAttendanceLogs(sortAttendanceLogs(attendance));
      setReportLogs(performance.filter((log) => (log.notes || '').includes('After training report')));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load attendance logs.');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('netmind_user')
      .then((value) => {
        const user = value ? JSON.parse(value) as NetmindUser : null;
        setCurrentUser(user);
        if (user?.id) {
          loadLogs(user.id);
        } else {
          setLoadingLogs(false);
        }
      })
      .catch(() => {
        setCurrentUser(null);
        setLoadingLogs(false);
      });
  }, [loadLogs]);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const cameraReady = permission?.granted;
  const reportSummaries = useMemo(() => buildReportSummaries(reportLogs), [reportLogs]);
  const totalLogPages = Math.max(1, Math.ceil(attendanceLogs.length / LOGS_PER_PAGE));
  const visibleLogs = useMemo(() => {
    const start = (logsPage - 1) * LOGS_PER_PAGE;
    return attendanceLogs.slice(start, start + LOGS_PER_PAGE);
  }, [attendanceLogs, logsPage]);
  const statusTone = useMemo(() => {
    if (status === 'success') return colors.court;
    if (status === 'error') return colors.coral;
    return colors.muted;
  }, [colors.coral, colors.court, colors.muted, status]);
  const reportReady = Boolean(pendingToken && qrInfo && !qrInfo.expired);

  useEffect(() => {
    setLogsPage((current) => Math.min(current, totalLogPages));
  }, [totalLogPages]);

  const resetScannerSoon = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);

    resumeTimer.current = setTimeout(() => {
      setScanned(false);
    }, 1200);
  }, []);

  const openScanner = async () => {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) return;
    }

    setScannerOpen(true);
    setScanned(false);
    setStatus('idle');
    setMessage('Point your camera at the trainer QR code.');
  };

  const closeScanner = () => {
    setScannerOpen(false);
    setScanned(false);
  };

  const handleBarcodeScanned = useCallback(async ({ data }: BarcodeScanningResult) => {
    if (scanned) return;

    const token = extractQrToken(data || '');
    const now = Date.now();

    if (token && lastScan.current.token === token && now - lastScan.current.scannedAt < 4500) {
      return;
    }

    lastScan.current = { token, scannedAt: now };

    if (!token) {
      setStatus('error');
      setMessage('This QR code does not include an attendance token.');
      setScanned(true);
      resetScannerSoon();
      return;
    }

    if (!currentUser?.id) {
      setStatus('error');
      setMessage('Please sign in again before scanning attendance.');
      setScanned(true);
      resetScannerSoon();
      return;
    }

    setScanned(true);
    setStatus('checking');
    setMessage('Checking attendance QR...');

    try {
      const info = await getAttendanceQrInfo(token);
      setQrInfo(info);

      if (info.expired) {
        setPendingToken('');
        setStatus('error');
        setMessage('This QR code is already expired. Ask your trainer to generate a new one.');
        resetScannerSoon();
        return;
      }

      const existingLog = findExistingAttendanceLog(info, attendanceLogs);

      if (existingLog) {
        setPendingToken('');
        setScannerOpen(false);
        setReportForm(initialReportForm);
        setLogsPage(getLogPage(attendanceLogs, existingLog.id));
        setActiveTab('logs');
        setStatus('success');
        setMessage(`Already submitted for ${formatDate(info.session_date)}.`);
        return;
      }

      setPendingToken(token);
      setScannerOpen(false);
      setReportForm(initialReportForm);
      setStatus('idle');
      setMessage('QR scanned. Fill up the after-training report to complete check-in.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to check this QR.');
      resetScannerSoon();
    }
  }, [attendanceLogs, currentUser?.id, resetScannerSoon, scanned]);

  const updateReport = (field: keyof ReportForm, value: string) => {
    setReportForm((current) => ({ ...current, [field]: value.replace(/[^\d.]/g, '') }));
  };

  const submitReport = async () => {
    if (!currentUser?.id || !pendingToken || savingReport) return;

    const totalJumps = parseReportNumber(reportForm.totalJumps);
    const totalSpikes = parseReportNumber(reportForm.totalSpikes);
    const avgHeartRate = parseReportNumber(reportForm.avgHeartRate);

    if (totalJumps === null || totalSpikes === null || avgHeartRate === null) {
      setStatus('error');
      setMessage('Enter valid numbers for jumps, spikes, and average heart rate.');
      return;
    }

    setSavingReport(true);
    setStatus('checking');
    setMessage('Submitting attendance report...');

    try {
      const log = await checkInWithAttendanceQr(pendingToken, currentUser.id, {
        total_jumps: totalJumps,
        total_spikes: totalSpikes,
        avg_heart_rate: avgHeartRate,
      });

      setAttendanceLogs((current) => sortAttendanceLogs([
        log,
        ...current.filter((item) => item.id !== log.id),
      ]));
      setReportLogs((current) => [
        ...(log.report_logs || []),
        ...current.filter((item) => (
          !(log.report_logs || []).some((saved) => saved.id === item.id)
          && !(item.notes || '').includes(`attendance_log_id: ${log.id}`)
        )),
      ]);
      setPendingToken('');
      setQrInfo(null);
      setReportForm(initialReportForm);
      setLogsPage(1);
      setActiveTab('logs');
      setStatus('success');
      setMessage('Attendance and after-training report submitted.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to submit attendance report.');
    } finally {
      setSavingReport(false);
    }
  };

  return (
    <Screen
      onRefresh={() => currentUser?.id ? loadLogs(currentUser.id) : undefined}
      refreshing={loadingLogs}
      title="Attendance"
      subtitle="Scan the trainer QR code, then submit your after-training report.">
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <AttendanceTabButton
          active={activeTab === 'qr'}
          icon="qr-code-scanner"
          label="QR"
          onPress={() => setActiveTab('qr')}
        />
        <AttendanceTabButton
          active={activeTab === 'logs'}
          icon="history"
          label="Logs"
          onPress={() => {
            setScannerOpen(false);
            setActiveTab('logs');
          }}
        />
      </View>

      {activeTab === 'qr' ? (
        <>
          <Card style={styles.heroCard}>
            <View style={[styles.heroIcon, { backgroundColor: colors.courtSoft }]}>
              <MaterialIcons name="qr-code-scanner" size={28} color={colors.court} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: colors.ink }]}>QR Check-In</Text>
              <Text style={[styles.heroText, { color: colors.muted }]}>
                The scanner opens only when you tap the scan button.
              </Text>
            </View>
          </Card>

          <Card style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.wash }]}>
              {status === 'checking' ? (
                <ActivityIndicator color={colors.court} />
              ) : (
                <MaterialIcons
                  name={status === 'success' ? 'check-circle' : status === 'error' ? 'error-outline' : 'qr-code-2'}
                  size={24}
                  color={statusTone}
                />
              )}
            </View>
            <View style={styles.statusCopy}>
              <Text style={[styles.statusTitle, { color: colors.ink }]}>
                {reportReady ? 'After training report' : status === 'success' ? 'Submitted' : status === 'error' ? 'Action needed' : status === 'checking' ? 'Working' : 'Ready'}
              </Text>
              <Text style={[styles.statusText, { color: status === 'error' ? colors.coral : colors.muted }]}>{message}</Text>
              {qrInfo ? (
                <Text style={[styles.statusMeta, { color: colors.muted }]}>
                  Session date: {formatDate(qrInfo.session_date)}
                </Text>
              ) : null}
            </View>
          </Card>

          {!reportReady ? (
            <View style={styles.scanAction}>
              <PrimaryButton icon={scannerOpen ? 'close' : 'qr-code-scanner'} onPress={scannerOpen ? closeScanner : openScanner} title={scannerOpen ? 'Close scanner' : 'Scan QR'} />
            </View>
          ) : null}

          {scannerOpen ? (
            <Card style={styles.scannerCard}>
              {!permission ? (
                <View style={styles.permissionState}>
                  <ActivityIndicator color={colors.court} />
                  <Text style={[styles.permissionText, { color: colors.muted }]}>Preparing camera...</Text>
                </View>
              ) : !cameraReady ? (
                <View style={styles.permissionState}>
                  <MaterialIcons name="photo-camera" size={34} color={colors.court} />
                  <Text style={[styles.permissionTitle, { color: colors.ink }]}>Camera access needed</Text>
                  <Text style={[styles.permissionText, { color: colors.muted }]}>
                    NetMind needs camera access so you can scan attendance QR codes.
                  </Text>
                  <PrimaryButton icon="photo-camera" onPress={requestPermission} title="Allow Camera" />
                </View>
              ) : (
                <View style={styles.cameraWrap}>
                  <CameraView
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    style={styles.camera}
                  />
                  <View pointerEvents="none" style={styles.scanOverlay}>
                    <View style={[styles.scanFrame, { borderColor: colors.court }]} />
                  </View>
                </View>
              )}
            </Card>
          ) : null}

          {reportReady ? (
            <>
              <SectionTitle>After training report</SectionTitle>
              <Card style={styles.reportCard}>
                <ReportField label="Total Jumps" onChangeText={(value) => updateReport('totalJumps', value)} value={reportForm.totalJumps} />
                <ReportField label="Total Spikes" onChangeText={(value) => updateReport('totalSpikes', value)} value={reportForm.totalSpikes} />
                <ReportField label="Avg Heart Rate" onChangeText={(value) => updateReport('avgHeartRate', value)} suffix="bpm" value={reportForm.avgHeartRate} />
                <PrimaryButton disabled={savingReport} icon="save" onPress={submitReport} title={savingReport ? 'Submitting...' : 'Submit report'} />
              </Card>
            </>
          ) : null}
        </>
      ) : (
        <>
          <SectionTitle>Logs</SectionTitle>
          {status === 'success' ? (
            <Card style={styles.noticeCard}>
              <View style={[styles.noticeIcon, { backgroundColor: colors.courtSoft }]}>
                <MaterialIcons name="check-circle" size={20} color={colors.court} />
              </View>
              <Text style={[styles.noticeText, { color: colors.ink }]}>{message}</Text>
            </Card>
          ) : null}
          {loadingLogs ? (
            <Card style={styles.loadingCard}>
              <ActivityIndicator color={colors.court} />
              <Text style={[styles.permissionText, { color: colors.muted }]}>Loading attendance logs...</Text>
            </Card>
          ) : attendanceLogs.length ? (
            <>
              <View style={styles.logList}>
                {visibleLogs.map((log) => (
                  <AttendanceLogCard key={log.id} log={log} report={reportSummaries.get(String(log.id))} />
                ))}
              </View>
              <View style={[styles.pagination, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Pressable
                  accessibilityRole="button"
                  disabled={logsPage <= 1}
                  onPress={() => setLogsPage((page) => Math.max(1, page - 1))}
                  style={[styles.pageButton, { backgroundColor: colors.wash, borderColor: colors.line }, logsPage <= 1 ? styles.disabledButton : null]}>
                  <MaterialIcons name="chevron-left" size={22} color={colors.court} />
                </Pressable>
                <Text style={[styles.pageText, { color: colors.ink }]}>Page {logsPage} of {totalLogPages}</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={logsPage >= totalLogPages}
                  onPress={() => setLogsPage((page) => Math.min(totalLogPages, page + 1))}
                  style={[styles.pageButton, { backgroundColor: colors.wash, borderColor: colors.line }, logsPage >= totalLogPages ? styles.disabledButton : null]}>
                  <MaterialIcons name="chevron-right" size={22} color={colors.court} />
                </Pressable>
              </View>
            </>
          ) : (
            <Card>
              <Text style={[styles.emptyText, { color: colors.muted }]}>No attendance logs yet.</Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function ReportField({
  label,
  suffix,
  value,
  onChangeText,
}: {
  label: string;
  suffix?: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.reportField}>
      <Text style={[styles.reportLabel, { color: colors.ink }]}>{label}</Text>
      <View style={styles.reportInputRow}>
        <TextInput
          keyboardType="number-pad"
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={colors.muted}
          style={[
            styles.reportInput,
            { backgroundColor: colors.wash, borderColor: colors.line, color: colors.ink },
          ]}
          value={value}
        />
        {suffix ? <Text style={[styles.reportSuffix, { color: colors.muted }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function AttendanceTabButton({
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

function AttendanceLogCard({
  log,
  report,
}: {
  log: AttendanceLog;
  report?: ReportSummary;
}) {
  const { colors } = useNetmindTheme();

  return (
    <Card style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={[styles.logIcon, { backgroundColor: colors.courtSoft }]}>
          <MaterialIcons name="event-available" size={20} color={colors.court} />
        </View>
        <View style={styles.logTitleBlock}>
          <Text style={[styles.logTitle, { color: colors.ink }]}>{formatDate(log.session_date)}</Text>
          <Text style={[styles.logMeta, { color: colors.muted }]}>
            {log.session_type} - {log.status}
          </Text>
        </View>
      </View>
      {report ? (
        <View style={styles.metricGrid}>
          <Metric label="Jumps" value={report.totalJumps ?? '-'} />
          <Metric label="Spikes" value={report.totalSpikes ?? '-'} />
          <Metric label="Avg HR" value={report.avgHeartRate != null ? `${report.avgHeartRate} bpm` : '-'} />
        </View>
      ) : (
        <Text style={[styles.logMeta, { color: colors.muted }]}>No after-training report saved for this log.</Text>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  const { colors } = useNetmindTheme();

  return (
    <View style={[styles.metricBox, { backgroundColor: colors.wash, borderColor: colors.line }]}>
      <Text style={[styles.metricValue, { color: colors.ink }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  heroCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
  },
  scanAction: {
    marginTop: -2,
  },
  scannerCard: {
    padding: 10,
  },
  cameraWrap: {
    backgroundColor: '#0b1820',
    borderRadius: 8,
    height: 330,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.10)',
    justifyContent: 'center',
  },
  scanFrame: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 3,
    height: 210,
    width: 210,
  },
  permissionState: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    minHeight: 280,
    padding: 20,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    gap: 12,
  },
  statusIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusMeta: {
    fontSize: 13,
    fontWeight: '800',
  },
  reportCard: {
    gap: 14,
  },
  reportField: {
    gap: 7,
  },
  reportLabel: {
    fontSize: 13,
    fontWeight: '900',
  },
  reportInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  reportInput: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  reportSuffix: {
    fontSize: 14,
    fontWeight: '900',
    minWidth: 36,
  },
  loadingCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  noticeCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  noticeIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  logList: {
    gap: 10,
  },
  pagination: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 10,
  },
  pageButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 44,
  },
  disabledButton: {
    opacity: 0.42,
  },
  pageText: {
    fontSize: 13,
    fontWeight: '900',
  },
  logCard: {
    gap: 12,
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  logTitleBlock: {
    flex: 1,
    gap: 2,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  logMeta: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
});
