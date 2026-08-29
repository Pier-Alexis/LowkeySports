import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={colors.bg}
      iconColor={{ default: colors.textMuted, selected: colors.gold }}
      labelStyle={{ selected: { color: colors.gold } }}
    >
      <NativeTabs.Trigger name="index">
        <Label>Accueil</Label>
        <Icon sf="house.fill" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="home" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="disciplines">
        <Label>Disciplines</Label>
        <Icon sf="square.grid.2x2.fill" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="view-grid" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="articles">
        <Label>Analyses</Label>
        <Icon sf="doc.text.fill" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="text-box" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="about">
        <Label>À propos</Label>
        <Icon sf="info.circle.fill" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="information" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <Label>Compte</Label>
        <Icon sf="person.fill" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="account" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}