import { Router } from "express";
import { db } from "../database/database.js";
import { auth, AuthRequest } from "../middleware/auth.js";


const router = Router();


// Créer son profil sportif
router.post(
"/",
auth,
async (req: AuthRequest, res) => {

    try {

        const {
            sport,
            position,
            age,
            team
        } = req.body;


        const result = await db.query(
        `
        INSERT INTO players
        (
            user_id,
            sport,
            position,
            age,
            team
        )
        VALUES
        ($1,$2,$3,$4,$5)
        RETURNING *
        `,
        [
            req.user.id,
            sport,
            position,
            age,
            team
        ]);


        res.json({
            message: "Profil sportif créé",
            player: result.rows[0]
        });


    } catch(error:any) {

        res.status(500).json({
            error: error.message
        });

    }

});



// Voir son profil
router.get(
"/me",
auth,
async (req: AuthRequest,res)=>{


    const result = await db.query(
        `
        SELECT *
        FROM players
        WHERE user_id=$1
        `,
        [
            req.user.id
        ]
    );


    res.json(result.rows[0] || null);

});



export default router;