// packages/db-helper/src/errors/migration.error.ts

export class MigrationError extends Error {
    constructor(message: string, public migrationVersion?: string, public originalError?: any) {
        super(message);
        this.name = "MigrationError";
        if (originalError) {
            this.stack = originalError.stack || this.stack;
        }
    }
}
