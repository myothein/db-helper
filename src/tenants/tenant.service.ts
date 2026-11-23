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
        // The old method persisted databaseUrl (including credentials) in the
        // system registry and reused existing tenants without authorization.
        // A reviewed secret-store registration workflow is still required.
        throw new Error('Legacy tenant registration disabled: provision via approved isolated workflow');
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
