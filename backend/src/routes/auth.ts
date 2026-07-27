import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "../database/database.js";
import { createToken } from "../services/jwt.js";

const router = Router();


router.post("/register", async (req, res) => {

    try {

        const {
            username,
            email,
            password
        } = req.body;


        if (!username || !email || !password) {
            return res.status(400).json({
                error: "Informations manquantes"
            });
        }


        const passwordHash = await bcrypt.hash(password, 10);


        const result = await db.query(
            `
            INSERT INTO users
            (username, email, password_hash)
            VALUES ($1,$2,$3)
            RETURNING id, username, email, role
            `,
            [
                username,
                email,
                passwordHash
            ]
        );


        res.json({
            message: "Compte créé",
            user: result.rows[0]
        });


    } catch(error:any) {

        res.status(400).json({
            error: error.message
        });

    }

});

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        const result = await db.query(
            `
            SELECT *
            FROM users
            WHERE email = $1
            `,
            [email]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Utilisateur introuvable"
            });
        }


        const user = result.rows[0];


        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );


        if (!validPassword) {
            return res.status(401).json({
                error: "Mot de passe incorrect"
            });
        }


        const token = createToken(user);


        res.json({
            message: "Connexion réussie",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });


    } catch(error:any) {

        res.status(500).json({
            error: error.message
        });

    }

});


export default router;