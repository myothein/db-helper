import { Logger } from "../utils/logger";

export class SettingSeed {
    static async run(client: any) {
        const tableExists = await client.$queryRawUnsafe(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'setting'
            ) AS "exists";
        `) as { exists: boolean }[];

        if (!tableExists[0]?.exists) {
            Logger.warn(`Skipping Setting seed (table missing)`);
            return;
        }

        const now = new Date();
        await client.setting.createMany({
            data: [
                { key: "theme", value: "light", createdAt: now, updatedAt: now },
                { key: "notifications", value: "enabled", createdAt: now, updatedAt: now },
            ],
            skipDuplicates: true,
        });

        Logger.info(`Settings seeded successfully`);
    }
}
