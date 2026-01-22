// packages/db-helper/src/providers/sqlite.provider.ts

import { DatabaseProvider } from "./database.provider";

export class SQLiteProvider extends DatabaseProvider {
    async connect(): Promise<void> {
        throw new Error("SQLiteProvider not implemented yet");
    }
    async disconnect(): Promise<void> {
        throw new Error("SQLiteProvider not implemented yet");
    }
    async execute(query: string, params?: any[]): Promise<any> {
        throw new Error("SQLiteProvider not implemented yet");
    }
    async getTenantConnection(tenantName: string): Promise<any> {
        throw new Error("SQLiteProvider not implemented yet");
    }
}
