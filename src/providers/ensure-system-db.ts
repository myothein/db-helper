import pg from "pg";
import { dbConfig } from "../config/db.config";
import { Logger } from "../utils/logger";

export async function ensureSystemDatabase(): Promise<void> {
    const { systemDatabaseUrl } = dbConfig;

    const url = new URL(systemDatabaseUrl);
    const dbName = url.pathname.slice(1);
    const defaultDb = "postgres"; // default DB for connection
    url.pathname = `/${defaultDb}`;

    const pool = new pg.Pool({
        host: url.hostname,
        port: parseInt(url.port || "5432", 10),
        user: url.username,
        password: url.password,
        database: defaultDb,
    });

    const client = await pool.connect();
    try {
        const res = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (res.rowCount === 0) {
            Logger.info(`System database "${dbName}" does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            Logger.info(`System database "${dbName}" created.`);
        } else {
            Logger.info(`System database "${dbName}" already exists.`);
        }
    } finally {
        client.release();
        await pool.end();
    }
}
