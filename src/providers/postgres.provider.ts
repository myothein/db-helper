import { validateTenantName } from "../security/tenant-guards";
// packages/db-helper/src/providers/postgres.provider.ts

import { PrismaClient as SystemPrismaClient } from "../../generated/system";
import { PrismaClient as TenantPrismaClient } from "../../generated/tenant";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DatabaseProvider } from "./database.provider";
import { IDatabaseProvider, DBConnection } from "./types";
import { dbConfig } from "../config/db.config";
import { Logger } from "../utils/logger";

/**
 * PostgresProvider handles:
 * - System DB connection
 * - Tenant DB connections
 */
export class PostgresProvider
    extends DatabaseProvider
    implements IDatabaseProvider
{
    private systemClient?: SystemPrismaClient;
    private tenantClients = new Map<string, TenantPrismaClient>();

    /* ============================
       System DB
    ============================ */

    async connect(): Promise<void> {
        if (this.systemClient) return;

        if (!dbConfig.systemDatabaseUrl) throw new Error("SYSTEM_DATABASE_URL is not configured");
        Logger.info("Connecting system database...");

        const pool = new Pool({
            connectionString: dbConfig.systemDatabaseUrl,
            max: dbConfig.maxConnections,
        });

        const adapter = new PrismaPg(pool);

        this.systemClient = new SystemPrismaClient({
            adapter,
            log: dbConfig.logQueries ? ["query", "info", "warn", "error"] : ["warn","error"],
        });

        await this.systemClient.$connect();
        Logger.info("System database connected.");
    }

    async disconnect(): Promise<void> {
        if (this.systemClient) {
            await this.systemClient.$disconnect();
            this.systemClient = undefined;
        }

        for (const client of this.tenantClients.values()) {
            await client.$disconnect();
        }
        this.tenantClients.clear();
    }

    getSystemClient(): SystemPrismaClient {
        if (!this.systemClient) {
            throw new Error("System PrismaClient is not connected.");
        }
        return this.systemClient;
    }

    async execute(query: string, params: any[] = []): Promise<number> {
        await this.connect();
        return this.getSystemClient().$executeRawUnsafe(query, ...params);
    }

    /* ============================
       Tenant DB
    ============================ */
    /** Return the full tenant database URL */
    getTenantDatabaseUrl(tenantName: string): string {
        validateTenantName(tenantName);
        if (!dbConfig.defaultTenantDatabaseUrlTemplate ||
            !dbConfig.defaultTenantDatabaseUrlTemplate.includes("{tenant}")) {
            throw new Error("DEFAULT_TENANT_DB_URL_TEMPLATE is not configured");
        }
        return dbConfig.defaultTenantDatabaseUrlTemplate.replace("{tenant}", tenantName);
    }

    async getTenantConnection(tenantName: string): Promise<DBConnection> {
        if (this.tenantClients.has(tenantName)) {
            return this.tenantClients.get(tenantName)!;
        }

        // Build tenant DB URL from template (uses real password from .env)
        const tenantUrl = this.getTenantDatabaseUrl(tenantName);

        // Log full URL (shows actual password)
        Logger.info(`Connecting tenant database: ${tenantName}`);

        // Ensure tenant DB exists before connecting
        await this.ensureTenantExists(tenantUrl, tenantName);

        const pool = new Pool({
            connectionString: tenantUrl,
            max: dbConfig.maxConnections,
        });

        const adapter = new PrismaPg(pool);

        const tenantClient = new TenantPrismaClient({
            adapter,
            log: dbConfig.logQueries ? ["query","info","warn","error"] : ["warn","error"],
        } as any);

        await tenantClient.$connect();
        this.tenantClients.set(tenantName, tenantClient);

        return tenantClient;
    }

    async disconnectTenant(tenantName: string): Promise<void> {
        const client = this.tenantClients.get(tenantName);
        if (!client) return;

        await client.$disconnect();
        this.tenantClients.delete(tenantName);
        Logger.info(`Tenant database disconnected: ${tenantName}`);
    }

    /** Ensure tenant DB exists before Prisma connects */
    private async ensureTenantExists(url: string, tenantName: string) {
        const parsed = new URL(url);
        const defaultDb = "postgres"; // connect to default DB to check
        const pool = new Pool({
            host: parsed.hostname,
            port: parseInt(parsed.port || "5432", 10),
            user: parsed.username,
            password: parsed.password,
            database: defaultDb,
        });

        const dbName = parsed.pathname.replace(/^\//, "");
        if (dbName !== tenantName) throw new Error("Tenant database name mismatch");
        validateTenantName(dbName);
        const client = await pool.connect();

        try {
            const res = await client.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [dbName]
            );

            if (res.rowCount === 0) {
                throw new Error("Tenant database is missing; automatic creation is disabled");
            }
        } finally {
            client.release();
            await pool.end();
        }
    }


    /**
     * Execute raw SQL on a tenant database
     * @param tenantName - tenant database name
     * @param query - SQL query
     * @param params - query parameters
     */
    async executeTenant(tenantName: string, query: string, params: any[] = []): Promise<any> {
        const client = await this.getTenantConnection(tenantName);
        // Use $queryRawUnsafe for raw SQL
        return client.$queryRawUnsafe(query, ...params);
    }

}
