export interface TenantStatus {
    name: string;
    existsInSystemDb: boolean;
    isActive?: boolean;

    database: {
        exists: boolean;
        canConnect: boolean;
    };

    migrations: {
        applied: boolean;
        currentVersion?: string;
    };
}
