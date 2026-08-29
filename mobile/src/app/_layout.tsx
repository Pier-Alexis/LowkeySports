import { Stack } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { bootSession } from '@/lib/auth';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.gold,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.gold
  }
};

export default function RootLayout() {
  useEffect(() => {
    bootSession().finally(() => SplashScreen.hideAsync());
  }, []);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}