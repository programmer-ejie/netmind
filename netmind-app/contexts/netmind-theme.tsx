import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
const THEME_STORAGE_KEY = 'netmind_theme_mode';

export function NetmindThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkPalette : palette;

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedMode) => {
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setMode(savedMode);
        }
      })
      .catch(() => {
        setMode('system');
      });
  }, []);

  const setDarkTheme = useCallback((enabled: boolean) => {
    const nextMode = enabled ? 'dark' : 'light';
    setMode(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      colors,
      isDark,
      mode,
      setDarkTheme,
    }),
    [colors, isDark, mode, setDarkTheme]
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
