// packages/db-helper/src/migrations/core/migration.service.ts
import { PostgresProvider } from "../../providers/postgres.provider";
import { MigrationLock } from "../migration-lock";
import { VersionTracker } from "./version-tracker";
import { blueGreenMigrate, TenantMigration } from "../blue-green";
import { Logger } from "../../utils/logger";
import { SeedRunner } from "../../seeds/seed-runner";
import fs from "fs";
import path from "path";

export class MigrationService {
    private readonly provider: PostgresProvider;
    private readonly lock: MigrationLock;
    private readonly tracker: VersionTracker;
    private readonly seedRunner: SeedRunner;

    constructor(provider: PostgresProvider) {
        this.provider = provider;
        this.lock = new MigrationLock(provider);
        this.tracker = new VersionTracker(provider);
        this.seedRunner = new SeedRunner(provider);
    }

    async runSystemMigrations(): Promise<void> {
        Logger.info("Running system database migrations...");

        const client = this.provider.getSystemClient();

        // Ensure _migration_versions exists
        await client.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "_migration_versions" (
                                                                 id SERIAL PRIMARY KEY,
                                                                 version TEXT NOT NULL UNIQUE,
                                                                 applied_at TIMESTAMPTZ DEFAULT NOW()
                );
        `);

        const migrationsRoot = path.resolve(
            path.dirname(require.resolve("@repo/db-helper/package.json")),
            "prisma/system/migrations"
        );

        if (!fs.existsSync(migrationsRoot)) {
            Logger.warn(`System migration folder not found: ${migrationsRoot}`);
            return;
        }

        const migrationDirs = fs
            .readdirSync(migrationsRoot)
            .filter(dir => fs.statSync(path.join(migrationsRoot, dir)).isDirectory())
            .sort();

        // Fetch applied versions
        const appliedVersions = (await client.$queryRawUnsafe<{ version: string }[]>(`
        SELECT version FROM "_migration_versions";
    `)).map(v => v.version);

        for (const dir of migrationDirs) {
            if (appliedVersions.includes(dir)) continue;

            const sqlFile = path.join(migrationsRoot, dir, "migration.sql");
            if (!fs.existsSync(sqlFile)) {
                throw new Error(`Missing migration.sql in ${dir}`);
            }

            const sql = fs.readFileSync(sqlFile, "utf-8");

            Logger.info(`Applying system migration [${dir}]...`);
            await client.$executeRawUnsafe(`
            BEGIN;
            SET search_path TO public;
            ${sql}
            COMMIT;
        `);

            // Mark migration applied
            await client.$executeRawUnsafe(`
            INSERT INTO "_migration_versions"(version)
            VALUES ('${dir}')
            ON CONFLICT DO NOTHING;
        `);
        }

        Logger.info("✅ System database migrations completed.");
    }


    /** Check if a table exists in the tenant database */
    private async tableExists(client: any, table: string): Promise<boolean> {
        const result = await client.$queryRawUnsafe(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = '${table.toLowerCase()}'
            ) AS "exists";
        `) as { exists: boolean }[];

        return result[0]?.exists ?? false;
    }


    /** Run all pending migrations and seed a tenant database */
    async runMigrations(tenantName: string): Promise<void> {
        Logger.info(`Running migrations for tenant: ${tenantName}`);

        await this.lock.acquire(tenantName);

        try {
            const client = await this.provider.getTenantConnection(tenantName);

            // 1️⃣ Ensure _migration_versions exists
            await client.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "_migration_versions" (
                id SERIAL PRIMARY KEY,
                version TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

            // 2️⃣ Correct migrations path inside db-helper package
            const migrationsRoot = path.resolve(
                path.dirname(require.resolve("@repo/db-helper/package.json")),
                "prisma/tenant/migrations"
            );

            Logger.info(`Looking for migrations at: ${migrationsRoot}`);

            if (!fs.existsSync(migrationsRoot)) {
                Logger.warn(`Migration folder not found: ${migrationsRoot}`);
                return;
            }

            // 3️⃣ Get timestamped migration directories
            const migrationDirs = fs
                .readdirSync(migrationsRoot)
                .filter(dir => fs.statSync(path.join(migrationsRoot, dir)).isDirectory())
                .sort();

            const appliedVersions = await this.tracker.getAppliedMigrations(tenantName);

            for (const dir of migrationDirs) {
                if (appliedVersions.includes(dir)) continue;

                const sqlFile = path.join(migrationsRoot, dir, "migration.sql");
                if (!fs.existsSync(sqlFile)) {
                    throw new Error(`Missing migration.sql in ${dir}`);
                }

                const sql = fs.readFileSync(sqlFile, "utf-8");
                const migration: TenantMigration = { version: dir, name: dir, sql };

                Logger.info(`Applying migration [${dir}] for tenant: ${tenantName}`);

                // 4️⃣ Apply SQL safely
                await client.$executeRawUnsafe(`
                BEGIN;
                SET search_path TO public;
                ${sql}
                COMMIT;
            `);

                // 5️⃣ Mark migration applied
                await this.tracker.markMigrationApplied(tenantName, dir);
            }

            // 6️⃣ After migrations, run seeds safely
            Logger.info(`Running seeds for tenant: ${tenantName}`);



        } finally {
            await this.lock.release(tenantName);
        }
    }

    // inside MigrationService class

    async runBlueGreenMigrations(tenantName: string): Promise<void> {
        Logger.info(`🟢 Running BLUE-GREEN migrations for tenant: ${tenantName}`);

        await this.lock.acquire(tenantName);

        try {
            const client = await this.provider.getTenantConnection(tenantName);

            // Ensure version table exists (blue schema initially == tenantName)
            await client.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "_migration_versions" (
                id SERIAL PRIMARY KEY,
                version TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

            const migrationsRoot = path.resolve(
                path.dirname(require.resolve("@repo/db-helper/package.json")),
                "prisma/tenant/migrations"
            );

            if (!fs.existsSync(migrationsRoot)) {
                Logger.warn(`Migration folder not found: ${migrationsRoot}`);
                return;
            }

            const migrationDirs = fs
                .readdirSync(migrationsRoot)
                .filter(dir => fs.statSync(path.join(migrationsRoot, dir)).isDirectory())
                .sort();

            const appliedVersions =
                await this.tracker.getAppliedMigrations(tenantName);

            for (const dir of migrationDirs) {
                if (appliedVersions.includes(dir)) continue;

                const sqlFile = path.join(migrationsRoot, dir, "migration.sql");
                if (!fs.existsSync(sqlFile)) {
                    throw new Error(`Missing migration.sql in ${dir}`);
                }

                const sql = fs.readFileSync(sqlFile, "utf-8");

                const migration: TenantMigration = {
                    version: dir,
                    name: dir,
                    sql,
                };

                Logger.info(
                    `🟢 Blue-green applying migration [${dir}] for tenant ${tenantName}`
                );

                await blueGreenMigrate(
                    this.provider,
                    tenantName,
                    migration
                );

                await this.tracker.markMigrationApplied(tenantName, dir);
            }

            // Optional: seed after swap
            Logger.info(`🌱 Running seeds after blue-green migration`);

            const roleExists = await this.tableExists(client, "Role");
            if (roleExists) {
                await this.seedRunner.seedTenant(tenantName, client);
            }
        } finally {
            await this.lock.release(tenantName);
        }
    }

    async getPendingMigrations(tenantName: string, validateFiles = true): Promise<string[]> {
        Logger.info(`Checking pending migrations for tenant: ${tenantName}`);

        try {
            // 1️⃣ Get migrations root path
            const migrationsRoot = path.resolve(
                path.dirname(require.resolve("@repo/db-helper/package.json")),
                "prisma/tenant/migrations"
            );

            // 2️⃣ Validate migrations folder
            if (!fs.existsSync(migrationsRoot)) {
                Logger.warn(`Migration folder not found: ${migrationsRoot}`);
                return [];
            }

            // 3️⃣ Read migration directories
            const allDirs = fs.readdirSync(migrationsRoot);
            const migrationDirs = allDirs
                .filter(dir => {
                    const fullPath = path.join(migrationsRoot, dir);
                    return fs.statSync(fullPath).isDirectory();
                })
                .sort();

            if (migrationDirs.length === 0) {
                Logger.info(`No migration directories found in: ${migrationsRoot}`);
                return [];
            }

            // 4️⃣ Get applied migrations
            let appliedVersions: string[] = [];
            try {
                appliedVersions = await this.tracker.getAppliedMigrations(tenantName);
            } catch (error) {
                // If we can't get applied versions, assume none are applied
                Logger.warn(`Could not retrieve applied migrations for ${tenantName}, assuming none applied:`, error);
            }

            // 5️⃣ Filter and validate pending migrations
            const pendingMigrations: string[] = [];

            for (const dir of migrationDirs) {
                if (!appliedVersions.includes(dir)) {
                    if (validateFiles) {
                        const sqlFile = path.join(migrationsRoot, dir, "migration.sql");
                        if (!fs.existsSync(sqlFile)) {
                            Logger.warn(`Skipping migration ${dir}: missing migration.sql file`);
                            continue;
                        }
                    }
                    pendingMigrations.push(dir);
                }
            }

            // 6️⃣ Log results
            if (pendingMigrations.length === 0) {
                Logger.info(`✅ No pending migrations for tenant: ${tenantName}`);
            } else {
                Logger.info(`📋 Found ${pendingMigrations.length} pending migrations for ${tenantName}:`);
                pendingMigrations.forEach((migration, index) => {
                    Logger.info(`  ${index + 1}. ${migration}`);
                });
            }

            return pendingMigrations;
        } catch (error) {
            Logger.error(`❌ Failed to get pending migrations for tenant ${tenantName}:`, error);
            throw error;
        }
    }

    // You could create a new class or add these methods to MigrationService
    async getMigrationStatus(tenantName: string): Promise<{
        applied: string[];
        pending: string[];
        total: number;
        isUpToDate: boolean;
    }> {
        const migrationsRoot = path.resolve(
            path.dirname(require.resolve("@repo/db-helper/package.json")),
            "prisma/tenant/migrations"
        );

        if (!fs.existsSync(migrationsRoot)) {
            return {
                applied: [],
                pending: [],
                total: 0,
                isUpToDate: true
            };
        }

        const allMigrations = fs
            .readdirSync(migrationsRoot)
            .filter(dir => fs.statSync(path.join(migrationsRoot, dir)).isDirectory())
            .sort();

        const appliedVersions = await this.tracker.getAppliedMigrations(tenantName);
        const pendingMigrations = allMigrations.filter(dir => !appliedVersions.includes(dir));

        return {
            applied: appliedVersions,
            pending: pendingMigrations,
            total: allMigrations.length,
            isUpToDate: pendingMigrations.length === 0
        };
    }

}
