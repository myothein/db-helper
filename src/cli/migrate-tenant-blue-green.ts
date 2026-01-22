import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function migrateTenantBlueGreenCommand(program: Command) {
    program
        .command("migrate-tenant-blue-green")
        .description("Blue-green migration for a tenant")
        .requiredOption("--tenant <tenantName>", "Tenant to migrate")
        .action(async (opts) => {
            const { tenant } = opts;

            try {
                Logger.info(`[STEP] Starting blue-green migration for tenant: ${tenant}`);

                // ✅ Use the updated DBHelper method
                await dbHelper.blueGreenMigrate(tenant);

                Logger.info(`✅ Blue-green migration completed for tenant: ${tenant}`);
            } catch (err) {
                Logger.error(`❌ Blue-green migration failed for tenant: ${tenant}`, err);
                process.exit(1);
            }
        });
}
