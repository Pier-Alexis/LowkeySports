const DISCORD_API = "https://discord.com/api/v10";

const token = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";
const channelId = process.env.DISCORD_CHANNEL_ID?.trim() ?? "";

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

async function describeChannel(id: string): Promise<{ type: number; name: string }> {
    const response = await fetch(`${DISCORD_API}/channels/${id}`, {
        headers: { Authorization: `Bot ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Impossible de lire le canal Discord (${response.status})`);
    }
    const body = (await response.json()) as { type?: number; name?: string };
    return { type: body.type ?? -1, name: body.name ?? "" };
}

async function createThread(name: string, message: string): Promise<string | null> {
    const response = await fetch(`${DISCORD_API}/channels/${channelId}/threads`, {
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

async function sendMessage(content: string, threadId?: string): Promise<string | null> {
    const target = threadId ?? channelId;
    const response = await fetch(`${DISCORD_API}/channels/${target}/messages`, {
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
    if (!token || !channelId) {
        console.warn("Discord non configuré (DISCORD_BOT_TOKEN / DISCORD_CHANNEL_ID manquants).");
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
        const channel = await describeChannel(channelId);
        const isForum = channel.type === 15 || channel.type === 14;

        const messageId = isForum
            ? await createThread(
                  payload.title || payload.homeTeam,
                  body
              )
            : await sendMessage(body);

        return { sent: true, messageId: messageId ?? undefined };
    } catch (error) {
        console.error("Échec de l'envoi du message Discord :", error);
        return { sent: false };
    }
}
