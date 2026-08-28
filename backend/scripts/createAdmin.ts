import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "../src/database/database.js";

async function main() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const desiredUsername = process.env.ADMIN_USERNAME || "admin";

    if (!email || !password) {
        console.error("Indique ADMIN_EMAIL et ADMIN_PASSWORD dans backend/.env puis relance.");
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const byEmail = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);

    if (byEmail.rows.length > 0) {
        await db.query(
            `UPDATE users SET role = 'admin', password_hash = $2 WHERE id = $1`,
            [byEmail.rows[0].id, passwordHash]
        );
        console.log(`Admin promu et mot de passe réinitialisé : ${email}`);
        await db.end();
        return;
    }

    let username = desiredUsername;
    let suffix = 1;
    for (;;) {
        const clash = await db.query(`SELECT id FROM users WHERE username = $1`, [username]);
        if (clash.rows.length === 0) {
            break;
        }
        username = `${desiredUsername}${suffix++}`;
    }

    await db.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')`,
        [username, email, passwordHash]
    );
    console.log(`Admin créé : ${email} (username: ${username})`);

    await db.end();
}

main().catch(async (error) => {
    console.error(error);
    await db.end();
    process.exit(1);
});