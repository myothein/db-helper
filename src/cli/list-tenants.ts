// packages/db-helper/src/cli/list-tenants.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";

export function listTenantsCommand(program: Command) {
    program
        .command("list-tenants")
        .description("List all tenants")
        .action(async () => {
            try {
                const provider = dbHelper.getProvider();
                await provider.connect();

                const tenants = await dbHelper.listTenants();
                console.log(tenants);

                await provider.disconnect();
            } catch (err) {
                console.error("❌ Error listing tenants:", err);
                process.exit(1);
            }
        });
}
