import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { TeamLogo } from '@/components/TeamLogo';
import { AppText, PickBadge } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import {
  addComment,
  deleteComment,
  getArticle,
  getComments,
  reactToArticle,
  type Article,
  type ArticleComment
} from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { formatDate, pickLabel, sportLabel } from '@/lib/format';

const PICK_TEXT: Record<string, string> = {
  home: '#7ea2ff',
  away: colors.purpleLight,
  draw: colors.gold
};

function AuthorName({ name, role }: { name: string; role: string }) {
  return (
    <AppText small bold style={role === 'expert' ? { color: colors.expert } : undefined}>
      {name}
    </AppText>
  );
}

function Reactions({ article, onChange }: { article: Article; onChange: (article: Article) => void }) {
  const [busy, setBusy] = useState(false);

  async function handleReact(type: 'like' | 'dislike') {
    if (!getStoredUser()) {
      Alert.alert('Connexion requise', 'Connecte-toi pour réagir à une analyse.');
      return;
    }
    setBusy(true);
    try {
      const result = await reactToArticle(article.id, type);
      onChange({
        ...article,
        like_count: result.like_count,
        dislike_count: result.dislike_count,
        viewer_reaction: result.viewer_reaction
      });
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Réaction impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.reactions}>
      <Pressable
        disabled={busy}
        onPress={() => void handleReact('like')}
        style={[styles.reactionBtn, article.viewer_reaction === 'like' && styles.reactionBtnActive]}
      >
        <AppText bold>👍 {article.like_count}</AppText>
      </Pressable>
      <Pressable
        disabled={busy}
        onPress={() => void handleReact('dislike')}
        style={[styles.reactionBtn, article.viewer_reaction === 'dislike' && styles.reactionBtnActive]}
      >
        <AppText bold>👎 {article.dislike_count}</AppText>
      </Pressable>
    </View>
  );
}

function Comments({ articleId }: { articleId: number }) {
  const currentUser = getStoredUser();
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  function reload() {
    getComments(articleId)
      .then(setComments)
      .catch(() => {});
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await addComment(articleId, trimmed);
      setContent('');
      reload();
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Commentaire impossible à publier');
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(commentId: number) {
    Alert.alert('Supprimer ce commentaire ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteComment(articleId, commentId)
            .then(reload)
            .catch((err) => Alert.alert('Erreur', err instanceof Error ? err.message : 'Suppression impossible'));
        }
      }
    ]);
  }

  return (
    <View style={styles.comments}>
      <AppText bold style={styles.commentsTitle}>
        Commentaires ({comments.length})
      </AppText>

      {currentUser ? (
        <View style={styles.commentForm}>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Écris un commentaire…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            style={styles.commentInput}
          />
          <Pressable
            disabled={busy || !content.trim()}
            onPress={() => void handleSubmit()}
            style={[styles.submitBtn, (busy || !content.trim()) && styles.submitBtnDisabled]}
          >
            <AppText bold style={{ color: colors.bg }}>
              {busy ? 'Publication…' : 'Publier'}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <AppText muted>Connecte-toi pour commenter.</AppText>
      )}

      {comments.length === 0 && <AppText muted>Aucun commentaire pour le moment.</AppText>}
      {comments.map((comment) => {
        const canDelete = currentUser && (currentUser.id === comment.user_id || currentUser.role === 'admin');
        return (
          <View key={comment.id} style={styles.commentItem}>
            <View style={styles.commentHead}>
              <AuthorName name={comment.author} role={comment.author_role} />
              <AppText small muted>{formatDate(comment.created_at)}</AppText>
            </View>
            <AppText style={styles.commentContent}>{comment.content}</AppText>
            {canDelete && (
              <Pressable onPress={() => handleDelete(comment.id)}>
                <AppText small style={{ color: colors.dangerLight, marginTop: spacing.one }}>
                  Supprimer
                </AppText>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

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
            {article.competition ? ` · ${article.competition}` : ''}
          </AppText>
          {article.author && (
            <AppText small muted>
              Par <AuthorName name={article.author} role={article.author_role} />
            </AppText>
          )}

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

          <Reactions article={article} onChange={setArticle} />
          <Comments articleId={article.id} />
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
  },
  reactions: {
    flexDirection: 'row',
    gap: spacing.two,
    marginTop: spacing.three
  },
  reactionBtn: {
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  reactionBtnActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(230, 181, 49, 0.12)'
  },
  comments: {
    marginTop: spacing.four,
    gap: spacing.two
  },
  commentsTitle: {
    fontSize: 18,
    marginBottom: spacing.one
  },
  commentForm: {
    gap: spacing.two
  },
  commentInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.two,
    color: colors.text,
    textAlignVertical: 'top'
  },
  submitBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
    borderRadius: radii.pill
  },
  submitBtnDisabled: {
    opacity: 0.5
  },
  commentItem: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.two,
    marginTop: spacing.two
  },
  commentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  commentContent: {
    marginTop: spacing.one
  }
});