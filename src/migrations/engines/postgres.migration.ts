// packages/db-helper/src/migrations/engines/postgres.migration.ts

import { PostgresProvider } from "../../providers/postgres.provider";

export const runPostgresMigration = async (provider: PostgresProvider, tenantName: string, sql: string) => {
    const client = await provider.getTenantConnection(tenantName);
    await client.$executeRawUnsafe(sql);
};
