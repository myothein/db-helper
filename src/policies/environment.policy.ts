// packages/db-helper/src/policies/environment.policy.ts

import { DatabaseError } from "../errors/database.error";

export function enforceEnvironmentPolicy(operation: string): void {
    const env = process.env.NODE_ENV ?? "development";

    if (env === "production") {
        throw new DatabaseError(
            `Operation "${operation}" is not allowed in production environment`
        );
    }
}
