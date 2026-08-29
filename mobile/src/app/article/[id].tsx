import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TeamLogo } from '@/components/TeamLogo';
import { AppText, PickBadge } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getArticle, type Article } from '@/lib/api';
import { formatDate, pickLabel, sportLabel } from '@/lib/format';

const PICK_TEXT: Record<string, string> = {
  home: '#7ea2ff',
  away: colors.purpleLight,
  draw: colors.gold
};

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArticle(id)
      .then(setArticle)
      .catch(() => setError('Analyse introuvable.'));
  }, [id]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Analyse' }} />
      {error ? (
        <AppText muted>{error}</AppText>
      ) : !article ? (
        <AppText muted>Chargement…</AppText>
      ) : (
        <>
          <View style={styles.teams}>
            <View style={styles.team}>
              <TeamLogo name={article.home_team} logo={article.home_team_logo} size={44} />
              <AppText bold style={styles.teamName}>
                {article.home_team}
              </AppText>
            </View>
            <AppText bold style={styles.cat}>
              vs
            </AppText>
            <View style={styles.team}>
              <TeamLogo name={article.away_team} logo={article.away_team_logo} size={44} />
              <AppText bold style={styles.teamName}>
                {article.away_team}
              </AppText>
            </View>
          </View>

          <AppText small muted style={styles.meta}>
            {sportLabel(article.sport)}
            {article.competition ? ` · ${article.competition}` : ''} ·{' '}
            {article.author
              ? `Par ${article.author}`
              : formatDate(article.created_at ?? article.scheduled_at)}
          </AppText>

          <AppText style={styles.title}>{article.title}</AppText>

          <PickBadge pick={article.pick}>
            <AppText small bold style={{ color: PICK_TEXT[article.pick] }}>
              Pronostic :{' '}
              {pickLabel(article.pick, { home_team: article.home_team, away_team: article.away_team })}
            </AppText>
          </PickBadge>

          {article.match_status === 'finished' && (
            <AppText small bold style={styles.result}>
              Terminé {article.home_score ?? '-'} – {article.away_score ?? '-'}
            </AppText>
          )}

          <AppText style={styles.articleText}>{article.content}</AppText>
        </>
      )}
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
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.three
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.one
  },
  teamName: {
    textAlign: 'center'
  },
  cat: {
    color: colors.textMuted
  },
  meta: {
    marginTop: spacing.three,
    color: colors.gold
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: spacing.two,
    marginBottom: spacing.two
  },
  result: {
    marginTop: spacing.two,
    color: colors.successLight
  },
  articleText: {
    marginTop: spacing.three,
    lineHeight: 24,
    fontSize: 16
  }
});