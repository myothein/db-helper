import { PostgresProvider } from "../providers/postgres.provider";
import { validateTenantName } from "../security/tenant-guards";
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
        validateTenantName(name);
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
        validateTenantName(name);
        // Historical implementation interpolated untrusted identifiers and dropped
        // databases without a reviewed restore; preserve data until a safe release.
        throw new Error("Destructive tenant drop disabled pending verified backup/restore and approval");
    }
}
