// packages/db-helper/src/cli/drop-tenant.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

export function dropTenantCommand(program: Command) {
    program
        .command("drop-tenant")
        .description("Drop tenant database and remove it from system DB")
        .argument("<name>", "Tenant name")
        .option("-f, --force", "Confirm destructive operation")
        .action(async (name: string, options) => {
            if (!options.force) {
                console.error(
                    `❌ Refusing to drop tenant "${name}" without --force`
                );
                console.error(`👉 Use: pnpm db-helper drop-tenant ${name} --force`);
                process.exit(1);
            }

            try {
                Logger.warn(`Dropping tenant: ${name}`);

                await dbHelper.getProvider().connect();
                await dbHelper.dropTenant(name);

                Logger.info(`Tenant "${name}" dropped successfully`);
                await dbHelper.getProvider().disconnect();
            } catch (err) {
                console.error("Error:", err);
                process.exit(1);
            }
        });
}
