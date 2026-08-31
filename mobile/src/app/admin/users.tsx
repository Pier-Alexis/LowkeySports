import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';

import { adminGetUsers, adminSetUserRole, changeUsername, type AdminUser } from '@/lib/admin';
import { AppText, Card, Chip, GoldButton, Loader, Message, OutlineButton, StatusBadge, TextField } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { matchesSearch } from '@/lib/search';

const ROLE_LABELS: Record<string, string> = {
  user: 'Membre',
  expert: 'Expert',
  admin: 'Admin'
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    adminGetUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visibleUsers = useMemo(
    () => (users ?? []).filter((user) => matchesSearch(search, user.username)),
    [users, search]
  );

  if (!users) {
    if (error) return <Message kind="error">{error}</Message>;
    return <Loader />;
  }

  return (
    <View style={styles.content}>
      <TextField
        label="Rechercher"
        value={search}
        onChangeText={setSearch}
        placeholder="Nom d'utilisateur…"
        autoCapitalize="none"
      />
      {users.length === 0 ? (
        <AppText muted>Aucun utilisateur.</AppText>
      ) : visibleUsers.length === 0 ? (
        <AppText muted>Aucun utilisateur ne correspond à « {search} ».</AppText>
      ) : (
        visibleUsers.map((user) => <UserRow key={user.id} user={user} onChanged={load} />)
      )}
    </View>
  );
}

function UserRow({ user, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [busyRole, setBusyRole] = useState(false);

  async function handleRole(role: 'user' | 'expert' | 'admin') {
    if (role === user.role) return;
    setBusyRole(true);
    try {
      await adminSetUserRole(user.id, role);
      onChanged();
    } catch (err) {
      Alert.alert('Impossible de changer le rôle', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusyRole(false);
    }
  }

  return (
    <Card style={styles.item}>
      <View style={styles.head}>
        <AppText bold style={user.role === 'expert' ? { color: colors.expert } : undefined}>
          {user.username}
        </AppText>
        <StatusBadge tone={user.role}>
          <AppText
            small
            bold
            style={{
              color:
                user.role === 'admin'
                  ? colors.successLight
                  : user.role === 'expert'
                  ? colors.expert
                  : colors.textMuted
            }}
          >
            {ROLE_LABELS[user.role] ?? user.role}
          </AppText>
        </StatusBadge>
      </View>
      <AppText small muted>{user.email} · inscrit le {formatDate(user.created_at)}</AppText>
      <View style={styles.row}>
        {(['user', 'expert', 'admin'] as const).map((role) =>
          role === user.role ? null : (
            <OutlineButton key={role} onPress={() => void handleRole(role)} busy={busyRole}>
              {ROLE_LABELS[role]}
            </OutlineButton>
          )
        )}
        <OutlineButton onPress={() => setRenaming(true)}>Renommer</OutlineButton>
      </View>

      <RenameModal
        user={user}
        visible={renaming}
        onClose={() => setRenaming(false)}
        onRenamed={() => {
          setRenaming(false);
          onChanged();
        }}
      />
    </Card>
  );
}

function RenameModal({
  user,
  visible,
  onClose,
  onRenamed
}: {
  user: AdminUser;
  visible: boolean;
  onClose: () => void;
  onRenamed: () => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(user.username);
      setError(null);
    }
  }, [visible, user]);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await changeUsername(user.id, name.trim());
      onRenamed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <AppText bold style={styles.modalTitle}>Renommer {user.username}</AppText>
          <TextField label="Nom d'utilisateur" value={name} onChangeText={setName} autoCapitalize="none" />
          <GoldButton onPress={submit} busy={busy}>Enregistrer</GoldButton>
          {error && <Message kind="error">{error}</Message>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.three,
    gap: spacing.two
  },
  item: {
    gap: spacing.two
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: spacing.four
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.three
  },
  modalTitle: {
    marginBottom: spacing.two
  }
});