import { Logger } from "../utils/logger";

export class UserSeed {
    static async run(client: any) {
        const tableExists = await client.$queryRawUnsafe(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'user'
            ) AS "exists";
        `) as { exists: boolean }[];

        if (!tableExists[0]?.exists) {
            Logger.warn(`Skipping User seed (table missing)`);
            return;
        }

        const adminRole = await client.role.findUnique({
            where: { name: "ADMIN" },
            select: { id: true },
        });

        if (!adminRole) {
            Logger.warn(`ADMIN role missing, skipping user seed`);
            return;
        }

        const now = new Date();
        await client.user.createMany({
            data: [
                {
                    username: "admin",
                    roleId: adminRole.id,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            skipDuplicates: true,
        });

        Logger.info(`Admin user seeded successfully`);
    }
}
