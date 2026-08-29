import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MatchPickerModal } from '@/components/MatchPickerModal';
import {
  AppText,
  Card,
  Chip,
  DangerButton,
  GoldButton,
  Loader,
  Message,
  PickBadge,
  StatusBadge,
  TextField
} from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { adminGetArticles, adminGetMatches, createArticle, deleteArticle } from '@/lib/admin';
import type { Match } from '@/lib/api';
import { formatScheduledAt, pickLabel, sportLabel } from '@/lib/format';

type ViewMode = 'editor' | 'list';

export default function AdminArticlesScreen() {
  const [view, setView] = useState<ViewMode>('editor');
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.seg}>
        <Chip active={view === 'editor'} onPress={() => setView('editor')}>
          Nouvelle analyse
        </Chip>
        <Chip active={view === 'list'} onPress={() => setView('list')}>
          Liste
        </Chip>
      </View>
      {view === 'editor' ? <ArticleEditor /> : <ArticleList />}
    </ScrollView>
  );
}

function ArticleEditor() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pick, setPick] = useState('home');
  const [status, setStatus] = useState('draft');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      adminGetMatches()
        .then(setMatches)
        .catch(() => {});
    }, [])
  );

  async function handleCreate() {
    if (!match || !title.trim() || !content.trim()) {
      setError('Choisis un match et remplis le titre et le contenu.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await createArticle({
        matchId: match.id,
        title: title.trim(),
        content: content.trim(),
        pick,
        status
      });
      setSuccess(`Analyse créée (${title.trim()}).`);
      setTitle('');
      setContent('');
      setMatch(null);
      setPick('home');
      setStatus('draft');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.editor}>
      <Pressable onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.matchField, pressed && { opacity: 0.8 }]}>
        <AppText small muted>Match</AppText>
        <AppText bold>
          {match ? `${match.home_team} vs ${match.away_team}` : 'Choisir un match…'}
        </AppText>
      </Pressable>
      <TextField label="Titre" value={title} onChangeText={setTitle} />
      <TextField label="Contenu" value={content} onChangeText={setContent} multiline />

      <AppText bold style={styles.groupTitle}>Pronostic</AppText>
      <View style={styles.row}>
        <Chip active={pick === 'home'} onPress={() => setPick('home')}>Victoire domicile</Chip>
        <Chip active={pick === 'draw'} onPress={() => setPick('draw')}>Nul</Chip>
        <Chip active={pick === 'away'} onPress={() => setPick('away')}>Victoire extérieur</Chip>
      </View>

      <AppText bold style={styles.groupTitle}>Statut</AppText>
      <View style={styles.row}>
        <Chip active={status === 'draft'} onPress={() => setStatus('draft')}>Brouillon</Chip>
        <Chip active={status === 'published'} onPress={() => setStatus('published')}>Publié</Chip>
      </View>

      <GoldButton onPress={handleCreate} busy={busy}>
        Créer l'analyse
      </GoldButton>
      {error && <Message kind="error">{error}</Message>}
      {success && <Message kind="success">{success}</Message>}

      <MatchPickerModal matches={matches} open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setMatch} />
    </View>
  );
}

function ArticleList() {
  const [articles, setArticles] = useState<Awaited<ReturnType<typeof adminGetArticles>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminGetArticles()
      .then(setArticles)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleDelete(articleId: number, title: string) {
    Alert.alert('Supprimer l’analyse', `Confirmer la suppression de « ${title} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteArticle(articleId);
            load();
          } catch (err) {
            Alert.alert('Erreur', err instanceof Error ? err.message : 'Suppression impossible');
          }
        }
      }
    ]);
  }

  if (!articles) {
    if (error) return <Message kind="error">{error}</Message>;
    return <Loader />;
  }

  return (
    <View style={styles.list}>
      {articles.length === 0 ? (
        <AppText muted style={styles.empty}>Aucune analyse pour le moment.</AppText>
      ) : (
        articles.map((article) => (
          <Card key={article.id} style={styles.item}>
            <AppText bold>{article.title}</AppText>
            <AppText small muted>
              {sportLabel(article.sport)} · {article.home_team} vs {article.away_team} ·{' '}
              {formatScheduledAt(article.scheduled_at)}
            </AppText>
            <View style={styles.row}>
              <PickBadge pick={article.pick}>
                <AppText small bold style={{ color: pickColor(article.pick) }}>
                  {pickLabel(article.pick, { home_team: article.home_team, away_team: article.away_team })}
                </AppText>
              </PickBadge>
              <StatusBadge tone={article.status}>
                <AppText small bold style={{ color: toneColor(article.status) }}>
                  {article.status === 'published' ? 'Publié' : 'Brouillon'}
                </AppText>
              </StatusBadge>
            </View>
            <DangerButton onPress={() => handleDelete(article.id, article.title)}>
              Supprimer
            </DangerButton>
          </Card>
        ))
      )}
    </View>
  );
}

function pickColor(pick: string): string {
  return pick === 'home' ? '#7ea2ff' : pick === 'away' ? colors.purpleLight : colors.gold;
}

function toneColor(status: string): string {
  return status === 'published' ? colors.successLight : colors.textMuted;
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
  seg: {
    flexDirection: 'row',
    gap: spacing.two,
    marginBottom: spacing.three
  },
  editor: {
    gap: spacing.one
  },
  matchField: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.three,
    paddingVertical: 12,
    marginBottom: spacing.two,
    gap: spacing.one
  },
  groupTitle: {
    marginTop: spacing.two
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two
  },
  list: {
    gap: spacing.two
  },
  item: {
    gap: spacing.two
  },
  empty: {
    paddingVertical: spacing.three
  }
});