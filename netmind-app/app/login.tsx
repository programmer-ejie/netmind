import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ImageBackground,
  Image,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/netmind-ui';
import { palette } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import { API_BASE, loginUser } from '@/lib/api';

const logoSource = require('@/assets/images/website_logo.png');

export default function LoginScreen() {
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authModal, setAuthModal] = useState<{ title: string; message: string } | null>(null);
  const { colors, isDark } = useNetmindTheme();
  const backgroundSource = isDark
    ? require('@/assets/images/login-bg.optimized.jpg')
    : require('@/assets/images/light-login-bg.optimized.jpg');
  const brandTextColor = isDark ? '#ffffff' : colors.ink;

  const handleLogin = async () => {
    if (!gmail.trim() || !password) {
      setAuthModal({
        title: 'Account not found',
        message: 'Please enter your registered Gmail and password.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await loginUser({
        email: gmail.trim(),
        password,
      });

      if (payload.user?.role !== 'player') {
        setAuthModal({
          title: 'Account not found',
          message: 'Account not found or registered for the app. Please use a player account.',
        });
        return;
      }

      await AsyncStorage.multiSet([
        ['netmind_user', JSON.stringify(payload.user)],
        ['netmind_token', payload.token],
      ]);
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Network request failed') {
        setAuthModal({
          title: 'Cannot connect to server',
          message: `The app cannot reach ${API_BASE}. Make sure your phone is on the same Wi-Fi and the backend is running.`,
        });
        return;
      }

      const message = error instanceof Error && error.message === 'Invalid email or password'
        ? 'Account not found or registered. Please check your Gmail and password.'
        : error instanceof Error
          ? error.message
          : 'Unable to log in.';

      setAuthModal({
        title: 'Account not found',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ImageBackground
      resizeMode="cover"
      source={backgroundSource}
      style={styles.background}>
      <View style={[styles.overlay, isDark ? styles.darkOverlay : styles.lightOverlay]}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.brandBlock}>
                <View style={[styles.logo, { backgroundColor: colors.surface }]}>
                  <Image resizeMode="contain" source={logoSource} style={styles.logoImage} />
                </View>
                <Text style={[styles.brand, { color: brandTextColor }]}>NetMind</Text>
                <Text style={[styles.tagline, { color: isDark ? colors.courtMist : colors.muted }]}>
                  Sign in to your volleyball performance dashboard.
                </Text>
              </View>

              <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formTitle, { color: colors.ink }]}>Login</Text>

                <Text style={[styles.label, { color: colors.ink }]}>Gmail</Text>
                <TextInput
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onChangeText={setGmail}
                  placeholder="yourname@gmail.com"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.input,
                    { backgroundColor: colors.wash, borderColor: colors.line, color: colors.ink },
                  ]}
                  value={gmail}
                />

                <Text style={[styles.label, { color: colors.ink }]}>Password</Text>
                <View
                  style={[
                    styles.passwordBox,
                    { backgroundColor: colors.wash, borderColor: colors.line },
                  ]}>
                  <TextInput
                    editable={!isSubmitting}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!passwordVisible}
                    style={[styles.passwordInput, { color: colors.ink }]}
                    value={password}
                  />
                  <Pressable
                    accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                    onPress={() => setPasswordVisible((current) => !current)}
                    style={styles.eyeButton}>
                    <MaterialIcons
                      name={passwordVisible ? 'visibility-off' : 'visibility'}
                      size={22}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>

                <PrimaryButton
                  icon="login"
                  disabled={isSubmitting}
                  onPress={handleLogin}
                  title={isSubmitting ? 'Checking...' : 'Login'}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
        <Modal
          animationType="fade"
          onRequestClose={() => setAuthModal(null)}
          transparent
          visible={Boolean(authModal)}>
          <View style={[styles.modalBackdrop, isDark ? styles.modalBackdropDark : styles.modalBackdropLight]}>
            <View
              style={[
                styles.authModal,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  shadowOpacity: isDark ? 0.34 : 0.16,
                },
              ]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.line }]} />
              <View style={[styles.modalIconWrap, { backgroundColor: isDark ? colors.courtSoft : '#fff1ee' }]}>
                <MaterialIcons name="person-off" size={30} color={isDark ? colors.courtMist : palette.coral} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>{authModal?.title}</Text>
              <Text style={[styles.modalMessage, { color: colors.muted }]}>{authModal?.message}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAuthModal(null)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.court },
                  pressed ? styles.buttonPressed : null,
                ]}>
                <Text style={styles.modalButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  darkOverlay: {
    backgroundColor: 'rgba(3, 18, 25, 0.66)',
  },
  lightOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 28,
    justifyContent: 'center',
    padding: 22,
  },
  brandBlock: {
    gap: 10,
  },
  logo: {
    alignItems: 'center',
    borderRadius: 8,
    height: 62,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 62,
  },
  logoImage: {
    height: 58,
    width: 58,
  },
  brand: {
    fontSize: 42,
    fontWeight: '900',
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 310,
  },
  formCard: {
    borderRadius: 8,
    gap: 12,
    padding: 18,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  passwordBox: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdropDark: {
    backgroundColor: 'rgba(3, 18, 25, 0.76)',
  },
  modalBackdropLight: {
    backgroundColor: 'rgba(16, 37, 44, 0.34)',
  },
  authModal: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 360,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 28,
    width: '100%',
    elevation: 12,
  },
  modalHandle: {
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    width: 42,
  },
  modalIconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    marginBottom: 16,
    width: 58,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 18,
    textAlign: 'center',
  },
  modalButton: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 26,
    width: '100%',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
