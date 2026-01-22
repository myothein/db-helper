import { execSync } from "node:child_process";
import { PrismaClient } from "../../generated/system";
import { Logger } from "../utils/logger";

const prisma = new PrismaClient();

export async function initSystem() {
    Logger.info("Initializing system database...");

    try {
        // 1️⃣ Verify DB connectivity
        await prisma.$queryRaw`SELECT 1`;

        // 2️⃣ Ensure MigrationLock row exists
        await prisma.migrationLock.upsert({
            where: { id: 1 },
            update: {},
            create: { id: 1, locked: false },
        });

        // 3️⃣ Ensure SchemaVersion row exists
        const version = await prisma.schemaVersion.findUnique({
            where: { id: 1 },
        });

        if (!version) {
            await prisma.schemaVersion.create({
                data: {
                    id: 1,
                    version: "init",
                },
            });
        }

        Logger.success("System tables verified");

    } catch (err) {
        Logger.error("System DB initialization failed");
        throw err;
    } finally {
        await prisma.$disconnect();
    }

    // 4️⃣ Apply Prisma migrations (safe & idempotent)
    Logger.info("Applying system migrations...");

    execSync(
        "pnpm prisma migrate deploy --schema packages/prisma/system/schema.prisma",
        { stdio: "inherit" }
    );

    Logger.success("System database initialized successfully");
}
