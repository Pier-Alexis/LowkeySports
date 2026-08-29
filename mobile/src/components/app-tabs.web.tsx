import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

const TABS: { name: string; href: '/' | '/disciplines' | '/articles' | '/about' | '/account'; label: string }[] = [
  { name: 'index', href: '/', label: 'Accueil' },
  { name: 'disciplines', href: '/disciplines', label: 'Disciplines' },
  { name: 'articles', href: '/articles', label: 'Analyses' },
  { name: 'about', href: '/about', label: 'À propos' },
  { name: 'account', href: '/account', label: 'Compte' },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%', backgroundColor: colors.bg }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.pressable, pressed && styles.pressed, isFocused && styles.active]}>
      <Text style={[styles.label, isFocused && styles.labelActive]}>{children}</Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.brand}>
          Lowkey<Text style={styles.brandGold}>Sports</Text>
        </Text>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },
  innerContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.two,
    paddingHorizontal: spacing.three,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: spacing.two,
    maxWidth: 800
  },
  brand: {
    color: colors.text,
    fontWeight: '800',
    marginRight: 'auto'
  },
  brandGold: {
    color: colors.gold
  },
  pressable: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999
  },
  pressed: {
    opacity: 0.7
  },
  active: {
    backgroundColor: colors.surface2
  },
  label: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13
  },
  labelActive: {
    color: colors.text
  }
});