import app from "./app.js";
import "./database/database.js";
import { startResultsScheduler } from "./services/resultsSync.js";

const PORT = Number(process.env.PORT || 3000);

const resultsSyncInterval = Number(process.env.RESULTS_SYNC_INTERVAL_MS || 15 * 60 * 1000);
startResultsScheduler(resultsSyncInterval);

app.listen(PORT, () => {
    console.log(`LowkeySports API running on port ${PORT}`);
});