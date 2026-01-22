// packages/db-helper/src/cli/resume-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function resumeTenantCommand(program: Command) {
    program
        .command("resume-tenant <tenantName>")
        .description("Resume a tenant (set isActive=true)")
        .action(async (tenantName: string) => {
            try {
                const tenant = await dbHelper.resumeTenant(tenantName);
                Logger.info(`Tenant resumed: ${tenantName}`);
                console.log(tenant);
            } catch (err) {
                Logger.error(`❌ Error resuming tenant: ${tenantName}`, err);
                process.exit(1);
            }
        });
}
