import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "../src/database/database.js";

async function main() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const username = process.env.ADMIN_USERNAME || "admin";

    if (!email || !password) {
        console.error("Indique ADMIN_EMAIL et ADMIN_PASSWORD dans backend/.env puis relance.");
        process.exit(1);
    }

    const existing = await db.query(`SELECT id, role FROM users WHERE email = $1`, [email]);

    const passwordHash = await bcrypt.hash(password, 10);

    if (existing.rows.length > 0) {
        await db.query(
            `UPDATE users SET role = 'admin', password_hash = $2 WHERE id = $1`,
            [existing.rows[0].id, passwordHash]
        );
        console.log(`Admin promu et mot de passe réinitialisé : ${email}`);
    } else {
        await db.query(
            `INSERT INTO users (username, email, password_hash, role)
             VALUES ($1, $2, $3, 'admin')`,
            [username, email, passwordHash]
        );
        console.log(`Admin créé : ${email} (username: ${username})`);
    }

    await db.end();
}

main().catch(async (error) => {
    console.error(error);
    await db.end();
    process.exit(1);
});