import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function migrateAllTenantsCommand(program: Command) {
    program
        .command("migrate-all-tenants")
        .option("--include-suspended", "Also migrate suspended tenants")
        .description("Run pending migrations for all active tenants")
        .action(async (options) => {
            try {
                const provider = dbHelper.getProvider();
                await provider.connect();
                const tenants = await dbHelper.listTenants();

                for (const tenant of tenants) {
                    if (!tenant.isActive && !options.includeSuspended) {
                        Logger.warn(`Skipping suspended tenant: ${tenant.name}`);
                        continue;
                    }
                    try {
                        Logger.info(`Migrating tenant: ${tenant.name}`);
                        await dbHelper.migrateTenant(tenant.name);
                        Logger.info(`✅ Migrated: ${tenant.name}`);
                    } catch (err) {
                        Logger.error(`❌ Migration failed for tenant: ${tenant.name}`, err);
                    }
                }

                Logger.info("✅ migrate-all-tenants completed");
                await provider.disconnect();
            } catch (err) {
                console.error("Migration failed:", err);
                process.exit(1);
            }
        });
}
