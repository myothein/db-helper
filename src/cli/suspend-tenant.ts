// packages/db-helper/src/cli/suspend-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function suspendTenantCommand(program: Command) {
    program
        .command("suspend-tenant <tenantName>")
        .description("Suspend a tenant (set isActive=false)")
        .action(async (tenantName: string) => {
            try {
                const tenant = await dbHelper.suspendTenant(tenantName);
                Logger.info(`Tenant suspended: ${tenantName}`);
                console.log(tenant);
            } catch (err) {
                Logger.error(`❌ Error suspending tenant: ${tenantName}`, err);
                process.exit(1);
            }
        });
}
