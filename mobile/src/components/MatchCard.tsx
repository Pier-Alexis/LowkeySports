import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import type { Match } from "@/lib/api";
import { flashscoreUrlFor, formatScheduledAt, sportLabel } from "@/lib/format";
import { AppText, Card } from "@/components/ui";
import { TeamLogo } from "@/components/TeamLogo";
import { colors, spacing } from "@/constants/theme";

export function MatchCard({ match }: { match: Match }) {
    const hasScore = match.status !== "scheduled";
    return (
        <Card style={styles.card}>
            <Link href={`/match/${match.id}`} asChild>
                <View style={styles.inner}>
                    <View style={styles.header}>
                        <AppText small bold style={styles.competition}>
                            {match.competition ?? sportLabel(match.sport)}
                        </AppText>
                        <AppText small muted>
                            {formatScheduledAt(match.scheduled_at)}
                        </AppText>
                    </View>
                    <View style={styles.teams}>
                        <View style={styles.team}>
                            <TeamLogo name={match.home_team} logo={match.home_team_logo} />
                            <AppText small numberOfLines={1} style={styles.teamName}>
                                {match.home_team}
                            </AppText>
                        </View>
                        <AppText bold style={styles.vs}>
                            {hasScore ? `${match.home_score ?? "-"} – ${match.away_score ?? "-"}` : "vs"}
                        </AppText>
                        <View style={styles.team}>
                            <TeamLogo name={match.away_team} logo={match.away_team_logo} />
                            <AppText small numberOfLines={1} style={styles.teamName}>
                                {match.away_team}
                            </AppText>
                        </View>
                    </View>
                </View>
            </Link>
            <Pressable
                onPress={() => void Linking.openURL(flashscoreUrlFor(match))}
                accessibilityRole="link"
                accessibilityLabel="Ouvrir ce match sur FlashScore"
                hitSlop={8}
                style={({ pressed }) => [styles.flashscore, pressed && styles.pressed]}
            >
                <View style={styles.flashscoreMark} />
                <AppText small bold style={styles.flashscoreText}>
                    Fiche FlashScore
                </AppText>
            </Pressable>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: spacing.three,
        gap: spacing.two
    },
    inner: {
        gap: 12
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8
    },
    competition: {
        color: colors.gold,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        flexShrink: 1
    },
    teams: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8
    },
    team: {
        flex: 1,
        alignItems: "center",
        gap: 8,
        minWidth: 0
    },
    teamName: {
        textAlign: "center"
    },
    vs: {
        color: colors.textMuted
    },
    flashscore: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "rgba(255, 255, 255, 0.05)"
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
    }
});
