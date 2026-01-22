// packages/db-helper/src/migrations/migration-lock.ts

import { PostgresProvider } from "../providers/postgres.provider";

export class MigrationLock {
    private provider: PostgresProvider;

    constructor(provider: PostgresProvider) {
        this.provider = provider;
    }

    async acquire(tenantName: string) {
        const client = await this.provider.getTenantConnection(tenantName);
        // Simple advisory lock using Postgres
        await client.$executeRawUnsafe(`SELECT pg_advisory_lock(hashtext('${tenantName}'))`);
    }

    async release(tenantName: string) {
        const client = await this.provider.getTenantConnection(tenantName);
        await client.$executeRawUnsafe(`SELECT pg_advisory_unlock(hashtext('${tenantName}'))`);
    }
}
