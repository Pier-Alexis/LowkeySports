import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  GoldButton,
  Loader,
  Message,
  OutlineButton,
  ScreenSection
} from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { adminGetArticles, adminGetMatches, syncMatches, syncResults } from '@/lib/admin';
import { useSession } from '@/hooks/useSession';

export default function AdminDashboardScreen() {
  const user = useSession();
  const admin = user?.role === 'admin';
  const router = useRouter();

  const [matchCount, setMatchCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyMatches, setBusyMatches] = useState(false);
  const [busyResults, setBusyResults] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncerror, setSyncError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!admin) return;
      setLoading(true);
      Promise.all([adminGetMatches(), adminGetArticles()])
        .then(([matches, articles]) => {
          setMatchCount(matches.length);
          setUpcomingCount(matches.filter((m) => m.status === 'scheduled').length);
          setArticleCount(articles.length);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
        .finally(() => setLoading(false));
    }, [admin])
  );

  if (!admin) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AppText muted>Accès réservé aux administrateurs.</AppText>
        <GoldButton onPress={() => router.replace('/account')} style={{ marginTop: spacing.three }}>
          Retour au compte
        </GoldButton>
      </ScrollView>
    );
  }

  async function handleSyncMatches() {
    setBusyMatches(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const totals = await syncMatches();
      setSyncMessage(
        `${totals.imported} importés, ${totals.updated} mis à jour, ${totals.skipped} ignorés.`
      );
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erreur de synchronisation');
    } finally {
      setBusyMatches(false);
    }
  }

  async function handleSyncResults() {
    setBusyResults(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const totals = await syncResults();
      setSyncMessage(
        `${totals.finished} matchs terminés, ${totals.updated} résultats mis à jour, ${totals.skipped} ignorés.`
      );
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erreur de synchronisation');
    } finally {
      setBusyResults(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <ScreenSection title="Vue d'ensemble">
        {loading ? (
          <Loader text="Chargement des statistiques…" />
        ) : error ? (
          <Message kind="error">{error}</Message>
        ) : (
          <View style={styles.stats}>
            <Card style={styles.stat}>
              <AppText muted small>Matchs</AppText>
              <AppText bold style={styles.statValue}>{matchCount}</AppText>
            </Card>
            <Card style={styles.stat}>
              <AppText muted small>À venir</AppText>
              <AppText bold style={styles.statValue}>{upcomingCount}</AppText>
            </Card>
            <Card style={styles.stat}>
              <AppText muted small>Analyses</AppText>
              <AppText bold style={styles.statValue}>{articleCount}</AppText>
            </Card>
          </View>
        )}
      </ScreenSection>

      <ScreenSection title="Synchronisation">
        <View style={styles.actions}>
          <GoldButton onPress={handleSyncMatches} busy={busyMatches}>
            Synchroniser les matchs
          </GoldButton>
          <OutlineButton onPress={handleSyncResults} busy={busyResults}>
            Vérifier les résultats
          </OutlineButton>
        </View>
        {syncMessage && <Message kind="success">{syncMessage}</Message>}
        {syncerror && <Message kind="error">{syncerror}</Message>}
      </ScreenSection>

      <ScreenSection title="Contenu">
        <View style={styles.actions}>
          <GoldButton onPress={() => router.push('/admin/articles')}>
            Gérer les analyses
          </GoldButton>
          <OutlineButton onPress={() => router.push('/admin/users')}>
            Gérer les utilisateurs
          </OutlineButton>
        </View>
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
  stats: {
    flexDirection: 'row',
    gap: spacing.two
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.one
  },
  statValue: {
    fontSize: 22,
    color: colors.gold
  },
  actions: {
    gap: spacing.two
  }
});