import { PostgresProvider } from "../providers/postgres.provider";
import { Logger } from "../utils/logger";
import { RoleSeed } from "./role.seed";
import { UserSeed } from "./user.seed";
import { SettingSeed } from "./setting.seed";
import { NotificationSeed } from "./notification.seed";

const SEED_ID = "initial_seed_v1";

export class SeedRunner {
    private provider: PostgresProvider;

    constructor(provider: PostgresProvider) {
        this.provider = provider;
    }

    async run(tenantName: string, options?: { onlyMissing?: boolean }) {
        const client = await this.provider.getTenantConnection(tenantName);

        if (options?.onlyMissing && await this.isSeedApplied(client)) {
            Logger.info(`Skipping seed for ${tenantName} (already applied)`);
            return;
        }

        Logger.info(`Running seeds for tenant: ${tenantName}`);

        await RoleSeed.run(client);
        await SettingSeed.run(client);
        await UserSeed.run(client);
        await NotificationSeed.run(client);

        await this.markSeedApplied(client);

        Logger.info(`✅ All seeds completed for tenant: ${tenantName}`);
    }

    private async isSeedApplied(client: any): Promise<boolean> {
        const result = await client.$queryRawUnsafe(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'seed_history'
            ) AS "exists";
        `) as { exists: boolean }[];

        if (!result[0]?.exists) return false;

        const applied = await client.$queryRawUnsafe(`
            SELECT 1 FROM seed_history WHERE name = '${SEED_ID}'
        `);
        return Array.isArray(applied) && applied.length > 0;
    }

    private async markSeedApplied(client: any) {
        await client.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS seed_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                checksum TEXT NOT NULL DEFAULT '',
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await client.$executeRawUnsafe(`
            INSERT INTO seed_history (id, name, checksum)
            VALUES (gen_random_uuid(), '${SEED_ID}', 'role, setting, user, notification seed')
            ON CONFLICT DO NOTHING
        `);
    }
}
