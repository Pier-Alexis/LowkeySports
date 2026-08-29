import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/ArticleCard';
import { BrandHeader } from '@/components/BrandHeader';
import { MatchCard } from '@/components/MatchCard';
import { AppText, Card, GoldButton, Hero, OutlineButton, ScreenSection } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getArticles, getMatches, type Article, type Match } from '@/lib/api';
import { SPORTS } from '@/lib/format';

export default function HomeScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getMatches()
        .then(setMatches)
        .catch(() => {});
      getArticles()
        .then(setArticles)
        .catch(() => setError('Impossible de charger les données.'));
    }, [])
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BrandHeader />

        <Hero>
          <AppText style={styles.heroTitle}>
            Vos prédictions sportives,{' '}
            <AppText bold style={styles.heroHighlight}>
              sans parier.
            </AppText>
          </AppText>
          <AppText muted style={styles.heroSubtitle}>
            Découvrez les matchs des grandes ligues mondiales, nos analyses et nos pronostics sur le
            soccer, le football américain, le basketball, le tennis, le baseball et le hockey.
          </AppText>
          <View style={styles.heroActions}>
            <GoldButton onPress={() => router.push('/articles')} style={styles.heroBtn}>
              Voir les analyses
            </GoldButton>
            <OutlineButton onPress={() => router.push('/about')} style={styles.heroBtn}>
              À propos
            </OutlineButton>
          </View>
        </Hero>

        <ScreenSection title="Catégories">
          <View style={styles.grid}>
            {SPORTS.map((sport) => (
              <Card
                key={sport.id}
                onPress={() => router.push(`/sport/${sport.id}`)}
                style={[styles.categoryCard, { borderLeftColor: sportColor(sport.id) }]}
              >
                <AppText bold>{sport.label}</AppText>
                <AppText small muted>
                  Explorer →
                </AppText>
              </Card>
            ))}
          </View>
        </ScreenSection>

        <ScreenSection title="Matchs à venir">
          {matches.length === 0 ? (
            <AppText muted style={styles.empty}>
              Aucun match à venir pour le moment.
            </AppText>
          ) : (
            <View style={styles.grid}>
              {matches.slice(0, 8).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </View>
          )}
        </ScreenSection>

        <ScreenSection title="Dernières analyses">
          {error ? (
            <AppText muted style={styles.empty}>
              {error}
            </AppText>
          ) : articles.length === 0 ? (
            <AppText muted style={styles.empty}>
              Aucune analyse publiée pour le moment.
            </AppText>
          ) : (
            articles.slice(0, 4).map((article) => <ArticleCard key={article.id} article={article} />)
          )}
        </ScreenSection>
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
  heroTitle: {
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 32
  },
  heroHighlight: {
    color: colors.gold
  },
  heroSubtitle: {
    marginTop: spacing.two,
    lineHeight: 22
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
    marginTop: spacing.three
  },
  heroBtn: {
    flexGrow: 1
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.three / 2
  },
  categoryCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderLeftWidth: 5,
    gap: spacing.one
  },
  empty: {
    paddingVertical: spacing.three
  }
});