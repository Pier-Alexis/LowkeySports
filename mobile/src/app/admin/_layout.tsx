import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg }
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Administration' }} />
      <Stack.Screen name="articles" options={{ title: 'Analyses' }} />
      <Stack.Screen name="users" options={{ title: 'Utilisateurs' }} />
    </Stack>
  );
}