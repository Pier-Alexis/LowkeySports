import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { AppText, Card, Chip, Hero } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { leaguesByRegion, leaguesBySport, SPORTS } from '@/lib/format';

export default function DisciplinesScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BrandHeader />

        <Hero compact>
          <AppText style={styles.title}>Par discipline</AppText>
          <AppText muted>
            Football américain (NCAAF, FBS &amp; FCS), basket NCAA et basketball européen, plus soccer,
            tennis, baseball et hockey.
          </AppText>
        </Hero>

        <View style={styles.list}>
          {SPORTS.map((sport) => {
            const leagues = leaguesBySport(sport.id);
            const groups = leaguesByRegion(sport.id);
            const expanded = open === sport.id;
            return (
              <Card
                key={sport.id}
                style={[styles.card, { borderLeftWidth: 5, borderLeftColor: sportColor(sport.id) }]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.nameRow}>
                    <AppText bold style={styles.sportName}>
                      {sport.icon} {sport.label}
                    </AppText>
                    {leagues.length > 0 && (
                      <View style={styles.count}>
                        <AppText small bold style={styles.countText}>
                          {leagues.length}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <Chip onPress={() => router.push(`/sport/${sport.id}`)}>Explorer →</Chip>
                </View>

                {leagues.length > 0 && (
                  <>
                    <Pressable
                      onPress={() => setOpen(expanded ? null : sport.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      hitSlop={8}
                    >
                      <Text style={styles.toggle}>
                        {expanded ? 'Masquer les ligues ▴' : `Voir les ${leagues.length} ligues ▾`}
                      </Text>
                    </Pressable>

                    {expanded && (
                      <View style={styles.groups}>
                        {groups.map((group) => (
                          <View key={group.region} style={styles.group}>
                            {groups.length > 1 && (
                              <AppText small bold muted style={styles.groupLabel}>
                                {group.label}
                              </AppText>
                            )}
                            <View style={styles.chips}>
                              {group.leagues.map((league) => (
                                <Chip
                                  key={league.id}
                                  onPress={() =>
                                    router.push({
                                      pathname: `/sport/${sport.id}`,
                                      params: { competition: league.id }
                                    })
                                  }
                                >
                                  {league.flag} {league.label}
                                </Chip>
                              ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </View>

        <Card style={styles.note}>
          <AppText bold>Où viennent les données ?</AppText>
          <AppText small muted style={styles.noteText}>
            College et NFL via ESPN. Le basketball hors États-Unis n'étant pas couvert par ESPN, les
            ligues européennes sont synchronisées via Sofascore. Les matchs dont un participant n'est pas
            encore connu (TBD, TBC…) sont masqués.
          </AppText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function sportColor(id: string): string {
  if (id === 'basketball') return colors.gold;
  if (id === 'tennis') return colors.purple;
  if (id === 'hockey') return '#f97316';
  if (id === 'soccer') return '#22c55e';
  if (id === 'american_football') return colors.blue;
  return '#e11d48';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.three,
    paddingBottom: spacing.five
  },
  title: {
    fontSize: 26,
    fontWeight: '800'
  },
  list: {
    gap: spacing.three / 2
  },
  card: {
    gap: spacing.two
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.two
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
    flexShrink: 1
  },
  sportName: {
    fontSize: 18
  },
  count: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  countText: {
    color: colors.textMuted
  },
  toggle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: spacing.one
  },
  groups: {
    gap: spacing.two
  },
  group: {
    gap: spacing.one
  },
  groupLabel: {
    letterSpacing: 0.8
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
    marginTop: spacing.one
  },
  note: {
    marginTop: spacing.three
  },
  noteText: {
    marginTop: spacing.one
  }
});
