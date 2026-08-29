import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Match } from "@/lib/api";
import { SPORTS, sportLabel } from "@/lib/format";
import { AppText, Chip } from "@/components/ui";
import { colors, radii, spacing } from "@/constants/theme";

interface MatchPickerModalProps {
    matches: Match[];
    open: boolean;
    onClose: () => void;
    onSelect: (match: Match) => void;
}

function matchLabel(match: Match): string {
    return `${match.home_team} vs ${match.away_team}`;
}

export function MatchPickerModal({ matches, open, onClose, onSelect }: MatchPickerModalProps) {
    const [sport, setSport] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (open) {
            setSport(null);
            setQuery("");
        }
    }, [open]);

    const sportMatches = useMemo(() => {
        if (!sport) return [];
        const now = Date.now();
        return matches
            .filter(
                (m) =>
                    m.sport === sport &&
                    m.status === "scheduled" &&
                    new Date(m.scheduled_at).getTime() > now
            )
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    }, [sport, matches]);

    const { error, list } = useMemo(() => {
        if (!sport) return { error: null, list: [] as Match[] };
        let regex: RegExp;
        try {
            regex = new RegExp(query, "i");
        } catch {
            return { error: "Regex invalide", list: [] as Match[] };
        }
        return { error: null, list: sportMatches.filter((m) => regex.test(matchLabel(m))) };
    }, [sport, sportMatches, query]);

    return (
        <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={() => {}}>
                    <View style={styles.header}>
                        <AppText bold style={styles.title}>
                            {sport ? `${sportLabel(sport)} · Choisir un match` : "Choisir un sport"}
                        </AppText>
                        <Pressable onPress={onClose} hitSlop={12}>
                            <Text style={styles.close}>×</Text>
                        </Pressable>
                    </View>

                    {!sport ? (
                        <View style={styles.chips}>
                            {SPORTS.map((s) => (
                                <Chip key={s.id} onPress={() => setSport(s.id)}>
                                    {s.label}
                                </Chip>
                            ))}
                        </View>
                    ) : (
                        <>
                            <View style={styles.row}>
                                <Chip onPress={() => setSport(null)}>← Changer de sport</Chip>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder='Recherche (ex: "PSG vs.*MAR")'
                                placeholderTextColor={colors.textMuted}
                                value={query}
                                onChangeText={setQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {error && <AppText style={styles.error}>{error}</AppText>}
                            <View style={styles.list}>
                                {list.length === 0 ? (
                                    <AppText muted style={styles.emptyText}>
                                        {query
                                            ? "Aucun match ne correspond à la recherche."
                                            : "Saisis une recherche pour filtrer les matchs."}
                                    </AppText>
                                ) : (
                                    list.map((match) => (
                                        <Pressable
                                            key={match.id}
                                            style={({ pressed }) => [
                                                styles.matchItem,
                                                pressed && styles.matchItemPressed
                                            ]}
                                            onPress={() => {
                                                onSelect(match);
                                                onClose();
                                            }}
                                        >
                                            <AppText bold numberOfLines={1}>
                                                {matchLabel(match)}
                                            </AppText>
                                            <AppText small muted>
                                                {match.competition ?? "Sans compétition"}
                                            </AppText>
                                        </Pressable>
                                    ))
                                )}
                            </View>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        padding: spacing.four
    },
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        padding: spacing.three,
        maxHeight: "80%"
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.three
    },
    title: {
        fontSize: 16
    },
    close: {
        color: colors.textMuted,
        fontSize: 28,
        lineHeight: 28
    },
    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.two
    },
    row: {
        marginBottom: spacing.two
    },
    input: {
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.three,
        paddingVertical: 10,
        color: colors.text,
        fontSize: 14
    },
    error: {
        color: "#ff7a7a",
        marginTop: spacing.one
    },
    list: {
        marginTop: spacing.two
    },
    emptyText: {
        paddingVertical: spacing.three
    },
    matchItem: {
        paddingVertical: spacing.two,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        gap: 2
    },
    matchItemPressed: {
        opacity: 0.7
    }
});