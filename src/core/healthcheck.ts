// packages/db-helper/src/core/healthcheck.ts

import { IDatabaseProvider } from "../providers/types";
import { Logger } from "../utils/logger";

export const healthcheck = async (provider: IDatabaseProvider): Promise<{ status: string }> => {
    try {
        await provider.connect();
        Logger.info("Database connection healthy.");
        return { status: "healthy" };
    } catch (err: any) {
        Logger.error("Database health check failed", err);
        return { status: "unhealthy" };
    }
};
