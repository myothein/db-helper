import { Logger } from "../utils/logger";

export class NotificationSeed {
    static async run(client: any) {
        const tableExists = await client.$queryRawUnsafe(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'notification'
            ) AS "exists";
        `) as { exists: boolean }[];

        if (!tableExists[0]?.exists) {
            Logger.warn(`Skipping Notification seed (table missing)`);
            return;
        }

        Logger.info(`Notification seed ready (no default data added)`);
    }
}
