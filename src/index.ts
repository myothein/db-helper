// src/index.ts

/** =========================
 * Core DB Helper
 *========================= */
export { DBHelper, dbHelper } from "./lib/db.helper";
export { Logger } from "./utils/logger";

/** =========================
 * System utilities
 *========================= */
export { initSystem } from "./system/init-system";
export { runSystemMigrations } from "./core/run-system-migrations";
export { createTenantDatabase } from "./providers/create-tenant-db";
export { ensureSystemDatabase } from "./providers/ensure-system-db";

/** =========================
 * Tenant operations (programmatic)
 *========================= */
export * from "./lib/db.helper";

/** =========================
 * Types & Config
 *========================= */
export * from "./types/db.types";
export * from "./tenants/tenant.types";
export * from "./config/db.config";

/** =========================
 * CLI commands (optional programmatic access)
 *========================= */
export * from "./cli/create-tenant";
export * from "./cli/drop-tenant";
export * from "./cli/reset-tenant";
export * from "./cli/migrate-tenant";
export * from "./cli/migrate-all-tenants";
export * from "./cli/migrate-tenant-blue-green";
export * from "./cli/rotate-tenant-credentials";
export * from "./cli/describe-tenant";
export * from "./cli/suspend-tenant";
export * from "./cli/resume-tenant";
export * from "./cli/list-tenants";
export * from "./cli/tenant-status";
export * from "./cli/backup-tenant";
export * from "./cli/restore-tenant";
export * from "./cli/seed-all-tenants";
export * from "./cli/health";
export * from "./cli/init-system";
export * from "./cli/migrate-system";
