// packages/db-helper/src/cli/migrate-system.ts
import { Command } from "commander";
import { dbHelper } from "../../lib/db.helper";
import { Logger } from "../../utils/logger";
import { MigrationService } from "../../migrations/core/migration.service";

export function migrateSystemCommand(program: Command) {
    program
        .command("migrate-system")
        .alias("system:migrate")
        .description("Run pending migrations for the system database")
        .action(async () => {
            try {
                Logger.info("🚀 Running system migrations...");
                const provider = dbHelper.getProvider();
                await provider.connect();

                const migrationService = new MigrationService(provider);
                await migrationService.runSystemMigrations();

                Logger.info("✅ System migrations applied successfully");
                await provider.disconnect();
            } catch (err) {
                Logger.error("❌ System migration failed", err);
                process.exit(1);
            }
        });
}
