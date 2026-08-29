import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Article } from "@/lib/api";
import { formatDate, pickLabel, sportLabel } from "@/lib/format";
import { AppText, Card, PickBadge } from "@/components/ui";
import { TeamLogo } from "@/components/TeamLogo";
import { colors, spacing } from "@/constants/theme";

const PICK_TEXT: Record<string, string> = {
    home: "#7ea2ff",
    away: colors.purpleLight,
    draw: colors.gold
};

export function ArticleCard({ article }: { article: Article }) {
    const won = article.match_status === "finished" && article.pick === article.winner;
    return (
        <Card style={styles.card}>
            <Link href={`/article/${article.id}`} asChild>
                <View style={styles.inner}>
                    <View style={styles.top}>
                        <AppText small bold style={styles.competition}>
                            {sportLabel(article.sport)}
                        </AppText>
                        {article.published_at && (
                            <AppText small muted>
                                {formatDate(article.published_at)}
                            </AppText>
                        )}
                    </View>
                    <View style={styles.teams}>
                        <TeamLogo name={article.home_team} logo={article.home_team_logo} size={32} />
                        <AppText small style={styles.teamsText}>
                            {article.home_team} – {article.away_team}
                        </AppText>
                        <TeamLogo name={article.away_team} logo={article.away_team_logo} size={32} />
                    </View>
                    <AppText bold numberOfLines={2} style={styles.title}>
                        {article.title}
                    </AppText>
                    <PickBadge pick={article.pick}>
                        <AppText small bold style={{ color: PICK_TEXT[article.pick] }}>
                            Pronostic :{" "}
                            {pickLabel(article.pick, {
                                home_team: article.home_team,
                                away_team: article.away_team
                            })}
                        </AppText>
                    </PickBadge>
                    {article.match_status === "finished" && (
                        <View style={[styles.resultBadge, won ? styles.won : styles.lost]}>
                            <AppText small bold style={won ? styles.wonText : styles.lostText}>
                                {won ? "✔ Gagné" : "✘ Perdu"} · {article.home_score ?? "-"} –{" "}
                                {article.away_score ?? "-"}
                            </AppText>
                        </View>
                    )}
                </View>
            </Link>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: spacing.three
    },
    inner: {
        gap: 12
    },
    top: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8
    },
    competition: {
        color: colors.gold,
        textTransform: "uppercase",
        letterSpacing: 0.4
    },
    teams: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8
    },
    teamsText: {
        flex: 1,
        textAlign: "center"
    },
    title: {
        fontSize: 16,
        lineHeight: 22
    },
    resultBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999
    },
    won: {
        backgroundColor: "rgba(52, 199, 89, 0.16)",
        borderWidth: 1,
        borderColor: "rgba(52, 199, 89, 0.4)"
    },
    lost: {
        backgroundColor: "rgba(255, 69, 58, 0.14)",
        borderWidth: 1,
        borderColor: "rgba(255, 69, 58, 0.4)"
    },
    wonText: {
        color: colors.successLight
    },
    lostText: {
        color: "#ff8f87"
    }
});