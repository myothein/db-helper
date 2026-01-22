import { execSync } from "child_process";
import fs from "fs";
import { PostgresProvider } from "../providers/postgres.provider";
import { Logger } from "../utils/logger";

export class TenantRestoreService {
    constructor(private provider: PostgresProvider) {}

    async restoreTenant(
        tenantName: string,
        backupFile: string,
        dropExisting = true
    ) {
        if (!fs.existsSync(backupFile)) {
            throw new Error(`Backup file not found: ${backupFile}`);
        }

        Logger.warn(`Restoring tenant "${tenantName}" from ${backupFile}`);

        await this.provider.connect();

        // 1️⃣ Kill active connections
        await this.provider.execute(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1
        `, [tenantName]);

        // 2️⃣ Drop DB
        if (dropExisting) {
            Logger.warn(`Dropping existing database "${tenantName}"`);
            await this.provider.execute(`DROP DATABASE IF EXISTS "${tenantName}"`);
        }

        // 3️⃣ Recreate DB
        Logger.info(`Creating database "${tenantName}"`);
        await this.provider.execute(`CREATE DATABASE "${tenantName}"`);

        // 4️⃣ Restore dump
        const cmd = `
psql \
"${process.env.DATABASE_URL!.replace(/\/[^/]+$/, `/${tenantName}`)}" \
-f "${backupFile}"
        `;

        execSync(cmd, { stdio: "inherit" });

        Logger.info(`Tenant "${tenantName}" restored successfully`);
    }
}
