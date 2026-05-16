import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import {
  checkInWithAttendanceQr,
  getAttendanceQrInfo,
  type AttendanceLog,
  type AttendanceQrInfo,
  type NetmindUser,
} from '@/lib/api';

type ScanStatus = 'idle' | 'checking' | 'success' | 'error';

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

export default function AttendanceScreen() {
  const { colors, isDark } = useNetmindTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [currentUser, setCurrentUser] = useState<NetmindUser | null>(null);
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState('Scan the QR from your trainer to check in.');
  const [qrInfo, setQrInfo] = useState<AttendanceQrInfo | null>(null);
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLog | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScan = useRef({ token: '', scannedAt: 0 });

  useEffect(() => {
    AsyncStorage.getItem('netmind_user')
      .then((value) => setCurrentUser(value ? JSON.parse(value) : null))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const cameraReady = permission?.granted;
  const statusTone = useMemo(() => {
    if (status === 'success') return colors.court;
    if (status === 'error') return colors.coral;
    return colors.muted;
  }, [colors.coral, colors.court, colors.muted, status]);

  const resumeScanningSoon = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);

    resumeTimer.current = setTimeout(() => {
      setScanned(false);
    }, 1800);
  }, []);

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
      resumeScanningSoon();
      return;
    }

    if (!currentUser?.id) {
      setStatus('error');
      setMessage('Please sign in again before scanning attendance.');
      setScanned(true);
      resumeScanningSoon();
      return;
    }

    setScanned(true);
    setStatus('checking');
    setMessage('Checking attendance QR...');
    setQrInfo(null);
    setAttendanceLog(null);

    try {
      const info = await getAttendanceQrInfo(token);
      setQrInfo(info);

      if (info.expired) {
        setStatus('error');
        setMessage('This QR code is already expired. Ask your trainer to generate a new one.');
        resumeScanningSoon();
        return;
      }

      const log = await checkInWithAttendanceQr(token, currentUser.id);
      setAttendanceLog(log);
      setStatus('success');
      setMessage('Attendance checked in successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to check in with this QR.');
    } finally {
      resumeScanningSoon();
    }
  }, [currentUser?.id, resumeScanningSoon, scanned]);

  return (
    <Screen
      title="Attendance"
      subtitle="Scan the trainer QR code to check in for today&apos;s session.">
      <Card style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: colors.courtSoft }]}>
          <MaterialIcons name="qr-code-scanner" size={28} color={colors.court} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, { color: colors.ink }]}>QR Check-In</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>
            Use this when your trainer displays the training attendance QR.
          </Text>
        </View>
      </Card>

      <SectionTitle>Scanner</SectionTitle>
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
            {status === 'success' ? 'Checked in' : status === 'error' ? 'Scan warning' : status === 'checking' ? 'Checking QR' : 'Ready to scan'}
          </Text>
          <Text style={[styles.statusText, { color: status === 'error' ? colors.coral : colors.muted }]}>{message}</Text>
          {qrInfo ? (
            <Text style={[styles.statusMeta, { color: colors.muted }]}>
              Session date: {formatDate(qrInfo.session_date)}
            </Text>
          ) : null}
          {attendanceLog ? (
            <Text style={[styles.statusMeta, { color: colors.court }]}>
              Status: {attendanceLog.status}
            </Text>
          ) : null}
        </View>
      </Card>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  scannerCard: {
    padding: 10,
  },
  cameraWrap: {
    height: 330,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#0b1820',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  scanFrame: {
    width: 210,
    height: 210,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  permissionState: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
});
