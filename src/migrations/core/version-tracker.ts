// packages/db-helper/src/migrations/core/version-tracker.ts

import { PostgresProvider } from "../../providers/postgres.provider";

export type AppliedMigrationRow = {
    version: string;
    applied_at: Date;
};

export class VersionTracker {
    constructor(private readonly provider: PostgresProvider) {}

    /** Ensure migrations table exists */
    private async ensureTable(tenantName: string) {
        const client = await this.provider.getTenantConnection(tenantName);

        await client.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS _migrations (
                                                       version TEXT PRIMARY KEY,
                                                       applied_at TIMESTAMPTZ DEFAULT NOW()
                )
        `);
    }

    /** ✅ Return ONLY version strings (no row leaking) */
    async getAppliedMigrations(tenantName: string): Promise<string[]> {
        await this.ensureTable(tenantName);

        const client = await this.provider.getTenantConnection(tenantName);

        const rows = await client.$queryRaw<AppliedMigrationRow[]>`
            SELECT version, applied_at FROM _migrations
        `;

        return rows.map((r: AppliedMigrationRow) => r.version);
    }

    /** Mark migration as applied */
    async markMigrationApplied(
        tenantName: string,
        version: string
    ): Promise<void> {
        await this.ensureTable(tenantName);

        const client = await this.provider.getTenantConnection(tenantName);

        await client.$executeRawUnsafe(
            `INSERT INTO _migrations (version)
             VALUES ($1)
             ON CONFLICT DO NOTHING`,
            version
        );
    }
}
