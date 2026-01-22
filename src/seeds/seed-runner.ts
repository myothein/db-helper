import { PostgresProvider } from "../providers/postgres.provider";
import { Logger } from "../utils/logger";

const SEED_ID = "initial_seed_v1";

export class SeedRunner {
    private provider: PostgresProvider;

    constructor(provider: PostgresProvider) {
        this.provider = provider;
    }

    /** Run seeds for system DB */
    async runSystem() {
        const client = this.provider.getSystemClient();
        Logger.info("Seeding system database...");

        const now = new Date();
        await client.tenant.createMany({
            data: [
                { id: "system", name: "system", databaseUrl: "", isActive: true, createdAt: now, updatedAt: now }
            ],
            skipDuplicates: true,
        });

        Logger.info("System database seeding completed.");
    }

    /** Run full seeds for a tenant */
    async run(tenantName: string, options?: { onlyMissing?: boolean }) {
        const client = await this.provider.getTenantConnection(tenantName);

        if (options?.onlyMissing) {
            const alreadySeeded = await this.isSeedApplied(client);
            if (alreadySeeded) {
                Logger.info(`Skipping seed for ${tenantName} (already applied)`);
                return;
            }
        }

        Logger.info(`Running seed for tenant: ${tenantName}`);

        await this.seedTenant(client, tenantName);
        await this.markSeedApplied(client);

        Logger.info(`✅ Seed completed for tenant: ${tenantName}`);
    }

    /** Full tenant seeding */
    private async seedTenant(client: any, tenantName: string) {
        await this.seedRoles(client, tenantName);
        await this.seedSettings(client, tenantName);
        await this.seedUsers(client, tenantName);
    }

    /* =========================
       Seed History
    ========================= */
    private async isSeedApplied(client: any): Promise<boolean> {
        const existing = await client.seedHistory.findUnique({
            where: { name: SEED_ID },
            select: { id: true },
        });
        return !!existing;
    }

    private async markSeedApplied(client: any) {
        // Ensure seed_history table exists (optional)
        const tableExists = await this.tableExists(client, "seed_history");
        if (!tableExists) {
            Logger.info("Creating seed_history table...");
            await client.$executeRawUnsafe(`
                CREATE TABLE seed_history (
                                              id UUID PRIMARY KEY,
                                              name TEXT NOT NULL UNIQUE,
                                              checksum TEXT NOT NULL DEFAULT '',
                                              applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            `);
        }

        // Upsert seed record so it never fails on duplicate
        await client.seedHistory.upsert({
            where: { name: SEED_ID },
            update: {
                appliedAt: new Date(), // refresh timestamp if re-run
            },
            create: {
                name: SEED_ID,
                checksum: "",
            },
        });
    }

    /* =========================
       Individual Seeds
    ========================= */
    private async seedRoles(client: any, tenantName: string) {
        if (!(await this.tableExists(client, "role"))) {
            Logger.warn(`Skipping Role seed (table missing) for ${tenantName}`);
            return;
        }

        const now = new Date();
        await client.role.createMany({
            data: [
                { name: "ADMIN", createdAt: now, updatedAt: now },
                { name: "USER", createdAt: now, updatedAt: now },
                { name: "GUEST", createdAt: now, updatedAt: now },
            ],
            skipDuplicates: true,
        });

        Logger.info(`Roles seeded for ${tenantName}`);
    }

    private async seedSettings(client: any, tenantName: string) {
        if (!(await this.tableExists(client, "setting"))) {
            Logger.warn(`Skipping Setting seed (table missing) for ${tenantName}`);
            return;
        }

        const now = new Date();
        await client.setting.createMany({
            data: [
                { key: "theme", value: "light", createdAt: now, updatedAt: now },
                { key: "notifications", value: "enabled", createdAt: now, updatedAt: now },
            ],
            skipDuplicates: true,
        });

        Logger.info(`Settings seeded for ${tenantName}`);
    }

    private async seedUsers(client: any, tenantName: string) {
        if (!(await this.tableExists(client, "user"))) {
            Logger.warn(`Skipping User seed (table missing) for ${tenantName}`);
            return;
        }

        // Fetch ADMIN role
        const adminRole = await client.role.findUnique({
            where: { name: "ADMIN" },
            select: { id: true },
        });

        if (!adminRole) {
            Logger.warn(`ADMIN role missing for ${tenantName}, skipping user seed`);
            return;
        }

        const now = new Date();
        await client.user.createMany({
            data: [
                {
                    username: "admin",
                    roleId: adminRole.id,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            skipDuplicates: true,
        });

        Logger.info(`Admin user seeded for ${tenantName}`);
    }

    /** Check if table exists */
    private async tableExists(client: any, tableName: string): Promise<boolean> {
        const result = await client.$queryRaw<{ exists: boolean }[]>`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = ${tableName.toLowerCase()}
            ) AS "exists";
        `;
        return result[0]?.exists ?? false;
    }
}
