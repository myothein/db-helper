// packages/db-helper/examples/sqlite.ts

import { createProvider, DBEngine } from "../providers";

(async () => {
    console.log("=== SQLite Example ===");

    const provider = createProvider(DBEngine.SQLITE);

    try {
        await provider.connect();
        console.log("Connected to SQLite (not implemented).");
    } catch (err) {
        console.error("SQLite provider not implemented yet.", err);
    }
})();
