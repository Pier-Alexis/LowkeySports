import { Pool } from "pg";
import "dotenv/config";


export const db = new Pool({
    user: "postgres",
    host: "localhost",
    database: "lowkeysports",
    password: "Canmore2020",
    port: 5432
});


db.connect()
    .then(() => {
        console.log("PostgreSQL connecté");
    })
    .catch((error) => {
        console.error("Erreur PostgreSQL :", error);
    });