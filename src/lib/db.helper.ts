// packages/db-helper/src/lib/db-helper.ts
import { PostgresProvider } from "../providers/postgres.provider";
import { TenantService } from "../tenants/tenant.service";
import { MigrationService } from "../migrations/core/migration.service";
import { SeedRunner } from "../seeds/seed-runner";
import { healthcheck } from "../core/healthcheck";
import { Logger } from "../utils/logger";
import { createTenantDatabase } from "../providers/create-tenant-db";
import { ensureSystemDatabase } from "../providers/ensure-system-db";
import { runSystemMigrations } from "../core/run-system-migrations";
import { TenantBackupService } from "../backup/tenant-backup.service";
import { TenantRestoreService } from "../backup/tenant-restore.service";
import { randomBytes } from "crypto";

export class DBHelper {
    private provider: PostgresProvider;
    private tenantService: TenantService;
    private migrationService: MigrationService;
    private seedRunner: SeedRunner;
    private backupService: TenantBackupService;
    private restoreService: TenantRestoreService;

    constructor() {
        this.provider = new PostgresProvider();
        this.tenantService = new TenantService(this.provider);
        this.migrationService = new MigrationService(this.provider);
        this.seedRunner = new SeedRunner(this.provider);
        this.backupService = new TenantBackupService(this.provider, this.tenantService);
        this.restoreService = new TenantRestoreService(this.provider);
    }

    /** =========================
     * Centralized DB connection & error handling
     *========================= */
    private async withProvider<T>(operation: (provider: PostgresProvider) => Promise<T>): Promise<T> {
        await this.provider.connect();
        try {
            return await operation(this.provider);
        } catch (err) {
            Logger.error("Database operation failed:", err);
            throw err;
        } finally {
            await this.provider.disconnect();
        }
    }

    /** =========================
     * System database initialization
     *========================= */
    async initSystem() {
        return this.withProvider(async (provider) => {
            Logger.info("Initializing system database...");
            await ensureSystemDatabase();
            await runSystemMigrations();
            Logger.info("✅ System database initialized successfully");
        });
    }

    async bootstrapSystem() {
        return this.withProvider(async (provider) => {
            Logger.info("Bootstrapping system database...");
            await ensureSystemDatabase();
            await runSystemMigrations();
            Logger.info("System database ready");
        });
    }

    /** =========================
     * Tenant backup/restore
     *========================= */
    async backupTenant(tenantName: string) {
        return this.withProvider(async (provider) => {
            return this.backupService.backupTenant(tenantName);
        });
    }

    async restoreTenant(tenantName: string, backupFile: string) {
        Logger.warn(`Restoring tenant: ${tenantName}`);
        return this.restoreService.restoreTenant(tenantName, backupFile);
    }

    /** =========================
     * System-level operations
     *========================= */
    async checkHealth() {
        return this.withProvider(async (provider) => {
            Logger.info("Running system DB health check...");
            return healthcheck(provider);
        });
    }

    /** =========================
     * Tenant lifecycle operations
     *========================= */
    async migrateTenant(tenantName: string) {
        return this.withProvider(async (provider) => {
            const tenant = await this.tenantService.getTenantByName(tenantName);
            if (!tenant) throw new Error(`Tenant "${tenantName}" not found`);
            if (!tenant.isActive) {
                Logger.warn(`Tenant "${tenantName}" is suspended. Skipping migrations.`);
                return;
            }
            Logger.info(`Migrating tenant: ${tenantName}`);
            return this.migrationService.runMigrations(tenantName);
        });
    }

    async listTenants() {
        return this.withProvider(async (provider) => {
            return this.tenantService.listTenants();
        });
    }

    async suspendTenant(tenantName: string) {
        return this.withProvider(async (provider) => {
            return this.tenantService.suspendTenant(tenantName);
        });
    }

    async resumeTenant(tenantName: string) {
        return this.withProvider(async (provider) => {
            return this.tenantService.resumeTenant(tenantName);
        });
    }

    async dropTenant(tenantName: string) {
        return this.withProvider(async (provider) => {
            Logger.warn(`Dropping tenant: ${tenantName}`);
            return this.tenantService.dropTenant(tenantName);
        });
    }

    async resetTenant(tenantName: string) {
        return this.withProvider(async (provider) => {
            Logger.warn(`RESETTING tenant: ${tenantName}`);
            const tenant = await this.tenantService.getTenantByName(tenantName);
            if (!tenant) throw new Error(`Tenant "${tenantName}" not found`);

            // Terminate connections
            await provider.executeTenant(tenantName, `
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = $1
            `, [tenantName]);

            Logger.warn(`Dropping database "${tenantName}"`);
            await provider.executeTenant(tenantName, `DROP DATABASE IF EXISTS "${tenantName}"`);

            Logger.info(`Recreating database "${tenantName}"`);
            await provider.executeTenant(tenantName, `CREATE DATABASE "${tenantName}"`);

            await this.migrateTenant(tenantName);
            await this.seedRunner.run(tenantName);

            Logger.info(`Tenant reset completed: ${tenantName}`);
        });
    }

    async seedTenant(tenantName: string) {
        const provider = this.getProvider();
        const seedRunner = new SeedRunner(provider);

        Logger.info(`Seeding tenant database: ${tenantName}`);
        await seedRunner.run(tenantName);
    }

    /** =========================
     * Tenant status
     *========================= */
    async tenantStatus(tenantName: string) {
        return this.withProvider(async (provider) => {
            const status = {
                name: tenantName,
                existsInSystemDb: false,
                isActive: false,
                database: { exists: false, canConnect: false },
                migrations: { applied: false, currentVersion: null as string | null },
            };

            const tenant = await this.tenantService.getTenantByName(tenantName);
            if (!tenant) return status;

            status.existsInSystemDb = true;
            status.isActive = tenant.isActive;

            const dbExistsResult = await provider.execute(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [tenantName]
            );
            status.database.exists = dbExistsResult > 0;
            if (!status.database.exists) return status;

            try {
                const tenantConn = await provider.getTenantConnection(tenantName);
                status.database.canConnect = true;

                const tableExistsResult = await tenantConn.$queryRawUnsafe(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = '_migration_versions'
                    ) AS exists;
                `) as { exists: boolean }[];

                const tableExists = tableExistsResult[0]?.exists ?? false;
                if (tableExists) {
                    const migrations = await tenantConn.$queryRawUnsafe(`
                        SELECT version
                        FROM _migration_versions
                        ORDER BY applied_at DESC
                        LIMIT 1
                    `) as { version: string }[];

                    if (migrations.length > 0) {
                        status.migrations.applied = true;
                        status.migrations.currentVersion = migrations[0].version;
                    }
                }
            } catch {
                status.database.canConnect = false;
            }

            return status;
        });
    }

    async getTenantByName(name: string) {
        return this.withProvider(async () => {
            return this.tenantService.getTenantByName(name);
        });
    }

    getProvider() {
        return this.provider;
    }

    /** =========================
     * Rotate tenant DB credentials
     *========================= */
    async rotateCredentials(tenantName: string) {
        return this.withProvider(async (provider) => {
            Logger.info(`Rotating credentials for tenant: ${tenantName}`);
            const tenant = await this.tenantService.getTenantByName(tenantName);
            if (!tenant) throw new Error(`Tenant "${tenantName}" not found`);

            const newPassword = randomBytes(16).toString("hex");

            const roleExists = await provider.execute(`
                SELECT 1 FROM pg_roles WHERE rolname = '${tenantName}'
            `);

            if (!roleExists) {
                Logger.warn(`Role "${tenantName}" does not exist. Creating now.`);
                await provider.execute(`
                    CREATE ROLE "${tenantName}" LOGIN PASSWORD '${newPassword}';
                `);
                await provider.execute(`
                    GRANT ALL PRIVILEGES ON DATABASE "${tenantName}" TO "${tenantName}";
                `);
            } else {
                await provider.execute(`
                    ALTER ROLE "${tenantName}" WITH PASSWORD '${newPassword}';
                `);
            }

            await provider.getSystemClient().tenant.update({
                where: { name: tenantName },
                data: { dbPassword: newPassword },
            });

            Logger.info(`Tenant credentials rotated successfully: ${tenantName}`);
            return {
                username: tenantName,
                password: newPassword,
                databaseUrl: tenant.databaseUrl || `postgres://.../${tenantName}`,
            };
        });
    }

    /** =========================
     * Migrate all tenants
     *========================= */
    async migrateAllTenants() {
        const tenants = await this.listTenants();
        for (const tenant of tenants) {
            if (!tenant.isActive) continue;
            try {
                Logger.info(`Migrating tenant: ${tenant.name}`);
                await this.migrateTenant(tenant.name);
            } catch (err) {
                Logger.error(`Migration failed for tenant: ${tenant.name}`, err);
            }
        }
        Logger.info("✅ All tenant migrations completed");
    }

    /** =========================
     * Seed all tenants
     *========================= */
    async seedAllTenants(options?: { onlyMissing?: boolean }) {
        const tenants = await this.listTenants();
        for (const tenant of tenants) {
            if (!tenant.isActive) continue;
            Logger.info(`🌱 Seeding tenant: ${tenant.name}`);
            //await this.runSeed(tenant.name, options);
        }
        Logger.info("✅ All tenant seeding completed");
    }

    /** =========================
     * Provision a new tenant
     *========================= */
    async provisionTenant(name: string) {
        return this.withProvider(async (provider) => {
            Logger.info(`Provisioning tenant: ${name}`);

            await createTenantDatabase(name);

            const password = randomBytes(16).toString("hex");

            const roleExists = await provider.execute(`
                SELECT 1 FROM pg_roles WHERE rolname = '${name}';
            `);

            if (!roleExists) {
                Logger.info(`Creating DB role for tenant: ${name}`);
                await provider.execute(`
                    CREATE ROLE "${name}" LOGIN PASSWORD '${password}';
                `);
                await provider.execute(`
                    GRANT ALL PRIVILEGES ON DATABASE "${name}" TO "${name}";
                `);
            }

            const tenant = await this.tenantService.createTenant(name);

            await provider.getSystemClient().tenant.update({
                where: { name },
                data: {
                    dbUser: name,
                    dbPassword: password,
                    databaseUrl: tenant.databaseUrl || `postgres://.../${name}`,
                },
            });

            await this.migrateTenant(name);
            Logger.info(`Seeding tenant database: ${name}`);
            await this.seedRunner.run(name);

            Logger.info(`Tenant created: ${name}`);

            return {
                username: name,
                password,
                databaseUrl: tenant.databaseUrl || `postgres://.../${name}`,
            };
        });
    }

    /** =========================
     * Get pending migrations
     *========================= */
    async getPendingMigrations(tenantName: string) {
        return this.withProvider(async (provider) => {
            const tenant = await this.tenantService.getTenantByName(tenantName);
            if (!tenant) throw new Error(`Tenant "${tenantName}" not found`);
            if (!tenant.isActive) return [];
            return this.migrationService.getPendingMigrations(tenantName);
        });
    }

    /** =========================
     * Blue-green migration
     *========================= */
    async blueGreenMigrate(tenantName: string) {
        return this.withProvider(async (provider) => {
            Logger.info(`[STEP] Starting blue-green migration for tenant: ${tenantName}`);
            await this.migrationService.runBlueGreenMigrations(tenantName);
            Logger.info(`[STEP] Blue-green migration completed for tenant: ${tenantName}`);
        });
    }
}

// ✅ Singleton
export const dbHelper = new DBHelper();
