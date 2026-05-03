import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/netmind-ui';
import { palette } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';

export default function LoginScreen() {
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { colors, isDark } = useNetmindTheme();
  const backgroundSource = isDark
    ? require('@/assets/images/login-bg.optimized.jpg')
    : require('@/assets/images/light-login-bg.optimized.jpg');
  const brandTextColor = isDark ? '#ffffff' : colors.ink;

  return (
    <ImageBackground
      resizeMode="cover"
      source={backgroundSource}
      style={styles.background}>
      <View style={[styles.overlay, isDark ? styles.darkOverlay : styles.lightOverlay]}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}>
            <View style={styles.brandBlock}>
              <View style={styles.logo}>
                <MaterialIcons name="sports-volleyball" size={34} color="#ffffff" />
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
                onPress={() => router.replace('/(tabs)/dashboard')}
                title="Login"
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
    gap: 28,
    justifyContent: 'center',
    padding: 22,
  },
  brandBlock: {
    gap: 10,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: palette.coral,
    borderRadius: 8,
    height: 62,
    justifyContent: 'center',
    width: 62,
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
});
