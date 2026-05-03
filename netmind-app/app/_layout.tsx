import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { NetmindThemeProvider, useNetmindTheme } from '@/contexts/netmind-theme';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  return (
    <NetmindThemeProvider>
      <RootNavigator />
    </NetmindThemeProvider>
  );
}

function RootNavigator() {
  const { isDark } = useNetmindTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
