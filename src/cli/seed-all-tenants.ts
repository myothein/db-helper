import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";

export function seedAllTenantsCommand(program: Command) {
    program
        .command("seed-all-tenants")
        .option("--only-missing", "Seed only missing data")
        .description("Run seed for all tenants")
        .action(async (options) => {
            await dbHelper.seedAllTenants({ onlyMissing: options.onlyMissing });
        });
}
