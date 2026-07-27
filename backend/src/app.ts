import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import playersRouter from "./routes/players.js";

import usersRouter from "./routes/users.js";

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.json({
        name: "LowkeySports API",
        status: "online"
    });
});


app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/players", playersRouter);


export default app;