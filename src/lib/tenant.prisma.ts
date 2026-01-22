// packages/db-helper/src/lib/tenant-prisma.ts
import pg from "pg";
import { dbConfig } from "../config/db.config";
import { createTenantDatabase } from "../providers/create-tenant-db";
import { Logger } from "../utils/logger";

/**
 * Returns a PostgreSQL pool connected to the given tenant database.
 * Ensures the tenant database exists before connecting.
 */
export async function getTenantPool(tenantName: string): Promise<pg.Pool> {
    // 1️⃣ Ensure tenant database exists
    await createTenantDatabase(tenantName);

    // 2️⃣ Build tenant database URL
    const databaseUrl = dbConfig.defaultTenantDatabaseUrlTemplate.replace(
        "{tenant}",
        tenantName
    );
    const url = new URL(databaseUrl);

    // 3️⃣ Create a Postgres connection pool
    const pool = new pg.Pool({
        host: url.hostname,
        port: parseInt(url.port || "5432", 10),
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // remove leading '/'
        max: dbConfig.maxConnections,
    });

    // 4️⃣ Test connection
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
        Logger.info(`[PG] Connected to tenant database: ${tenantName}`);
    } finally {
        client.release();
    }

    return pool;
}

/**
 * Helper to run a function with a tenant Postgres pool and auto-release.
 */
export async function withTenantPool<T>(
    tenantName: string,
    fn: (pool: pg.Pool) => Promise<T>
): Promise<T> {
    const pool = await getTenantPool(tenantName);
    try {
        return await fn(pool);
    } finally {
        await pool.end();
        Logger.info(`[PG] Disconnected tenant pool: ${tenantName}`);
    }
}
