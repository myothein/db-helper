// packages/db-helper/src/cli/rotate-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function rotateTenantCredentialsCommand(program: Command) {
    program
        .command("rotate-tenant-credentials <tenantName>")
        .description("Rotate database credentials for a tenant")
        .action(async (tenantName: string) => {
            try {
                Logger.info(`🔄 Rotating credentials for tenant: ${tenantName}`);
                const provider = dbHelper.getProvider();
                await provider.connect();

                const creds = await dbHelper.rotateCredentials(tenantName);

                Logger.info("✅ Tenant credentials rotated successfully:");
                console.log(`  Username: ${creds.username}`);
                console.log(`  Password: ${creds.password}`);
                console.log(`  Database URL: ${creds.databaseUrl}`);

                await provider.disconnect();
            } catch (err) {
                Logger.error(
                    `❌ Error rotating tenant credentials for "${tenantName}"`,
                    err
                );
                process.exit(1);
            }
        });
}
