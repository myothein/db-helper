// packages/db-helper/examples/mysql.ts

import { createProvider, DBEngine } from "../../src/providers";

(async () => {
    console.log("=== MySQL Example ===");

    const provider = createProvider(DBEngine.MYSQL);

    try {
        await provider.connect();
        console.log("Connected to MySQL (not implemented).");
    } catch (err) {
        console.error("MySQL provider not implemented yet.", err);
    }
})();
