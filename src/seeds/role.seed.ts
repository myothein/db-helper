import { Logger } from "../utils/logger";

export class RoleSeed {
    static async run(client: any) {
        const tableExists = await client.$queryRawUnsafe(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'role'
            ) AS "exists";
        `) as { exists: boolean }[];

        if (!tableExists[0]?.exists) {
            Logger.warn(`Skipping Role seed (table missing)`);
            return;
        }

        const now = new Date();
        await client.role.createMany({
            data: [
                { name: "ADMIN", createdAt: now, updatedAt: now },
                { name: "USER", createdAt: now, updatedAt: now },
                { name: "GUEST", createdAt: now, updatedAt: now },
            ],
            skipDuplicates: true,
        });

        Logger.info(`Roles seeded successfully`);
    }
}
