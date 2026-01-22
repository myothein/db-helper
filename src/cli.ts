#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";

// Import all CLI command modules
import { createTenantCommand } from "./cli/create-tenant";
import { dropTenantCommand } from "./cli/drop-tenant";
import { resetTenantCommand } from "./cli/reset-tenant";
import { migrateTenantCommand } from "./cli/migrate-tenant";
import { migrateAllTenantsCommand } from "./cli/migrate-all-tenants";
import { rotateTenantCredentialsCommand } from "./cli/rotate-tenant-credentials";
import { describeTenantCommand } from "./cli/describe-tenant";
import { suspendTenantCommand } from "./cli/suspend-tenant";
import { resumeTenantCommand } from "./cli/resume-tenant";
import { listTenantsCommand } from "./cli/list-tenants";
import { tenantStatusCommand } from "./cli/tenant-status";
import { backupTenantCommand } from "./cli/backup-tenant";
import { restoreTenantCommand } from "./cli/restore-tenant";
import { seedAllTenantsCommand } from "./cli/seed-all-tenants";
import { healthCommand } from "./cli/health";
import { initSystemCommand } from "./cli/init-system";
import { migrateSystemCommand } from "./cli/migrate-system";
import { migrateTenantBlueGreenCommand } from "./cli/migrate-tenant-blue-green";
import { registerCheckTenants } from "./cli/check-tenants";

const program = new Command();

program
    .name("db-helper")
    .description("Multi-tenant DB helper CLI")
    .version("0.1.0");

// Register all commands
initSystemCommand(program);
migrateSystemCommand(program);

createTenantCommand(program);
dropTenantCommand(program);
resetTenantCommand(program);
migrateTenantCommand(program);
migrateAllTenantsCommand(program);
migrateTenantBlueGreenCommand(program);
rotateTenantCredentialsCommand(program);
describeTenantCommand(program);
suspendTenantCommand(program);
resumeTenantCommand(program);
listTenantsCommand(program);
tenantStatusCommand(program);
backupTenantCommand(program);
restoreTenantCommand(program);
seedAllTenantsCommand(program);
healthCommand(program);

registerCheckTenants(program);
// Parse CLI arguments
async function main() {
    try {
        await program.parseAsync(process.argv);
    } catch (err) {
        console.error("CLI failed:", err);
        process.exit(1);
    }
}

main();
