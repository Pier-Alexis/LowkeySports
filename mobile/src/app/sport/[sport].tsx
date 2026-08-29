import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { MatchCard } from '@/components/MatchCard';
import { AppText, Hero, Loader, ScreenSection } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getArticles, getMatches, type Article, type Match } from '@/lib/api';
import { leagueLabel, sportLabel } from '@/lib/format';

export default function SportScreen() {
  const { sport = '', competition } = useLocalSearchParams<{ sport: string; competition?: string }>();
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title }} />
      <Hero compact>
        <AppText style={styles.title}>{title}</AppText>
        <AppText muted>Matchs à venir et analyses {competition ? title : sportLabel(sport)}.</AppText>
      </Hero>

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.three / 2
  }
});