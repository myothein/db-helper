// packages/db-helper/src/providers/database.provider.ts

import { IDatabaseProvider } from "./types";

export abstract class DatabaseProvider implements IDatabaseProvider {
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract execute(query: string, params?: any[]): Promise<any>;
    abstract getTenantConnection(tenantName: string): Promise<any>;
}
