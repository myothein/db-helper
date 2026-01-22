// packages/db-helper/src/errors/tenant.error.ts

export class TenantError extends Error {
    constructor(message: string, public tenantName?: string, public originalError?: any) {
        super(message);
        this.name = "TenantError";
        if (originalError) {
            this.stack = originalError.stack || this.stack;
        }
    }
}
