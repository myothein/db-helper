// packages/db-helper/src/core/prisma.tenant.ts

import { PrismaClient, Prisma } from "../../generated/tenant";
import { dbConfig } from "../config/db.config";
import { Logger } from "../utils/logger";

/**
 * Cache PrismaClient instances per tenant
 */
const tenantClients = new Map<string, PrismaClient>();

/**
 * Get a PrismaClient for a tenant
 * Reuses the client if already created
 */
export const getTenantPrisma = async (tenantName: string) => {
    if (tenantClients.has(tenantName)) return tenantClients.get(tenantName)!;

    const url = dbConfig.defaultTenantDatabaseUrlTemplate.replace("{tenant}", tenantName);
    process.env.TENANT_DATABASE_URL = url; // ✅ set env before client creation

    Logger.info(`Connecting tenant: ${tenantName}`);

    const client = new PrismaClient({
        log: dbConfig.logQueries ? ["query", "info", "warn", "error"] : ["warn", "error"],
    });

    await client.$connect();
    tenantClients.set(tenantName, client);

    Logger.info(`Tenant connected: ${tenantName}`);
    return client;
};


/**
 * Disconnect a single tenant PrismaClient
 */
export const disconnectTenantPrisma = async (tenantName: string): Promise<void> => {
    const client = tenantClients.get(tenantName);
    if (!client) return;

    Logger.info(`Disconnecting tenant DB: ${tenantName}`);
    await client.$disconnect();
    tenantClients.delete(tenantName);
};

/**
 * Disconnect all tenant PrismaClients
 * Use on application shutdown
 */
export const disconnectAllTenants = async (): Promise<void> => {
    for (const [tenantName, client] of tenantClients.entries()) {
        Logger.info(`Disconnecting tenant DB: ${tenantName}`);
        await client.$disconnect();
    }
    tenantClients.clear();
};
