import { PostgresProvider } from "../providers/postgres.provider";
import { Tenant } from "./tenant.types";
import { dbConfig } from "../config/db.config";
import { Logger } from "../utils/logger";

export class TenantService {
    constructor(private readonly provider: PostgresProvider) {}

    /* ============================
       Query
    ============================ */

    async listTenants(): Promise<Tenant[]> {
        return this.provider.getSystemClient().tenant.findMany();
    }

    async getTenantByName(name: string): Promise<Tenant | null> {
        return this.provider.getSystemClient().tenant.findUnique({
            where: { name },
        });
    }

    /* ============================
       Create
    ============================ */

    async createTenant(name: string): Promise<Tenant> {
        const system = this.provider.getSystemClient();

        const existing = await system.tenant.findUnique({ where: { name } });
        if (existing) {
            Logger.info(`Tenant "${name}" already exists. Reusing.`);
            return existing;
        }

        const databaseUrl =
            dbConfig.defaultTenantDatabaseUrlTemplate.replace("{tenant}", name);

        // Create physical DB
        await this.provider.getTenantConnection(name);

        Logger.info(`Registering tenant "${name}" in system DB`);
        return system.tenant.create({
            data: {
                name,
                databaseUrl,
                isActive: true,
            },
        });
    }

    /* ============================
       Lifecycle
    ============================ */

    async suspendTenant(name: string): Promise<Tenant> {
        return this.provider.getSystemClient().tenant.update({
            where: { name },
            data: { isActive: false },
        });
    }

    /** Delete tenant record */
    async deleteTenantById(id: string): Promise<void> {
        await this.provider.getSystemClient().tenant.delete({
            where: { id },
        });
    }

    async resumeTenant(name: string): Promise<Tenant> {
        return this.provider.getSystemClient().tenant.update({
            where: { name },
            data: { isActive: true },
        });
    }

    /* ============================
       DROP TENANT (🔥 IMPORTANT)
    ============================ */

    async dropTenant(name: string): Promise<void> {
        const system = this.provider.getSystemClient();

        // 🔐 Safety guard
        if (name === "system_db" || name === "postgres") {
            throw new Error(`Refusing to drop protected database: ${name}`);
        }

        const tenant = await system.tenant.findUnique({ where: { name } });
        if (!tenant) {
            throw new Error(`Tenant "${name}" not found`);
        }

        Logger.warn(`Dropping tenant "${name}"`);

        // 1️⃣ Disconnect Prisma tenant client if exists
        await this.provider.disconnectTenant(name);

        // 2️⃣ Kill active connections
        await system.$executeRawUnsafe(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '${name}'
        `);

        // 3️⃣ Drop database
        await system.$executeRawUnsafe(
            `DROP DATABASE IF EXISTS "${name}"`
        );

        // 4️⃣ Remove tenant record
        await system.tenant.delete({
            where: { id: tenant.id },
        });

        Logger.info(`Tenant "${name}" dropped successfully`);
    }
}
