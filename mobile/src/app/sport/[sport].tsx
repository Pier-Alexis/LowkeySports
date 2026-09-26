import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { MatchCard } from '@/components/MatchCard';
import { AppText, Chip, Hero, Loader, ScreenSection } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getArticles, getMatches, type Article, type Match } from '@/lib/api';
import { flashscoreHub, leagueLabel, leaguesByRegion, sportIcon, sportLabel } from '@/lib/format';

export default function SportScreen() {
  const { sport = '', competition } = useLocalSearchParams<{ sport: string; competition?: string }>();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMatches({ sport, competition }),
      getArticles({ sport, competition })
    ])
      .then(([matchList, articleList]) => {
        setMatches(matchList);
        setArticles(articleList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport, competition]);

  const title = competition ? leagueLabel(sport, competition) : sportLabel(sport);
  const groups = leaguesByRegion(sport);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title }} />
      <Hero compact>
        <AppText style={styles.title}>
          {sportIcon(sport)} {title}
        </AppText>
        <AppText muted>Matchs à venir et analyses {competition ? title : sportLabel(sport)}.</AppText>
        <Pressable
          onPress={() => void Linking.openURL(flashscoreHub(sport))}
          accessibilityRole="link"
          accessibilityLabel="Ouvrir le calendrier FlashScore"
          hitSlop={8}
          style={({ pressed }) => [styles.flashscore, pressed && styles.pressed]}
        >
          <View style={styles.flashscoreMark} />
          <AppText small bold style={styles.flashscoreText}>
            Calendrier FlashScore ↗
          </AppText>
        </Pressable>
      </Hero>

      {groups.length > 0 && (
        <View style={styles.filter}>
          {groups.map((group) => (
            <View key={group.region} style={styles.filterGroup}>
              {groups.length > 1 && (
                <AppText small bold muted style={styles.filterLabel}>
                  {group.label}
                </AppText>
              )}
              <View style={styles.filterChips}>
                {group.leagues.map((league) => (
                  <Chip
                    key={league.id}
                    active={competition === league.id}
                    onPress={() =>
                      router.push({
                        pathname: `/sport/${sport}`,
                        params: { competition: competition === league.id ? undefined : league.id }
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

      <ScreenSection title="Matchs à venir">
        {loading ? (
          <Loader />
        ) : matches.length === 0 ? (
          <AppText muted style={styles.empty}>
            {competition
              ? `Aucun match à venir pour ${title}.`
              : 'Aucun match à venir dans cette catégorie.'}
          </AppText>
        ) : (
          <View style={styles.grid}>
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </View>
        )}
      </ScreenSection>

      <ScreenSection title="Analyses">
        {loading ? (
          <Loader />
        ) : articles.length === 0 ? (
          <AppText muted style={styles.empty}>
            {competition
              ? `Aucune analyse publiée pour ${title}.`
              : 'Aucune analyse publiée dans cette catégorie.'}
          </AppText>
        ) : (
          articles.map((article) => <ArticleCard key={article.id} article={article} />)
        )}
      </ScreenSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg
  },
  content: {
    padding: spacing.three,
    paddingBottom: spacing.five
  },
  title: {
    fontSize: 26,
    fontWeight: '800'
  },
  empty: {
    paddingVertical: spacing.three
  },
  filter: {
    gap: spacing.two,
    padding: spacing.three,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: spacing.two
  },
  filterGroup: {
    gap: spacing.one
  },
  filterLabel: {
    letterSpacing: 0.8
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two
  },
  flashscore: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.one,
    marginTop: spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  flashscoreMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold
  },
  flashscoreText: {
    color: colors.textMuted
  },
  pressed: {
    opacity: 0.7
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.three / 2
  }
});