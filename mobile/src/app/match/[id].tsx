import { Link, Stack, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TeamLogo } from '@/components/TeamLogo';
import { AppText, Card, PickBadge, ScreenSection } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getArticlesByMatch, getMatch, type Article, type Match } from '@/lib/api';
import { confidenceMeta, flashscoreUrlFor, formatScheduledAt, pickLabel, pointsLabel } from '@/lib/format';

const PICK_TEXT: Record<string, string> = {
  home: '#7ea2ff',
  away: colors.purpleLight,
  draw: colors.gold
};

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMatch(id)
      .then(async (fetched) => {
        setMatch(fetched);
        try {
          setArticles(await getArticlesByMatch(fetched.id));
        } catch {
          // aucun article lié
        }
      })
      .catch(() => setError('Match introuvable.'));
  }, [id]);

  if (error) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: 'Match' }} />
        <AppText muted>{error}</AppText>
      </ScrollView>
    );
  }

  if (!match) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: 'Match' }} />
        <AppText muted>Chargement…</AppText>
      </ScrollView>
    );
  }

  const score = match.status !== 'scheduled';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Match' }} />
      <Card style={styles.detail}>
        <View style={styles.detailHead}>
          <AppText small bold style={styles.competition}>
            {match.competition ?? match.sport}
          </AppText>
          <AppText small muted>
            {formatScheduledAt(match.scheduled_at)}
          </AppText>
        </View>
        <View style={styles.teams}>
          <View style={styles.team}>
            <TeamLogo name={match.home_team} logo={match.home_team_logo} size={80} />
            <AppText bold style={styles.teamName}>
              {match.home_team}
            </AppText>
          </View>
          <AppText bold style={styles.vs}>
            {score ? `${match.home_score ?? '-'} – ${match.away_score ?? '-'}` : 'vs'}
          </AppText>
          <View style={styles.team}>
            <TeamLogo name={match.away_team} logo={match.away_team_logo} size={80} />
            <AppText bold style={styles.teamName}>
              {match.away_team}
            </AppText>
          </View>
        </View>
        <Pressable
          onPress={() => void Linking.openURL(flashscoreUrlFor(match))}
          accessibilityRole="link"
          accessibilityLabel="Ouvrir ce match sur FlashScore"
          hitSlop={8}
          style={({ pressed }) => [styles.flashscore, pressed && styles.pressed]}
        >
          <View style={styles.flashscoreMark} />
          <AppText small bold style={styles.flashscoreText}>
            Fiche FlashScore ↗
          </AppText>
        </Pressable>
      </Card>

      <ScreenSection title="Nos analyses">
        {articles.length === 0 ? (
          <AppText muted style={styles.empty}>
            Aucune analyse publiée pour ce match pour le moment.
          </AppText>
        ) : (
          articles.map((article) => (
            <Card key={article.id} style={styles.article}>
              <Link href={`/article/${article.id}`}>
                <AppText bold style={styles.articleTitle}>
                  {article.title}
                </AppText>
              </Link>
              <PickBadge pick={article.pick}>
                <AppText small bold style={{ color: PICK_TEXT[article.pick] }}>
                  Pronostic :{' '}
                  {pickLabel(article.pick, {
                    home_team: article.home_team,
                    away_team: article.away_team
                  })}
                </AppText>
              </PickBadge>
              {article.confidence != null && (
                <AppText small muted>
                  Confiance {article.confidence}/5 · {confidenceMeta(article.confidence).label} (
                  {pointsLabel(confidenceMeta(article.confidence).points)} pt)
                </AppText>
              )}
              <AppText style={styles.articleText}>{article.content}</AppText>
            </Card>
          ))
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
  detail: {
    gap: spacing.three
  },
  detailHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  competition: {
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.two
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.two
  },
  teamName: {
    textAlign: 'center'
  },
  vs: {
    color: colors.textMuted,
    paddingTop: spacing.five
  },
  flashscore: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.one,
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
  article: {
    gap: spacing.two,
    marginBottom: spacing.two
  },
  articleTitle: {
    fontSize: 17
  },
  articleText: {
    lineHeight: 22
  },
  empty: {
    paddingVertical: spacing.three
  }
});