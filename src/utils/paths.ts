import path from "path";
import fs from "fs";

export function getDbHelperRoot(): string {
    return path.resolve(__dirname, "../../..");
}

function assertExists(p: string) {
    if (!fs.existsSync(p)) {
        throw new Error(`Path does not exist: ${p}`);
    }
    return p;
}

export function getSystemMigrationsPath(): string {
    return assertExists(
        path.join(getDbHelperRoot(), "prisma", "system", "migrations")
    );
}

export function getTenantMigrationsPath(): string {
    return assertExists(
        path.join(getDbHelperRoot(), "prisma", "tenant", "migrations")
    );
}
