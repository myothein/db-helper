// packages/db-helper/src/providers/types.ts

export type DBConnection = any; // Can be PrismaClient or a raw DB client

export interface IDatabaseProvider {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    execute(query: string, params?: any[]): Promise<any>;
    getTenantConnection(tenantName: string): Promise<DBConnection>;
}
