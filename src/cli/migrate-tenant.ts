// packages/db-helper/src/cli/migrate-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";

export function migrateTenantCommand(program: Command) {
    program
        .command("migrate-tenant <tenantName>")
        .description("Run pending migrations for a tenant")
        .action(async (tenantName: string) => {
            try {
                const provider = dbHelper.getProvider();
                await provider.connect(); // ensure system DB is connected

                await dbHelper.migrateTenant(tenantName);
                console.log(`✅ Migrations applied for tenant: ${tenantName}`);

                await provider.disconnect();
                process.exit(0);
            } catch (err) {
                console.error(`❌ Error migrating tenant "${tenantName}":`, err);
                process.exit(1);
            }
        })

}
