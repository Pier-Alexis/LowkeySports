const DISCORD_API = "https://discord.com/api/v10";

import { db } from "../database/database.js";

const token = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";

// Catégorie Discord regroupant un canal texte par sport.
export const PRONOSTIC_CATEGORY_ID = "1529977038449017015";

// Canaux existants par sport. Les sports absents de cette map sont
// créés automatiquement dans la catégorie ci-dessus (nom = clé du sport).
const SPORT_CHANNEL_IDS: Record<string, string> = {
    baseball: "1532800454428328087",
    basketball: "1532800483167572151",
    american_football: "1532800506034917496",
    tennis: "1532800534241612019"
};

// Cache des canaux créés dynamiquement (sport -> channel id) pour éviter les doublons.
const createdChannelCache = new Map<string, string>();
let categoryGuildId: string | null = null;

function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 3).trimEnd()}...`;
}

function pickLabel(pick: string, homeTeam: string, awayTeam: string): string {
    switch (pick) {
        case "home":
            return homeTeam;
        case "away":
            return awayTeam;
        case "draw":
            return "Match nul";
        default:
            return pick;
    }
}

async function describeChannel(id: string): Promise<{ type: number; name: string; guildId: string | null }> {
    const response = await fetch(`${DISCORD_API}/channels/${id}`, {
        headers: { Authorization: `Bot ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Impossible de lire le canal Discord (${response.status})`);
    }
    const body = (await response.json()) as { type?: number; name?: string; guild_id?: string };
    return { type: body.type ?? -1, name: body.name ?? "", guildId: body.guild_id ?? null };
}

async function getCategoryGuildId(): Promise<string> {
    if (categoryGuildId) return categoryGuildId;
    const category = await describeChannel(PRONOSTIC_CATEGORY_ID);
    if (!category.guildId) {
        throw new Error("Impossible de déterminer le serveur Discord de la catégorie de pronostics");
    }
    categoryGuildId = category.guildId;
    return categoryGuildId;
}

async function findChannelInCategory(guildId: string, name: string): Promise<string | null> {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Impossible de lister les canaux Discord (${response.status})`);
    }
    const channels = (await response.json()) as Array<{ id: string; name: string; parent_id?: string }>;
    const match = channels.find((c) => c.parent_id === PRONOSTIC_CATEGORY_ID && c.name === name);
    return match?.id ?? null;
}

async function createChannelInCategory(guildId: string, name: string): Promise<string> {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
        method: "POST",
        headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, type: 0, parent_id: PRONOSTIC_CATEGORY_ID })
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Impossible de créer le canal Discord "${name}": ${detail}`);
    }

    const body = (await response.json()) as { id?: string };
    if (!body.id) {
        throw new Error(`Réponse Discord invalide lors de la création du canal "${name}"`);
    }
    return body.id;
}

/**
 * Résout le canal Discord à utiliser pour un sport donné : canal fixe connu,
 * canal déjà créé dynamiquement (cache), canal existant dans la catégorie,
 * ou nouveau canal créé à la volée (nom = sport en minuscule).
 */
async function resolveSportChannelId(sport: string): Promise<string> {
    const slug = sport.trim().toLowerCase();

    const fixed = SPORT_CHANNEL_IDS[slug];
    if (fixed) return fixed;

    const cached = createdChannelCache.get(slug);
    if (cached) return cached;

    const guildId = await getCategoryGuildId();
    const existing = await findChannelInCategory(guildId, slug);
    if (existing) {
        createdChannelCache.set(slug, existing);
        return existing;
    }

    const created = await createChannelInCategory(guildId, slug);
    createdChannelCache.set(slug, created);
    return created;
}

async function createThread(targetChannelId: string, name: string, message: string): Promise<string | null> {
    const response = await fetch(`${DISCORD_API}/channels/${targetChannelId}/threads`, {
        method: "POST",
        headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: truncate(name, 100),
            type: 11,
            message: { content: truncate(message, 8000) }
        })
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Impossible de créer le thread Discord: ${detail}`);
    }

    const body = (await response.json()) as { id?: string };
    return body.id ?? null;
}

async function sendMessage(targetChannelId: string, content: string): Promise<string | null> {
    const response = await fetch(`${DISCORD_API}/channels/${targetChannelId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ content })
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Discord a répondu ${response.status}: ${detail}`);
    }

    const body = (await response.json()) as { id?: string };
    return body.id ?? null;
}

/**
 * Publie le message sur le canal Discord quand une analyse est publiée.
 * Gère aussi bien les canaux texte classiques que les forums (threads).
 * Ne fait rien (sans erreur) si le bot n'est pas configuré.
 */
export async function publishArticleToDiscord(payload: {
    author: string;
    title: string;
    content: string;
    pick: string;
    homeTeam: string;
    awayTeam: string;
    sport: string;
    competition?: string;
}): Promise<{ sent: boolean; messageId?: string }> {
    if (!token) {
        console.warn("Discord non configuré (DISCORD_BOT_TOKEN manquant).");
        return { sent: false };
    }

    const teamPair = `${payload.homeTeam} vs ${payload.awayTeam}`;
    const pronostic = pickLabel(payload.pick, payload.homeTeam, payload.awayTeam);

    const body = [
        `Par **${payload.author}**`,
        `**${teamPair}**`,
        `${payload.sport}${payload.competition ? ` · ${payload.competition}` : ""}`,
        `Pronostic : **${pronostic}**`,
        "",
        truncate(payload.content.trim() || "_Pas de détail_", 1800)
    ].join("\n");

    try {
        const targetChannelId = await resolveSportChannelId(payload.sport);
        const channel = await describeChannel(targetChannelId);
        const isForum = channel.type === 15 || channel.type === 14;

        const messageId = isForum
            ? await createThread(
                  targetChannelId,
                  payload.title || payload.homeTeam,
                  body
              )
            : await sendMessage(targetChannelId, body);

        return { sent: true, messageId: messageId ?? undefined };
    } catch (error) {
        console.error("Échec de l'envoi du message Discord :", error);
        return { sent: false };
    }
}

/**
 * Envoie une notification de verdict sur le canal Discord du sport quand un match
 * se termine : rapporte le score et le résultat de chaque analyse publiée
 * (gagné / perdu). Ignoré sans erreur si le bot n'est pas configuré.
 */
export async function notifyMatchResultOnDiscord(matchId: number): Promise<{ sent: boolean }> {
    if (!token) {
        return { sent: false };
    }

    try {
        const matchRes = await db.query(
            `SELECT id, sport, competition, home_team, away_team, home_score, away_score, winner
             FROM matches
             WHERE id = $1 AND status = 'finished' AND winner IS NOT NULL`,
            [matchId]
        );
        const match = matchRes.rows[0];
        if (!match) return { sent: false };

        const articlesRes = await db.query(
            `SELECT a.pick, a.title, u.username, (a.pick = $2) AS won
             FROM articles a
             JOIN users u ON u.id = a.author_id
             WHERE a.match_id = $1 AND a.status = 'published'
             ORDER BY a.published_at ASC`,
            [match.id, match.winner]
        );

        if (articlesRes.rows.length === 0) {
            return { sent: false };
        }

        const teamPair = `${match.home_team} vs ${match.away_team}`;
        const score = `${match.home_score ?? "-"} – ${match.away_score ?? "-"}`;
        const winnerLabel =
            match.winner === "home"
                ? match.home_team
                : match.winner === "away"
                  ? match.away_team
                  : "Match nul";

        const lines = articlesRes.rows.map((article) => {
            const mark = article.won ? "✅" : "❌";
            const detail = article.title ? ` — ${truncate(article.title, 60)}` : "";
            return `— ${mark} **${article.username}** : ${pickLabel(article.pick, match.home_team, match.away_team)}${detail}`;
        });

        const body = [
            `**${teamPair}** · ${score} — victoire **${winnerLabel}**`,
            "Verdict de nos analyses :",
            ...lines
        ].join("\n");

        const targetChannelId = await resolveSportChannelId(match.sport);
        await sendMessage(targetChannelId, body);
        return { sent: true };
    } catch (error) {
        console.error("Échec de la notification Discord des résultats :", error);
        return { sent: false };
    }
}
