// packages/db-helper/src/cli/suspend-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function tenantStatusCommand(program: Command) {
    program
        .command("tenant:status <tenantName>")
        .description("Show tenant database status")
        .action(async (tenantName: string) => {
            try {
                const provider = dbHelper.getProvider();
                await provider.connect();

                const tenant = await dbHelper.getTenantByName(tenantName);
                if (!tenant) {
                    console.error(`Tenant "${tenantName}" not found`);
                    process.exit(1);
                }

                // Example: check if migrations table exists
                const conn = await provider.getTenantConnection(tenantName);
                const migrations = await conn.$queryRawUnsafe(`
        SELECT version
        FROM _migration_versions
        ORDER BY applied_at DESC
        LIMIT 1
      `) as { version: string }[];

                console.log(`Tenant: ${tenantName}`);
                console.log(`Database URL: ${tenant.databaseUrl}`);
                console.log(`Migrations applied: ${migrations.length > 0 ? "Yes" : "No"}`);
                if (migrations.length) console.log(`Current migration: ${migrations[0].version}`);
            } catch (err) {
                console.error(err);
                process.exit(1);
            }
        });
}

