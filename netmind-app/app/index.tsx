import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/netmind-ui';
import { palette } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';

const logoSource = require('@/assets/images/website_logo.png');

export default function HomeScreen() {
  const { colors, isDark } = useNetmindTheme();
  const backgroundSource = isDark
    ? require('@/assets/images/explore-us-bg.optimized.jpg')
    : require('@/assets/images/light-explore-us-bg.optimized.jpg');
  const heroTextColor = isDark ? '#ffffff' : colors.ink;
  const logoTextColor = isDark ? '#ffffff' : colors.courtDark;

  useEffect(() => {
    Asset.loadAsync([
      require('@/assets/images/login-bg.optimized.jpg'),
      require('@/assets/images/light-login-bg.optimized.jpg'),
      logoSource,
    ]).catch(() => undefined);
  }, []);

  return (
    <ImageBackground
      resizeMode="cover"
      source={backgroundSource}
      style={styles.background}>
      <View style={[styles.overlay, isDark ? styles.darkOverlay : styles.lightOverlay]}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]}>
          <View style={styles.container}>
            <View style={styles.hero}>
              <View style={styles.logo}>
                <Image resizeMode="contain" source={logoSource} style={styles.logoImage} />
              </View>
              <Text style={[styles.brand, { color: logoTextColor }]}>NetMind</Text>
              <Text style={[styles.headline, { color: heroTextColor }]}>Explore Us</Text>
              <Text style={[styles.tagline, { color: isDark ? colors.courtMist : colors.muted }]}>
                Train smarter, track performance, and manage volleyball goals from one mobile app.
              </Text>
            </View>

            <View
              style={[
                styles.previewCard,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}>
              <View style={styles.previewRow}>
                <MaterialIcons name="analytics" size={24} color={colors.court} />
                <Text style={[styles.previewText, { color: colors.ink }]}>
                  Player analytics and jump trends
                </Text>
              </View>
              <View style={styles.previewRow}>
                <MaterialIcons name="assignment" size={24} color={palette.coral} />
                <Text style={[styles.previewText, { color: colors.ink }]}>
                  Training tasks from coaches
                </Text>
              </View>
              <View style={styles.previewRow}>
                <MaterialIcons name="edit-note" size={24} color={palette.blue} />
                <Text style={[styles.previewText, { color: colors.ink }]}>Fast performance logging</Text>
              </View>
            </View>

            <PrimaryButton icon="explore" onPress={() => router.push('/login')} title="Explore Us" />
          </View>
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
    backgroundColor: 'rgba(3, 18, 25, 0.64)',
  },
  lightOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
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
  hero: {
    gap: 12,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
    fontSize: 24,
    fontWeight: '900',
  },
  headline: {
    fontSize: 44,
    fontWeight: '900',
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 330,
  },
  previewCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  previewText: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
});
