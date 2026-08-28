import app from "./app.js";
import "./database/database.js";

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
    console.log(`LowkeySports API running on port ${PORT}`);
});