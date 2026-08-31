import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import {
  AppText,
  Card,
  DangerButton,
  GoldButton,
  Hero,
  Message,
  OutlineButton,
  TextField
} from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useSession } from '@/hooks/useSession';
import {
  changePassword,
  isAdmin,
  login,
  logout,
  register,
  setStoredUsername,
  type StoredUser
} from '@/lib/auth';
import { changeUsername as apiChangeUsername } from '@/lib/admin';

type Mode = 'login' | 'register';

export default function AccountScreen() {
  const user = useSession();
  const admin = isAdmin() || user?.role === 'expert';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandHeader />
          {user ? <ProfileView user={user} admin={admin} /> : <AuthView />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthView() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const user =
        mode === 'login' ? await login(email, password) : await register({ username, email, password });
      setSuccess(`Bienvenue, ${user.username} !`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Hero compact>
        <AppText style={styles.title}>Connexion</AppText>
        <AppText muted>Créez un compte ou connectez-vous pour accéder à toutes les fonctionnalités.</AppText>
      </Hero>

      <Card style={styles.card}>
        <View style={styles.modeRow}>
          <OutlineButton onPress={() => { setMode('login'); setError(null); setSuccess(null); }} style={[styles.modeBtn, mode === 'login' && styles.modeActive]}>
            Se connecter
          </OutlineButton>
          <OutlineButton onPress={() => { setMode('register'); setError(null); setSuccess(null); }} style={[styles.modeBtn, mode === 'register' && styles.modeActive]}>
            Créer un compte
          </OutlineButton>
        </View>

        {mode === 'register' && (
          <TextField label="Nom d'utilisateur" value={username} onChangeText={setUsername} autoCapitalize="none" />
        )}
        <TextField label="Adresse courriel" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />

        <GoldButton onPress={handleSubmit} busy={busy}>
          {mode === 'login' ? 'Se connecter' : "Créer le compte"}
        </GoldButton>
        {error && <Message kind="error">{error}</Message>}
        {success && <Message kind="success">{success}</Message>}
      </Card>
    </>
  );
}

function ProfileView({ user, admin }: { user: StoredUser; admin: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busyU, setBusyU] = useState(false);
  const [busyP, setBusyP] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUsername() {
    const uid = user?.id;
    if (!uid || !username.trim()) return;
    setBusyU(true);
    setError(null);
    setSuccess(null);
    try {
      await apiChangeUsername(uid, username.trim());
      setStoredUsername(username.trim());
      setUsername('');
      setSuccess("Nom d'utilisateur mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusyU(false);
    }
  }

  async function handlePassword() {
    setBusyP(true);
    setError(null);
    setSuccess(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Mot de passe modifié avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusyP(false);
    }
  }

  return (
    <>
      <Hero compact>
        <AppText style={styles.title}>Bonjour, {user?.username} !</AppText>
        <AppText muted>Gérez votre compte ici.</AppText>
      </Hero>

      <Card style={styles.card}>
        <AppText bold>Mon compte</AppText>
        {admin && (
          <GoldButton onPress={() => router.push('/admin')} style={{ marginTop: spacing.two }}>
            Panneau d'administration
          </GoldButton>
        )}
        <DangerButton onPress={() => void logout()} style={{ marginTop: spacing.two }}>
          Se déconnecter
        </DangerButton>
      </Card>

      <Card style={styles.card}>
        <AppText bold>Changer le nom d'utilisateur</AppText>
        <TextField label="Nouveau nom" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <GoldButton onPress={handleUsername} busy={busyU}>
          Mettre à jour
        </GoldButton>
      </Card>

      <Card style={styles.card}>
        <AppText bold>Changer le mot de passe</AppText>
        <TextField label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <TextField label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <GoldButton onPress={handlePassword} busy={busyP}>
          Changer le mot de passe
        </GoldButton>
        {error && <Message kind="error">{error}</Message>}
        {success && <Message kind="success">{success}</Message>}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  flex: {
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
  card: {
    gap: spacing.two,
    marginBottom: spacing.three
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.two,
    marginBottom: spacing.two
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10
  },
  modeActive: {
    borderColor: colors.gold
  }
});