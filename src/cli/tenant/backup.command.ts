// packages/db-helper/src/cli/backup-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../../lib/db.helper";
import { Logger } from "../../utils/logger";

export function backupTenantCommand(program: Command) {
    program
        .command("backup-tenant <tenantName>")
        .description("Backup tenant database to SQL file")
        .action(async (tenantName: string) => {
            try {
                const file = await dbHelper.backupTenant(tenantName);
                Logger.info(`Backup created: ${file}`);
                console.log(`Backup file: ${file}`);
            } catch (err) {
                Logger.error(`❌ Error backing up tenant: ${tenantName}`, err);
                process.exit(1);
            }
        });
}
