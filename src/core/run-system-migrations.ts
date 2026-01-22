// packages/db-helper/src/core/run-system-migrations.ts
import { spawnSync } from "node:child_process";
import path from "node:path";
import { Logger } from "../utils/logger";

/**
 * Runs Prisma system migrations (tenants table, roles, etc.)
 * Safe to run multiple times (idempotent)
 */
export function runSystemMigrations() {
    Logger.info("Running system DB migrations...");

    const schemaDir = path.resolve(__dirname, "../../db-helper/prisma/system");
    const schemaPath = path.join(schemaDir, "schema.prisma");

    Logger.info(`Using schema: ${schemaPath}`);

    // Run Prisma migrate deploy
    const result = spawnSync(
        "pnpm",
        ["prisma", "migrate", "deploy"],
        {
            cwd: schemaDir,           // run inside prisma/system folder
            shell: true,              // Windows compatible
            encoding: "utf-8",        // capture stdout/stderr as string
            env: process.env,
        }
    );

    // Log stdout/stderr for debugging
    if (result.stdout) Logger.info(result.stdout);
    if (result.stderr) Logger.error(result.stderr);

    // Throw if Prisma failed
    if (result.status !== 0) {
        throw new Error(
            `Prisma migrate deploy failed with exit code ${result.status}`
        );
    }

    Logger.info("System DB migrations applied successfully");
}
