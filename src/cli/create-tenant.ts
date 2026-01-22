// packages/db-helper/src/cli/create-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function createTenantCommand(program: Command) {
    program
        .command("create-tenant <name>")
        .description("Create a new tenant")
        .action(async (name: string) => {
            const provider = dbHelper.getProvider();

            try {
                Logger.info("Connecting system database...");
                await provider.connect();

                Logger.info(`Provisioning tenant: ${name}`);
                const creds = await dbHelper.provisionTenant(name);

                Logger.info(`Running tenant migrations: ${name}`);
                await dbHelper.migrateTenant(name); // ✅ REQUIRED

                Logger.info(`Running tenant seeds: ${name}`);
                await dbHelper.seedTenant(name); // ✅ AFTER migrations

                Logger.info(`Tenant created: ${name}`);
                console.log("✅ Tenant created successfully:");
                console.log(`  Username: ${creds.username}`);
                console.log(`  Password: ${creds.password}`);
                console.log(`  Database URL: ${creds.databaseUrl}`);
            } catch (err) {
                console.error("❌ Error creating tenant:", err);
                process.exit(1);
            } finally {
                await provider.disconnect();
            }
        });
}
