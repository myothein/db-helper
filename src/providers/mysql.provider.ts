// packages/db-helper/src/providers/mysql.provider.ts

import { DatabaseProvider } from "./database.provider";

export class MySQLProvider extends DatabaseProvider {
    async connect(): Promise<void> {
        throw new Error("MySQLProvider not implemented yet");
    }
    async disconnect(): Promise<void> {
        throw new Error("MySQLProvider not implemented yet");
    }
    async execute(query: string, params?: any[]): Promise<any> {
        throw new Error("MySQLProvider not implemented yet");
    }
    async getTenantConnection(tenantName: string): Promise<any> {
        throw new Error("MySQLProvider not implemented yet");
    }
}
