import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import authRouter from "./routes/auth.js";
import playersRouter from "./routes/players.js";
import usersRouter from "./routes/users.js";
import matchesRouter from "./routes/matches.js";
import predictionsRouter from "./routes/predictions.js";
import articlesRouter from "./routes/articles.js";
import syncRouter from "./routes/sync.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Trop de requêtes. Réessayez plus tard." }
});

app.get("/", (req, res) => {
    res.json({
        name: "LowkeySports API",
        status: "online"
    });
});

app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/players", playersRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/predictions", predictionsRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/sync", syncRouter);
app.use(errorHandler);

export default app;