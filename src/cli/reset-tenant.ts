// packages/db-helper/src/cli/reset-tenant.ts

import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export async function resetTenantCommand(program: any) {

    program
        .command("reset-tenant <name>")
        .description("Drop, recreate, migrate and seed a tenant database")
        .option("--force", "Required to confirm destructive action")
        .action(async (name: string, options: any) => {
            if (!options.force) {
                console.error("❌ --force flag is required");
                process.exit(1);
            }

            try {
                Logger.warn(`Resetting tenant: ${name}`);
                await dbHelper.resetTenant(name);
                console.log(`✅ Tenant reset: ${name}`);
            } catch (err) {
                console.error("Error resetting tenant:", err);
                process.exit(1);
            }
        });
}
