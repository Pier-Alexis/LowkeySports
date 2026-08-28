import { Pool } from "pg";
import "dotenv/config";

const dbConfig = {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "lowkeysports",
    password: process.env.DB_PASSWORD || "postgres",
    port: Number(process.env.DB_PORT || 5432),
};

export const db = new Pool(dbConfig);

db.connect()
    .then((client) => {
        console.log("PostgreSQL connecté");
        client.release();
    })
    .catch((error) => {
        console.error("Erreur PostgreSQL :", error);
    });