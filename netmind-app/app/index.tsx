import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/netmind-ui';
import { palette } from '@/constants/netmind';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <MaterialIcons name="sports-volleyball" size={34} color="#ffffff" />
          </View>
          <Text style={styles.brand}>NetMind</Text>
          <Text style={styles.headline}>Explore Us</Text>
          <Text style={styles.tagline}>
            Train smarter, track performance, and manage volleyball goals from one mobile app.
          </Text>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <MaterialIcons name="analytics" size={24} color={palette.court} />
            <Text style={styles.previewText}>Player analytics and jump trends</Text>
          </View>
          <View style={styles.previewRow}>
            <MaterialIcons name="assignment" size={24} color={palette.coral} />
            <Text style={styles.previewText}>Training tasks from coaches</Text>
          </View>
          <View style={styles.previewRow}>
            <MaterialIcons name="edit-note" size={24} color={palette.blue} />
            <Text style={styles.previewText}>Fast performance logging</Text>
          </View>
        </View>

        <PrimaryButton icon="explore" onPress={() => router.push('/login')} title="Explore Us" />
      </View>
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
    color: '#d5f2ee',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 330,
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderColor: palette.line,
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
