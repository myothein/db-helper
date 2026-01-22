// packages/db-helper/src/errors/database.error.ts

export class DatabaseError extends Error {
    constructor(message: string, public originalError?: any) {
        super(message);
        this.name = "DatabaseError";
        if (originalError) {
            this.stack = originalError.stack || this.stack;
        }
    }
}
