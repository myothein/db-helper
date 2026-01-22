// packages/db-helper/src/core/prisma.system.ts

import { PrismaClient } from "../../generated/system";
import { dbConfig } from "../config/db.config";
import { Logger } from "../utils/logger";

let systemClient: PrismaClient | null = null;

/**
 * Get the singleton system PrismaClient
 */
export const getSystemPrisma = (): PrismaClient => {
    if (!systemClient) {
        systemClient = new PrismaClient({
            log: dbConfig.logQueries ? ["query", "info", "warn", "error"] : ["warn", "error"],
        });
        Logger.info("System PrismaClient initialized");
    }
    return systemClient;
};

/**
 * Connect the system DB (if not already connected)
 */
export const connectSystem = async (): Promise<void> => {
    const client = getSystemPrisma();
    await client.$connect();
    Logger.info("Connected to system database");
};

/**
 * Disconnect the system DB (for graceful shutdown)
 */
export const disconnectSystem = async (): Promise<void> => {
    if (systemClient) {
        await systemClient.$disconnect();
        Logger.info("Disconnected system database");
        systemClient = null;
    }
};
