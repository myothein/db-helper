// packages/db-helper/src/migrations/blue-green.ts

import { PostgresProvider } from "../providers/postgres.provider";
import { Logger } from "../utils/logger";

export type TenantMigration = {
    version: string;
    name: string;
    sql: string;
};

export async function blueGreenMigrate(
    provider: PostgresProvider,
    tenantName: string,
    migration: TenantMigration
): Promise<void> {
    const client = await provider.getTenantConnection(tenantName);

    const BLUE = tenantName;
    const GREEN = `${tenantName}__green`;
    const OLD = `${tenantName}__old`;

    Logger.info(
        `🚀 Blue-green migration started | tenant=${tenantName} | version=${migration.version}`
    );

    try {
        /* =========================
           0. Ensure clean state
        ========================= */
        await client.$executeRawUnsafe(
            `DROP SCHEMA IF EXISTS "${GREEN}" CASCADE`
        );

        /* =========================
           1. Create green schema
        ========================= */
        await client.$executeRawUnsafe(
            `CREATE SCHEMA "${GREEN}"`
        );

        /* =========================
           2. Clone table structures
        ========================= */
        const tables = await client.$queryRawUnsafe(
            `SELECT tablename FROM pg_tables WHERE schemaname = $1`,
            BLUE
        ) as { tablename: string }[];



        for (const { tablename } of tables) {
            await client.$executeRawUnsafe(`
                CREATE TABLE "${GREEN}"."${tablename}"
                (LIKE "${BLUE}"."${tablename}" INCLUDING ALL)
            `);

            // Optional (enable if you need data copy):
            // await client.$executeRawUnsafe(`
            //   INSERT INTO "${GREEN}"."${tablename}"
            //   SELECT * FROM "${BLUE}"."${tablename}"
            // `);
        }

        /* =========================
           3. Apply migration on green
        ========================= */
        Logger.info("📦 Applying migration on green schema");

        await client.$executeRawUnsafe(
            `SET search_path TO "${GREEN}"`
        );

        await client.$executeRawUnsafe(migration.sql);

        await client.$executeRawUnsafe(
            `SET search_path TO "${BLUE}"`
        );

        /* =========================
           4. Atomic schema swap
        ========================= */
        Logger.info("🔁 Swapping schemas");

        await client.$executeRawUnsafe(`
            BEGIN;
            ALTER SCHEMA "${BLUE}" RENAME TO "${OLD}";
            ALTER SCHEMA "${GREEN}" RENAME TO "${BLUE}";
            COMMIT;
        `);

        /* =========================
           5. Cleanup
        ========================= */
        await client.$executeRawUnsafe(
            `DROP SCHEMA IF EXISTS "${OLD}" CASCADE`
        );

        Logger.info(
            `✅ Blue-green migration completed | tenant=${tenantName} | version=${migration.version}`
        );
    } catch (error) {
        Logger.error(
            `❌ Blue-green migration failed | tenant=${tenantName}`,
            error
        );

        // Safety: restore search_path
        await client.$executeRawUnsafe(
            `SET search_path TO "${BLUE}"`
        ).catch(() => {});

        throw error;
    }
}
