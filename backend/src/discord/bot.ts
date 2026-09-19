import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    REST,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Routes,
    SlashCommandBuilder
} from "discord.js";
import { db } from "../database/database.js";
import { ESPN_LEAGUES } from "../config/leagues.js";
import { PRONOSTIC_CATEGORY_ID } from "../services/discordBot.js";

const SPORT_LABELS: Record<string, string> = {
    soccer: "Soccer",
    american_football: "Football américain",
    basketball: "Basketball",
    tennis: "Tennis",
    baseball: "Baseball",
    hockey: "Hockey"
};

const SPORTS = [...new Set(ESPN_LEAGUES.map((league) => league.sport))];

const sportChoices = SPORTS.map((sport) => ({
    name: SPORT_LABELS[sport] ?? sport,
    value: sport
}));

const COMMANDS: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
    new SlashCommandBuilder()
        .setName("bilan")
        .setDescription("Bilan des experts : analyses gagnées / perdues")
        .addStringOption((option) =>
            option
                .setName("expert")
                .setDescription("Nom de l'expert à interroger (optionnel)")
                .setRequired(false)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName("matchs")
        .setDescription("Prochains matchs à venir")
        .addStringOption((option) =>
            option
                .setName("sport")
                .setDescription("Filtrer par sport")
                .setRequired(false)
                .setChoices(...sportChoices)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName("aide")
        .setDescription("Liste des commandes du bot")
        .toJSON()
];

const ACCENT = 0x156f3c;

async function registerCommands(token: string, applicationId: string): Promise<void> {
    const rest = new REST({ version: "10" }).setToken(token);
    const guildId = await resolveGuildId(token);

    if (guildId) {
        await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: COMMANDS });
        console.log(`Commandes slash Discord enregistrées sur le serveur ${guildId}`);
    } else {
        await rest.put(Routes.applicationCommands(applicationId), { body: COMMANDS });
        console.log("Commandes slash Discord enregistrées (globales, ~1h de propagation)");
    }
}

async function resolveGuildId(token: string): Promise<string | null> {
    const forced = process.env.DISCORD_COMMANDS_GUILD_ID?.trim();
    if (forced) return forced;

    try {
        const rest = new REST({ version: "10" }).setToken(token);
        const channel = (await rest.get(`/channels/${PRONOSTIC_CATEGORY_ID}`)) as { guild_id?: string };
        return channel.guild_id ?? null;
    } catch {
        return null;
    }
}

function formatDateFr(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

async function handleBilan(interaction: ChatInputCommandInteraction): Promise<void> {
    const filter = interaction.options.getString("expert")?.trim() ?? null;

    const result = await db.query(
        `SELECT u.id, u.username, u.role,
                COUNT(*) FILTER (WHERE a.pick = m.winner)::int AS wins,
                COUNT(*) FILTER (WHERE a.pick <> m.winner)::int AS losses,
                COUNT(*)::int AS total
         FROM articles a
         JOIN matches m ON m.id = a.match_id
         JOIN users u ON u.id = a.author_id
         WHERE a.status = 'published' AND m.status = 'finished'
         GROUP BY u.id, u.username, u.role
         HAVING COUNT(*) > 0
         ORDER BY wins DESC, losses ASC, u.username ASC`
    );

    const rows = result.rows as { username: string; wins: string; losses: string; total: string }[];

    if (rows.length === 0) {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(ACCENT).setTitle("Bilan des experts").setDescription("Aucune analyse terminée pour le moment.")] });
        return;
    }

    const wantedRows = filter
        ? rows.filter((row) => row.username.toLowerCase().includes(filter.toLowerCase()))
        : rows.slice(0, 10);

    if (wantedRows.length === 0) {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(ACCENT).setTitle("Bilan des experts").setDescription(`Aucun expert ne correspond à « ${filter} ».`)] });
        return;
    }

    const lines = wantedRows.map((row, index) => {
        const total = Number(row.total);
        const wins = Number(row.wins);
        const losses = Number(row.losses);
        const rate = total > 0 ? Math.round((wins * 1000) / total) / 10 : 0;
        return `${index + 1}. **${row.username}** — ${wins}V / ${losses}D (${rate} %)`;
    });

    const embed = new EmbedBuilder()
        .setColor(ACCENT)
        .setTitle("Bilan des experts")
        .setDescription(filter ? `Résultats pour « ${filter} » :\n` + lines.join("\n") : lines.join("\n"))
        .setFooter({ text: "Analyses publiées et matchs terminés uniquement" });

    await interaction.reply({ embeds: [embed] });
}

async function handleMatchs(interaction: ChatInputCommandInteraction): Promise<void> {
    const sport = interaction.options.getString("sport");

    const params: unknown[] = ["scheduled"];
    let sportSql = "";
    if (sport) {
        params.push(sport);
        sportSql = `AND sport = $${params.length}`;
    }
    params.push(8);

    const result = await db.query(
        `SELECT sport, competition, home_team, away_team, scheduled_at
         FROM matches
         WHERE status = $1 AND scheduled_at > NOW() ${sportSql}
         ORDER BY scheduled_at ASC
         LIMIT $${params.length}`,
        params
    );

    const rows = result.rows as {
        sport: string;
        competition: string | null;
        home_team: string;
        away_team: string;
        scheduled_at: string;
    }[];

    if (rows.length === 0) {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(ACCENT)
                    .setTitle(sport ? `Prochains matchs — ${SPORT_LABELS[sport] ?? sport}` : "Prochains matchs")
                    .setDescription("Aucun match à venir pour le moment.")
            ]
        });
        return;
    }

    const lines = rows.map((row) => {
        const league = row.competition ?? SPORT_LABELS[row.sport] ?? row.sport;
        return `${formatDateFr(row.scheduled_at)} — **${row.home_team}** vs **${row.away_team}** (${league})`;
    });

    const embed = new EmbedBuilder()
        .setColor(ACCENT)
        .setTitle(sport ? `Prochains matchs — ${SPORT_LABELS[sport] ?? sport}` : "Prochains matchs")
        .setDescription(lines.join("\n"))
        .setFooter({ text: "Plus de matchs sur lowkeysports" });

    await interaction.reply({ embeds: [embed] });
}

async function handleAide(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
        .setColor(ACCENT)
        .setTitle("Commandes du bot LowkeySports")
        .setDescription(
            [
                "**/bilan** — bilan des experts (analyses gagnées / perdues)",
                "**/matchs [sport]** — prochains matchs à venir",
                "**/aide** — affiche cette aide"
            ].join("\n")
        );

    await interaction.reply({ embeds: [embed] });
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    switch (interaction.commandName) {
        case "bilan":
            return handleBilan(interaction);
        case "matchs":
            return handleMatchs(interaction);
        case "aide":
            return handleAide(interaction);
    }
}

/**
 * Démarre la connexion Gateway du bot Discord et enregistre les commandes slash.
 * Ne fait rien (sans erreur) si DISCORD_BOT_TOKEN n'est pas configuré.
 */
export async function startDiscordBot(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN?.trim();
    if (!token) {
        console.warn("Bot Discord non démarré : DISCORD_BOT_TOKEN manquant.");
        return;
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once(Events.ClientReady, async (ready) => {
        console.log(`Bot Discord connecté en tant que ${ready.user.tag} (${ready.user.id})`);
        try {
            await registerCommands(token, ready.user.id);
        } catch (error) {
            console.error("Enregistrement des commandes Discord impossible :", error);
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        try {
            await handleCommand(interaction);
        } catch (error) {
            console.error(`Erreur sur la commande /${interaction.commandName} :`, error);
            await interaction.reply({ content: "Une erreur est survenue.", ephemeral: true }).catch(() => undefined);
        }
    });

    try {
        await client.login(token);
    } catch (error) {
        console.error("Connexion du bot Discord impossible :", error);
    }
}