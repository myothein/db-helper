// packages/db-helper/src/core/connection.manager.ts

import { IDatabaseProvider, DBConnection } from "../providers/types";
import { Logger } from "../utils/logger";

export class ConnectionManager {
    private provider: IDatabaseProvider;
    private tenantClients: Map<string, DBConnection> = new Map();

    constructor(provider: IDatabaseProvider) {
        this.provider = provider;
    }

    /** Connect system DB */
    async connectSystem() {
        Logger.info("Connecting to system database...");
        await this.provider.connect();
    }

    /** Disconnect system DB */
    async disconnectSystem() {
        Logger.info("Disconnecting system database...");
        await this.provider.disconnect();
    }

    /** Get or create tenant connection */
    async getTenantClient(tenantName: string): Promise<DBConnection> {
        if (this.tenantClients.has(tenantName)) {
            return this.tenantClients.get(tenantName)!;
        }
        const client = await this.provider.getTenantConnection(tenantName);
        this.tenantClients.set(tenantName, client);
        return client;
    }

    /** Disconnect all tenant clients */
    async disconnectTenants() {
        for (const [tenantName, client] of this.tenantClients) {
            if (client.$disconnect) await client.$disconnect();
            Logger.info(`Disconnected tenant: ${tenantName}`);
        }
        this.tenantClients.clear();
    }
}
