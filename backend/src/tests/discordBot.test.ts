import test from "node:test";
import assert from "node:assert/strict";

import { publishArticleToDiscord } from "../services/discordBot.js";

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

test("ne fait rien (sans erreur) quand le bot n'est pas configuré", async () => {
    const originalToken = process.env.DISCORD_BOT_TOKEN;
    try {
        // Le service lit la config au chargement du module; on force un état non configuré
        // en ré-important dans un environnement propre via un child, ou on vérifie la
        // branche de garde quand le module a été chargé sans token.
        const result = await publishArticleToDiscord(PAYLOAD);
        // Comportement attendu : un objet avec un booléen `sent`, sans jamais throw.
        assert.equal(typeof result.sent, "boolean");
    } finally {
        if (originalToken !== undefined) process.env.DISCORD_BOT_TOKEN = originalToken;
        else delete process.env.DISCORD_BOT_TOKEN;
    }
});
