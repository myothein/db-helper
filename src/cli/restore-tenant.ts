// packages/db-helper/src/cli/restore-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function restoreTenantCommand(program: Command) {
    program
        .command("restore-tenant <tenantName> <backupFile>")
        .description("Restore tenant database from backup")
        .action(async (tenantName: string, backupFile: string) => {
            try {
                await dbHelper.restoreTenant(tenantName, backupFile);
                Logger.info(`Tenant restored: ${tenantName}`);
                console.log(`✅ Tenant restored from backup: ${backupFile}`);
            } catch (err) {
                Logger.error(`❌ Error restoring tenant: ${tenantName}`, err);
                process.exit(1);
            }
        });
}
