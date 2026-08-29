import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/ArticleCard';
import { BrandHeader } from '@/components/BrandHeader';
import { AppText, Chip, Hero } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getArticles, type Article } from '@/lib/api';
import { SPORTS, sportLabel } from '@/lib/format';

type StatusTab = 'upcoming' | 'finished';

export default function ArticlesScreen() {
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>('upcoming');
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getArticles({ sport: selectedSport || undefined })
        .then(setArticles)
        .catch(() => setError('Impossible de charger les analyses.'));
    }, [selectedSport])
  );

  const visible = articles.filter((article) =>
    statusTab === 'finished' ? article.match_status === 'finished' : article.match_status !== 'finished'
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BrandHeader />

        <Hero compact>
          <AppText style={styles.title}>Analyses & pronostics</AppText>
          <AppText muted>Nos analyses détaillées sur les matchs choisis.</AppText>
        </Hero>

        <View style={styles.chipsRow}>
          <Chip active={statusTab === 'upcoming'} onPress={() => setStatusTab('upcoming')}>
            À venir
          </Chip>
          <Chip active={statusTab === 'finished'} onPress={() => setStatusTab('finished')}>
            Terminés
          </Chip>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sportScroller}
          contentContainerStyle={styles.chipsRow}
        >
          <Chip active={selectedSport === ''} onPress={() => setSelectedSport('')}>
            Tous
          </Chip>
          {SPORTS.map((sport) => (
            <Chip
              key={sport.id}
              active={selectedSport === sport.id}
              onPress={() => setSelectedSport(sport.id)}
            >
              {sport.label}
            </Chip>
          ))}
        </ScrollView>

        <View>
          {error ? (
            <AppText muted style={styles.empty}>
              {error}
            </AppText>
          ) : visible.length === 0 ? (
            <AppText muted style={styles.empty}>
              {statusTab === 'finished'
                ? 'Aucune analyse terminée'
                : 'Aucune analyse publiée'}
              {selectedSport ? ` en ${sportLabel(selectedSport)}` : ''} pour le moment.
            </AppText>
          ) : (
            visible.map((article) => <ArticleCard key={article.id} article={article} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
    marginBottom: spacing.three
  },
  sportScroller: {
    marginHorizontal: -spacing.three,
    flexGrow: 0
  },
  empty: {
    paddingVertical: spacing.three
  }
});