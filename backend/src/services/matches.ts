import { db } from "../database/database.js";
import { computeWinner } from "../utils/results.js";
import { ApiError } from "../utils/errors.js";

export async function finishMatch(matchId: number, homeScore: number, awayScore: number) {
    const winner = computeWinner(homeScore, awayScore);
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE matches
             SET status = 'finished',
                 home_score = $2,
                 away_score = $3,
                 winner = $4
             WHERE id = $1 AND status = 'scheduled'
             RETURNING *`,
            [matchId, homeScore, awayScore, winner]
        );

        if (result.rows.length === 0) {
            const exists = await client.query(
                `SELECT status FROM matches WHERE id = $1`,
                [matchId]
            );

            if (exists.rows.length === 0) {
                throw new ApiError(404, "Match introuvable");
            }

            throw new ApiError(409, `Le match ne peut pas être terminé (statut : ${exists.rows[0].status})`);
        }

        await client.query(
            `UPDATE predictions
             SET points = CASE WHEN pick = $2 THEN 1 ELSE 0 END
             WHERE match_id = $1`,
            [matchId, winner]
        );

        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch {
            // transaction already closed
        }
        throw error;
    } finally {
        client.release();
    }
}