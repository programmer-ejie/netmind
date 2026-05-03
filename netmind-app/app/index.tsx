import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/netmind-ui';
import { palette } from '@/constants/netmind';
import { useNetmindTheme } from '@/contexts/netmind-theme';

export default function HomeScreen() {
  const { colors } = useNetmindTheme();

  return (
    <ImageBackground
      resizeMode="cover"
      source={require('@/assets/images/explore-us-bg.png')}
      style={styles.background}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]}>
          <View style={styles.container}>
            <View style={styles.hero}>
              <View style={styles.logo}>
                <MaterialIcons name="sports-volleyball" size={34} color="#ffffff" />
              </View>
              <Text style={styles.brand}>NetMind</Text>
              <Text style={styles.headline}>Explore Us</Text>
              <Text style={[styles.tagline, { color: colors.courtMist }]}>
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
    backgroundColor: 'rgba(3, 18, 25, 0.64)',
    flex: 1,
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
    backgroundColor: palette.coral,
    borderRadius: 8,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  brand: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  headline: {
    color: '#ffffff',
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
