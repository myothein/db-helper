// packages/db-helper/src/cli/init-system.ts
import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";
import { Logger } from "../utils/logger";

/**
 * Registers the init-system command
 */
export function initSystemCommand(program: Command) {
    program
        .command("init-system")
        .description("Initialize system database with migrations and system tables")
        .action(async () => {
            try {
                Logger.info("🚀 Initializing system database...");
                await dbHelper.initSystem();
                Logger.info("✅ System database initialized successfully");
            } catch (err) {
                Logger.error("❌ System initialization failed", err);
                process.exit(1);
            }
        });
}
