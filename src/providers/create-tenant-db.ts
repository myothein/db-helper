import pg from "pg";
import { dbConfig } from "../config/db.config";
import { Logger } from "../utils/logger";

export async function createTenantDatabase(tenantName: string): Promise<void> {
    const url = new URL(dbConfig.systemDatabaseUrl);

    const adminDb = "postgres";
    url.pathname = `/${adminDb}`;

    const pool = new pg.Pool({
        host: url.hostname,
        port: parseInt(url.port || "5432", 10),
        user: url.username,
        password: url.password,
        database: adminDb,
    });

    const client = await pool.connect();

    try {
        const res = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [tenantName]
        );

        if (res.rowCount === 0) {
            Logger.info(`Creating tenant database "${tenantName}"`);
            await client.query(`CREATE DATABASE "${tenantName}"`);
            Logger.info(`Tenant database "${tenantName}" created`);
        } else {
            Logger.info(`Tenant database "${tenantName}" already exists`);
        }
    } finally {
        client.release();
        await pool.end();
    }
}
