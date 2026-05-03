import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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

export default function LoginScreen() {
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.brandBlock}>
          <View style={styles.logo}>
            <MaterialIcons name="sports-volleyball" size={34} color="#ffffff" />
          </View>
          <Text style={styles.brand}>NetMind</Text>
          <Text style={styles.tagline}>Sign in to your volleyball performance dashboard.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Login</Text>

          <Text style={styles.label}>Gmail</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setGmail}
            placeholder="yourname@gmail.com"
            placeholderTextColor="#8a96a3"
            style={styles.input}
            value={gmail}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordBox}>
            <TextInput
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8a96a3"
              secureTextEntry={!passwordVisible}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
              onPress={() => setPasswordVisible((current) => !current)}
              style={styles.eyeButton}>
              <MaterialIcons
                name={passwordVisible ? 'visibility-off' : 'visibility'}
                size={22}
                color={palette.muted}
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
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.courtDark,
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
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
  },
  tagline: {
    color: palette.courtMist,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 310,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 12,
    padding: 18,
  },
  formTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: palette.wash,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  passwordBox: {
    alignItems: 'center',
    backgroundColor: palette.wash,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
  },
  passwordInput: {
    color: palette.ink,
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
