// packages/db-helper/src/cli/describe-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function describeTenantCommand(program: Command) {
    program
        .command("describe-tenant <tenantName>")
        .description("Show detailed tenant information")
        .action(async (tenantName: string) => {
            try {
                Logger.info(`🔍 Fetching details for tenant: ${tenantName}`);
                const provider = dbHelper.getProvider();
                await provider.connect();

                const status = await dbHelper.tenantStatus(tenantName);

                console.log("Tenant Details:");
                console.log(`  Name: ${status.name}`);
                console.log(`  Active: ${status.isActive}`);
                console.log(`  Exists in system DB: ${status.existsInSystemDb}`);
                console.log(`  Database exists: ${status.database.exists}`);
                console.log(`  Can connect to DB: ${status.database.canConnect}`);
                console.log(`  Migrations applied: ${status.migrations.applied}`);
                console.log(
                    `  Current migration version: ${status.migrations.currentVersion}`
                );

                await provider.disconnect();
            } catch (err) {
                Logger.error(`❌ Error fetching tenant details: ${tenantName}`, err);
                process.exit(1);
            }
        });
}
