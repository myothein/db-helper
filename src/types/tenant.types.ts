// packages/db-helper/src/types/tenant.types.ts

export interface TenantConfig {
    name: string;
    databaseUrl: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
