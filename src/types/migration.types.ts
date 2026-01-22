// packages/db-helper/src/types/migration.types.ts

export interface Migration {
    version: string;
    name: string;
    appliedAt?: Date;
}

export type MigrationStatus = "pending" | "applied" | "failed";
