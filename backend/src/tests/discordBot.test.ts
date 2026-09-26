import test from "node:test";
import assert from "node:assert/strict";

const PAYLOAD = {
    author: "tester",
    title: "Titre de test",
    content: "Contenu de test suffisamment long.",
    pick: "home",
    homeTeam: "Team A",
    awayTeam: "Team B",
    sport: "soccer",
    competition: "Ligue"
};

interface AppelsFetch {
    urls: string[];
    corps: string[];
    restore(): void;
}

/**
 * Intercepte `fetch` global.
 *
 * Ce test appelait réellement `publishArticleToDiscord`, qui charge le
 * DISCORD_BOT_TOKEN du `.env` via `database.js` : chaque `npm test` publiait un
 * message de test dans le vrai canal Discord. Le service n'a pas vocation à
 * savoir qu'il est testé, c'est donc le test qui doit couper le réseau.
 */
function intercepterFetch(): AppelsFetch {
    const original = globalThis.fetch;
    const urls: string[] = [];
    const corps: string[] = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const methode = init?.method ?? "GET";
        urls.push(url);
        if (typeof init?.body === "string") corps.push(init.body);

        const json = (data: unknown) =>
            new Response(JSON.stringify(data), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        // Description d'un canal (la catégorie des pronostics).
        if (methode === "GET" && /\/channels\/\d+$/.test(url)) {
            return json({ id: "categorie-fausse", guild_id: "guild-faux", type: 0, name: "Pronostics" });
        }
        // Liste des canaux du serveur : aucun canal préexistant.
        if (methode === "GET" && url.includes("/guilds/") && url.includes("/channels")) {
            return json([]);
        }
        // Création d'un canal.
        if (methode === "POST" && url.includes("/guilds/") && url.includes("/channels")) {
            return json({ id: "canal-faux" });
        }
        // Création d'un message.
        if (methode === "POST" && url.includes("/messages")) {
            return json({ id: "message-faux" });
        }
        return json({});
    }) as typeof fetch;

    return {
        urls,
        corps,
        restore() {
            globalThis.fetch = original;
        }
    };
}

test("publier une analyse construit le message attendu sans toucher le réseau", async () => {
    const intercepteur = intercepterFetch();
    const token = process.env.DISCORD_BOT_TOKEN;
    process.env.DISCORD_BOT_TOKEN = "jeton-de-test";

    try {
        // Import frais : le service lit le jeton au chargement du module.
        const { publishArticleToDiscord } = await import(
            `../services/discordBot.js?jeton=${Date.now()}`
        );

        const resultat = await publishArticleToDiscord(PAYLOAD);

        assert.equal(resultat.sent, true);
        assert.equal(resultat.messageId, "message-faux");

        const envoi = intercepteur.urls.find((url) => url.includes("/messages") && url.endsWith("/messages"));
        assert.ok(envoi, "un appel de création de message était attendu");

        const corps = JSON.parse(intercepteur.corps[intercepteur.corps.length - 1] ?? "{}") as {
            content?: string;
        };
        assert.ok(corps.content, "le corps du message doit contenir le texte");
        assert.match(corps.content, /Par \*\*tester\*\*/);
        assert.match(corps.content, /\*\*Team A vs Team B\*\*/);
        assert.match(corps.content, /Pronostic : \*\*Team A\*\*/);
        assert.match(corps.content, /soccer · Ligue/);
    } finally {
        intercepteur.restore();
        if (token === undefined) delete process.env.DISCORD_BOT_TOKEN;
        else process.env.DISCORD_BOT_TOKEN = token;
    }
});

test("ne fait rien (sans erreur) quand le bot n'est pas configuré", async () => {
    const intercepteur = intercepterFetch();
    const token = process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_BOT_TOKEN;

    try {
        const { publishArticleToDiscord } = await import(
            `../services/discordBot.js?jeton=${Date.now()}`
        );

        const resultat = await publishArticleToDiscord(PAYLOAD);

        assert.equal(resultat.sent, false);
        assert.deepEqual(intercepteur.urls, [], "aucun appel HTTP ne doit partir sans jeton");
    } finally {
        intercepteur.restore();
        if (token === undefined) delete process.env.DISCORD_BOT_TOKEN;
        else process.env.DISCORD_BOT_TOKEN = token;
    }
});
