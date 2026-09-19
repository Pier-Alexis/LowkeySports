import {
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    GuildMember,
    PermissionFlagsBits,
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
        .toJSON(),
    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Exclure un membre du serveur")
        .addUserOption((option) =>
            option.setName("membre").setDescription("Le membre à exclure").setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("raison").setDescription("Motif de l'exclusion").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .toJSON(),
    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bannir un membre du serveur")
        .addUserOption((option) =>
            option.setName("membre").setDescription("Le membre à bannir").setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("raison").setDescription("Motif du bannissement").setRequired(false)
        )
        .addIntegerOption((option) =>
            option
                .setName("supprimer_messages")
                .setDescription("Jours de messages à supprimer (0 à 7)")
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .toJSON(),
    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Retirer le bannissement d'un utilisateur")
        .addStringOption((option) =>
            option.setName("id").setDescription("ID de l'utilisateur à débannir").setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .toJSON(),
    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Mettre un membre en timeout")
        .addUserOption((option) =>
            option.setName("membre").setDescription("Le membre à mettre en timeout").setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("duree")
                .setDescription("Durée en minutes (max 40320 = 28 jours)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption((option) =>
            option.setName("raison").setDescription("Motif du timeout").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),
    new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Supprimer les derniers messages du canal")
        .addIntegerOption((option) =>
            option
                .setName("nombre")
                .setDescription("Nombre de messages à supprimer (1 à 100)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .toJSON(),
    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Attribuer ou retirer un rôle")
        .addSubcommand((sub) =>
            sub
                .setName("attribuer")
                .setDescription("Attribuer un rôle à un membre")
                .addUserOption((option) =>
                    option.setName("membre").setDescription("Le membre concerné").setRequired(true)
                )
                .addRoleOption((option) =>
                    option.setName("role").setDescription("Le rôle à attribuer").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("retirer")
                .setDescription("Retirer un rôle à un membre")
                .addUserOption((option) =>
                    option.setName("membre").setDescription("Le membre concerné").setRequired(true)
                )
                .addRoleOption((option) =>
                    option.setName("role").setDescription("Le rôle à retirer").setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
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
                COUNT(*)::int AS total,
                COALESCE(AVG(a.confidence) FILTER (WHERE a.confidence IS NOT NULL), 0)::numeric AS avg_confidence
         FROM articles a
         JOIN matches m ON m.id = a.match_id
         JOIN users u ON u.id = a.author_id
         WHERE a.status = 'published' AND m.status = 'finished'
         GROUP BY u.id, u.username, u.role
         HAVING COUNT(*) > 0
         ORDER BY wins DESC, losses ASC, u.username ASC`
    );

    const rows = result.rows as {
        username: string;
        wins: string;
        losses: string;
        total: string;
        avg_confidence: string;
    }[];

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
        const avgConfidence = Number(row.avg_confidence);
        const confidence = avgConfidence > 0 ? ` · conf. ${Math.round(avgConfidence * 10) / 10}/5` : "";
        return `${index + 1}. **${row.username}** — ${wins}V / ${losses}D (${rate} %)${confidence}`;
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
                "**Renseignements**",
                "**/bilan [expert]** — bilan des experts (gagné / perdu, % de réussite)",
                "**/matchs [sport]** — prochains matchs à venir",
                "",
                "**Modération** (selon tes permissions sur le serveur)",
                "**/kick <membre> [raison]** — exclure un membre",
                "**/ban <membre> [raison] [supprimer_messages]** — bannir un membre",
                "**/unban <id>** — retirer un bannissement",
                "**/timeout <membre> <duree> [raison]** — mettre en timeout (durée en minutes)",
                "**/clear <nombre>** — supprimer les derniers messages du canal (max 100)",
                "**/role attribuer|retirer <membre> <role>** — gérer les rôles",
                "",
                "**/aide** — affiche cette aide"
            ].join("\n")
        );

    await interaction.reply({ embeds: [embed] });
}

async function deferModeration(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.inGuild() || !interaction.guild) {
        await interaction.reply({ content: "Cette commande doit être utilisée sur un serveur.", ephemeral: true });
        return false;
    }
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
    }
    return true;
}

async function assertPerm(interaction: ChatInputCommandInteraction, perm: bigint): Promise<boolean> {
    const requester = interaction.memberPermissions;
    if (!requester || !requester.has(perm)) {
        await interaction.editReply({
            content: "Tu n'as pas la permission d'utiliser cette commande."
        });
        return false;
    }
    const bot = interaction.guild?.members.me;
    if (!bot || !bot.permissions.has(perm)) {
        await interaction.editReply({
            content: "Le bot n'a pas la permission nécessaire sur ce serveur. Accorde-la via les réglages du serveur, puis réessaie."
        });
        return false;
    }
    return true;
}

function moderationBlock(interaction: ChatInputCommandInteraction, targetId: string): string | null {
    if (targetId === interaction.user.id) return "Tu ne peux pas te modérer toi-même.";
    if (targetId === interaction.client.user.id) return "Je ne peux pas me modérer moi-même.";

    const member = interaction.guild?.members.cache.get(targetId);
    if (member) {
        const requester = interaction.member as GuildMember | null;
        const bot = interaction.guild?.members.me;
        if (requester && member.roles.highest.comparePositionTo(requester.roles.highest) >= 0) {
            return "Cette personne a un rôle égal ou supérieur au tien.";
        }
        if (bot && member.roles.highest.comparePositionTo(bot.roles.highest) >= 0) {
            return "Je ne peux pas modérer cette personne : son rôle est égal ou supérieur au mien.";
        }
    }
    return null;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round((minutes / 60) * 10) / 10} h`;
    return `${Math.round((minutes / 1440) * 10) / 10} j`;
}

async function handleKick(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await deferModeration(interaction))) return;
    if (!(await assertPerm(interaction, PermissionFlagsBits.KickMembers))) return;

    const target = interaction.options.getUser("membre", true);
    const reason = interaction.options.getString("raison") ?? "Aucun motif";
    const block = moderationBlock(interaction, target.id);
    if (block) {
        await interaction.editReply({ content: block });
        return;
    }

    try {
        await interaction.guild!.members.kick(target.id, reason);
        await interaction.editReply({
            content: `**${target.tag}** exclu·e du serveur.\nMotif : ${reason}`
        });
    } catch {
        await interaction.editReply({
            content: "Impossible d'exclure cette personne (rôle ou permission manquante ?)."
        });
    }
}

async function handleBan(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await deferModeration(interaction))) return;
    if (!(await assertPerm(interaction, PermissionFlagsBits.BanMembers))) return;

    const target = interaction.options.getUser("membre", true);
    const reason = interaction.options.getString("raison") ?? "Aucun motif";
    const days = interaction.options.getInteger("supprimer_messages") ?? 0;
    const block = moderationBlock(interaction, target.id);
    if (block) {
        await interaction.editReply({ content: block });
        return;
    }

    try {
        await interaction.guild!.bans.create(target.id, {
            reason,
            deleteMessageSeconds: days * 24 * 3600
        });
        await interaction.editReply({
            content: `**${target.tag}** banni·e du serveur.\nMotif : ${reason}`
        });
    } catch {
        await interaction.editReply({
            content: "Impossible de bannir cette personne (rôle ou permission manquante ?)."
        });
    }
}

async function handleUnban(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await deferModeration(interaction))) return;
    if (!(await assertPerm(interaction, PermissionFlagsBits.BanMembers))) return;

    const id = interaction.options.getString("id", true);
    try {
        await interaction.guild!.bans.remove(id, "Débannissement manuel");
        await interaction.editReply({ content: `Utilisateur **${id}** débanni·e.` });
    } catch {
        await interaction.editReply({ content: "Utilisateur introuvable ou déjà débanni." });
    }
}

async function handleTimeout(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await deferModeration(interaction))) return;
    if (!(await assertPerm(interaction, PermissionFlagsBits.ModerateMembers))) return;

    const target = interaction.options.getUser("membre", true);
    const minutes = interaction.options.getInteger("duree", true);
    const reason = interaction.options.getString("raison") ?? "Aucun motif";
    const block = moderationBlock(interaction, target.id);
    if (block) {
        await interaction.editReply({ content: block });
        return;
    }

    try {
        const until = new Date(Date.now() + minutes * 60000);
        await interaction.guild!.members.edit(target.id, { communicationDisabledUntil: until, reason });
        await interaction.editReply({
            content: `**${target.tag}** en timeout pour **${formatDuration(minutes)}**.\nMotif : ${reason}`
        });
    } catch {
        await interaction.editReply({
            content: "Impossible de mettre cette personne en timeout (permission manquante ?)."
        });
    }
}

async function handleClear(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await deferModeration(interaction))) return;
    if (!(await assertPerm(interaction, PermissionFlagsBits.ManageMessages))) return;

    const channel = interaction.channel;
    if (
        !channel ||
        (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
        await interaction.editReply({ content: "Cette commande fonctionne uniquement sur un canal texte." });
        return;
    }

    const count = interaction.options.getInteger("nombre", true);
    try {
        const messages = await channel.messages.fetch({ limit: Math.min(count, 100) });
        const deleted = await channel.bulkDelete(messages, true);
        await interaction.editReply({
            content: `${deleted.size} message(s) supprimé(s) dans #${channel.name}.`
        });
    } catch {
        await interaction.editReply({
            content: "Impossible de supprimer ces messages (14 jours maximum, ou permission manquante ?)."
        });
    }
}

async function handleRole(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await deferModeration(interaction))) return;
    if (!(await assertPerm(interaction, PermissionFlagsBits.ManageRoles))) return;

    const action = interaction.options.getSubcommand();
    const target = interaction.options.getUser("membre", true);
    const role = interaction.options.getRole("role", true);

    if (role.managed) {
        await interaction.editReply({
            content: "Ce rôle est géré par une intégration, je ne peux pas le modifier."
        });
        return;
    }

    let member: GuildMember;
    try {
        member = await interaction.guild!.members.fetch({ user: target.id, force: true });
    } catch {
        await interaction.editReply({ content: "Membre introuvable sur ce serveur." });
        return;
    }

    try {
        const roleIds = member.roles.cache.map((item) => item.id);
        if (action === "attribuer") {
            if (roleIds.includes(role.id)) {
                await interaction.editReply({ content: `**${target.tag}** a déjà le rôle **${role.name}**.` });
                return;
            }
            await member.roles.set([...roleIds, role.id], `Attribution par ${interaction.user.tag}`);
            await interaction.editReply({
                content: `Rôle **${role.name}** attribué à **${target.tag}**.`
            });
        } else {
            if (!roleIds.includes(role.id)) {
                await interaction.editReply({ content: `**${target.tag}** n'a pas le rôle **${role.name}**.` });
                return;
            }
            await member.roles.set(
                roleIds.filter((id) => id !== role.id),
                `Retrait par ${interaction.user.tag}`
            );
            await interaction.editReply({
                content: `Rôle **${role.name}** retiré de **${target.tag}**.`
            });
        }
    } catch {
        await interaction.editReply({
            content: "Impossible de modifier les rôles (hiérarchie ou permission manquante ?)."
        });
    }
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    switch (interaction.commandName) {
        case "bilan":
            return handleBilan(interaction);
        case "matchs":
            return handleMatchs(interaction);
        case "aide":
            return handleAide(interaction);
        case "kick":
            return handleKick(interaction);
        case "ban":
            return handleBan(interaction);
        case "unban":
            return handleUnban(interaction);
        case "timeout":
            return handleTimeout(interaction);
        case "clear":
            return handleClear(interaction);
        case "role":
            return handleRole(interaction);
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