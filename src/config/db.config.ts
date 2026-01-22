import dotenv from "dotenv";
dotenv.config();

/** Multi-server per tenant configuration */
export interface TenantDBConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

/** Main database configuration */
export interface DBConfig {
    systemDatabaseUrl: string;
    defaultTenantDatabaseUrlTemplate: string;
    maxConnections: number;
    logQueries: boolean;
    tenantDatabases?: Record<string, TenantDBConfig>;
}

export const dbConfig: DBConfig = {
    systemDatabaseUrl:
        process.env.SYSTEM_DATABASE_URL ||
        "postgresql://admin:1234@localhost:5432/system_db",
    defaultTenantDatabaseUrlTemplate:
        process.env.DEFAULT_TENANT_DB_URL_TEMPLATE ||
        "postgresql://admin:1234@localhost:5432/{tenant}?schema=public",
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "10", 10),
    logQueries: process.env.DB_LOG_QUERIES === "true" || false,
    tenantDatabases: process.env.TENANT_DATABASES
        ? JSON.parse(process.env.TENANT_DATABASES)
        : undefined,
};
