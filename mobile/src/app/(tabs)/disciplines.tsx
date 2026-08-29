import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { AppText, Card, Chip, Hero } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { leaguesBySport, SPORTS } from '@/lib/format';

export default function DisciplinesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BrandHeader />

        <Hero compact>
          <AppText style={styles.title}>Par discipline</AppText>
          <AppText muted>
            Choisis un sport pour voir ses matchs, ou clique sur une ligue pour affiner ta
            recherche.
          </AppText>
        </Hero>

        <View style={styles.list}>
          {SPORTS.map((sport) => {
            const leagues = leaguesBySport(sport.id);
            return (
              <Card key={sport.id} style={[styles.card, { borderLeftWidth: 5, borderLeftColor: sportColor(sport.id) }]}>
                <View style={styles.cardTop}>
                  <AppText bold style={styles.sportName}>
                    {sport.label}
                  </AppText>
                  <Chip onPress={() => router.push(`/sport/${sport.id}`)}>Explorer →</Chip>
                </View>
                {leagues.length > 0 && (
                  <View style={styles.chips}>
                    {leagues.map((league) => (
                      <Chip
                        key={league.id}
                        onPress={() =>
                          router.push({
                            pathname: `/sport/${sport.id}`,
                            params: { competition: league.id }
                          })
                        }
                      >
                        {league.label}
                      </Chip>
                    ))}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
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
    alignItems: 'center'
  },
  sportName: {
    fontSize: 18
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
    marginTop: spacing.one
  }
});