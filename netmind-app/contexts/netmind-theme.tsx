import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, palette } from '@/constants/netmind';

type ThemeMode = 'system' | 'light' | 'dark';

type NetmindThemeContextValue = {
  colors: typeof palette;
  isDark: boolean;
  mode: ThemeMode;
  setDarkTheme: (enabled: boolean) => void;
};

const NetmindThemeContext = createContext<NetmindThemeContextValue | null>(null);

export function NetmindThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkPalette : palette;

  const value = useMemo(
    () => ({
      colors,
      isDark,
      mode,
      setDarkTheme: (enabled: boolean) => setMode(enabled ? 'dark' : 'light'),
    }),
    [colors, isDark, mode]
  );

  return <NetmindThemeContext.Provider value={value}>{children}</NetmindThemeContext.Provider>;
}

export function useNetmindTheme() {
  const context = useContext(NetmindThemeContext);

  if (!context) {
    throw new Error('useNetmindTheme must be used inside NetmindThemeProvider');
  }

  return context;
}
