import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import { Tabs, router, usePathname, type Href } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { useNetmindTheme } from '@/contexts/netmind-theme';

const logoSource = require('@/assets/images/website_logo.png');

const navItems = [
  { title: 'Home', route: '/(tabs)/dashboard', icon: 'dashboard' },
  { title: 'Log Performance', route: '/(tabs)/performance', icon: 'edit-note' },
  { title: 'My Stats', route: '/(tabs)/stats', icon: 'bar-chart' },
  { title: 'Wellness', route: '/(tabs)/wellness', icon: 'favorite' },
  { title: 'Training Tasks', route: '/(tabs)/training', icon: 'assignment' },
  { title: 'Report Injury', route: '/(tabs)/injury', icon: 'health-and-safety' },
  { title: 'Activity', route: '/(tabs)/activity', icon: 'timeline' },
  { title: 'Profile', route: '/(tabs)/profile', icon: 'person' },
  { title: 'Settings', route: '/(tabs)/settings', icon: 'settings' },
] as const;

export default function TabLayout() {
  const { colors, isDark } = useNetmindTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const bottomInset = Math.max(insets.bottom, 12);
  const drawerWidth = Math.min(width * 0.82, 340);

  useEffect(() => {
    Asset.loadAsync([logoSource]).catch(() => undefined);
  }, []);

  const openSidebar = () => {
    setSidebarOpen(true);
    requestAnimationFrame(() => {
      Animated.timing(drawerProgress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const closeSidebar = () => {
    Animated.timing(drawerProgress, {
      toValue: 0,
      duration: 210,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSidebarOpen(false);
    });
  };

  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  return (
    <View style={[styles.shell, { backgroundColor: colors.wash }]}>
      <Tabs
        screenOptions={{
          header: () => <AppHeader onOpenSidebar={openSidebar} />,
          tabBarActiveTintColor: colors.court,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800',
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            height: 60 + bottomInset,
            paddingBottom: bottomInset,
            paddingTop: 8,
          },
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="performance"
          options={{
            title: 'Log',
            tabBarIcon: ({ color }) => <MaterialIcons name="edit-note" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="wellness"
          options={{
            title: 'Wellness',
            tabBarIcon: ({ color }) => <MaterialIcons name="favorite" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => <MaterialIcons name="assignment" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="injury"
          options={{
            title: 'Injury',
            tabBarIcon: ({ color }) => <MaterialIcons name="health-and-safety" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
          }}
        />
      </Tabs>

      <Modal animationType="none" onRequestClose={closeSidebar} transparent visible={sidebarOpen}>
        <View style={styles.drawerBackdrop}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.drawerScrim,
              isDark ? styles.drawerBackdropDark : styles.drawerBackdropLight,
              { opacity: drawerProgress },
            ]}
          />
          <Pressable accessibilityLabel="Close sidebar" onPress={closeSidebar} style={styles.backdropPressArea} />
          <Animated.View style={[styles.drawerMotion, { transform: [{ translateX: drawerTranslateX }] }]}>
            <Sidebar drawerWidth={drawerWidth} onClose={closeSidebar} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function AppHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { colors } = useNetmindTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.line,
          paddingTop: insets.top + 8,
        },
      ]}>
      <View style={styles.brand}>
        <BrandLogo size={38} />
        <Text numberOfLines={1} style={[styles.brandText, { color: colors.ink }]}>NetMind</Text>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          style={[styles.iconButton, { backgroundColor: colors.wash, borderColor: colors.line }]}>
          <MaterialIcons name="notifications-none" size={22} color={colors.court} />
          <View style={[styles.notificationDot, { backgroundColor: colors.coral }]} />
        </Pressable>
        <Pressable
          accessibilityLabel="Open sidebar"
          accessibilityRole="button"
          onPress={onOpenSidebar}
          style={[styles.iconButton, { backgroundColor: colors.wash, borderColor: colors.line }]}>
          <MaterialIcons name="menu" size={24} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function Sidebar({ drawerWidth, onClose }: { drawerWidth: number; onClose: () => void }) {
  const { colors } = useNetmindTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const goTo = (route: Href) => {
    onClose();
    router.push(route);
  };

  return (
    <View
      style={[
        styles.drawer,
        {
          backgroundColor: colors.surface,
          borderRightColor: colors.line,
          paddingTop: insets.top + 14,
          width: drawerWidth,
        },
      ]}>
      <View style={styles.drawerBrand}>
        <BrandLogo size={44} />
        <View style={styles.drawerBrandText}>
          <Text style={[styles.drawerTitle, { color: colors.ink }]}>NetMind</Text>
          <Text style={[styles.drawerSubtitle, { color: colors.muted }]}>Player Workspace</Text>
        </View>
        <Pressable accessibilityLabel="Close sidebar" onPress={onClose} style={styles.drawerClose}>
          <MaterialIcons name="close" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.drawerNav}>
        {navItems.map((item) => {
          const pathPart = item.route.replace('/(tabs)', '');
          const isActive = pathname === pathPart || (pathPart === '/dashboard' && pathname === '/');

          return (
            <Pressable
              accessibilityRole="button"
              key={item.route}
              onPress={() => goTo(item.route)}
              style={[
                styles.drawerItem,
                {
                  backgroundColor: isActive ? colors.courtSoft : 'transparent',
                  borderColor: isActive ? colors.line : 'transparent',
                },
              ]}>
              <MaterialIcons
                name={item.icon}
                size={21}
                color={isActive ? colors.court : colors.muted}
              />
              <Text style={[styles.drawerItemText, { color: isActive ? colors.ink : colors.muted }]}>
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BrandLogo({ size }: { size: number }) {
  const { colors } = useNetmindTheme();

  return (
    <View
      style={[
        styles.logoFrame,
        {
          backgroundColor: colors.wash,
          borderColor: colors.line,
          height: size,
          width: size,
        },
      ]}>
      <ExpoImage
        cachePolicy="memory-disk"
        contentFit="contain"
        priority="high"
        recyclingKey="netmind-logo"
        source={logoSource}
        style={styles.logoImage}
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 70,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  brand: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  logoFrame: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    height: '100%',
    width: '100%',
  },
  brandText: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    width: 42,
  },
  notificationDot: {
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: 10,
    top: 10,
    width: 8,
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerBackdropDark: {
    backgroundColor: 'rgba(3, 18, 25, 0.72)',
  },
  drawerBackdropLight: {
    backgroundColor: 'rgba(16, 37, 44, 0.28)',
  },
  backdropPressArea: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerMotion: {
    height: '100%',
  },
  drawer: {
    borderRightWidth: 1,
    elevation: 16,
    height: '100%',
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  drawerBrand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 18,
  },
  drawerBrandText: {
    flex: 1,
    minWidth: 0,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  drawerSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  drawerClose: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  drawerNav: {
    gap: 6,
  },
  drawerItem: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  drawerItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
});
