import { Router } from "express";

const router = Router();


const users = [
    {
        id: 1,
        username: "demoPlayer",
        sport: "Hockey"
    }
];


router.get("/", (req, res) => {
    res.json(users);
});


router.get("/:id", (req, res) => {

    const id = Number(req.params.id);

    const user = users.find(
        u => u.id === id
    );


    if (!user) {
        return res.status(404).json({
            error: "Utilisateur introuvable"
        });
    }


    res.json(user);
});


export default router;