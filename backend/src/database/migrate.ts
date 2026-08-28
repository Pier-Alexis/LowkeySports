import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { db } from "./database.js";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function runMigrations() {
    await db.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`
    );

    const appliedResult = await db.query(`SELECT version FROM schema_migrations`);
    const applied = new Set(appliedResult.rows.map((row) => row.version));

    const files = readdirSync(MIGRATIONS_DIR)
        .filter((file) => file.endsWith(".sql"))
        .sort();

    for (const file of files) {
        if (applied.has(file)) continue;

        const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
        const client = await db.connect();

        try {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [file]);
            await client.query("COMMIT");
            console.log(`Applied ${file}`);
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    console.log("Migrations up to date");
}

const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
    runMigrations()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Migration failed", error);
            process.exit(1);
        });
}