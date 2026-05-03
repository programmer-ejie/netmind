import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card, ListRow, PrimaryButton, Screen, SectionTitle } from '@/components/netmind-ui';
import { palette } from '@/constants/netmind';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkTheme, setDarkTheme] = useState(false);

  return (
    <Screen title="Settings" subtitle="Manage app preferences and data options.">
      <SectionTitle>Preferences</SectionTitle>
      <Card style={styles.settingsCard}>
        <SettingToggle
          label="Notifications"
          onValueChange={setNotifications}
          value={notifications}
        />
        <SettingToggle label="Dark theme" onValueChange={setDarkTheme} value={darkTheme} />
      </Card>

      <SectionTitle>Data</SectionTitle>
      <Card>
        <ListRow detail="Download training and match logs" icon="download" title="Data export" />
        <ListRow detail="Sync when Wi-Fi is available" icon="sync" title="Background sync" />
      </Card>

      <PrimaryButton
        icon="logout"
        onPress={() => router.replace('/')}
        title="Sign out"
        variant="outline"
      />
    </Screen>
  );
}

function SettingToggle({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        ios_backgroundColor="#d1dbe3"
        onValueChange={onValueChange}
        thumbColor="#ffffff"
        trackColor={{ false: '#d1dbe3', true: palette.court }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  settingsCard: {
    gap: 10,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  toggleLabel: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});
