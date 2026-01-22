// packages/db-helper/src/tenants/tenant.types.ts

export interface Tenant {
    id: string;
    name: string;
    databaseUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type TenantStatus = "active" | "suspended";
