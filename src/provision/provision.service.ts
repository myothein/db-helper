// packages/db-helper/src/provision/provision.service.ts
import { PostgresProvider } from "../providers/postgres.provider";
import { MigrationService } from "../migrations/core/migration.service";
import { Logger } from "../utils/logger";
import fs from "fs";
import path from "path";

export class ProvisionService {
    private provider: PostgresProvider;
    private migrationService: MigrationService;

    constructor(provider: PostgresProvider) {
        this.provider = provider;
        this.migrationService = new MigrationService(provider);
    }

    /**
     * Provision a tenant:
     * 1. Ensure DB exists
     * 2. Run migrations
     * 3. Run seed scripts
     */
    async provisionTenant(tenantName: string) {
        Logger.info(`Provisioning tenant: ${tenantName}`);

        // 1️⃣ Connect and ensure tenant DB exists
        const tenantClient = await this.provider.getTenantConnection(tenantName);

        // 2️⃣ Run migrations
        Logger.info(`Running migrations for tenant: ${tenantName}`);
        await this.migrationService.runMigrations(tenantName);

        // 3️⃣ Run seeds
        Logger.info(`Running seed scripts for tenant: ${tenantName}`);
        await this.runTenantSeed(tenantName, tenantClient);

        Logger.info(`Tenant "${tenantName}" provisioned successfully.`);
    }

    /** Run seed SQL or Prisma scripts for a tenant */
    private async runTenantSeed(tenantName: string, tenantClient: any) {
        const seedsDir = path.resolve(__dirname, "../../prisma/tenant/seeds");
        if (!fs.existsSync(seedsDir)) {
            Logger.warn(`No tenant seeds folder found at ${seedsDir}`);
            return;
        }

        const files = fs.readdirSync(seedsDir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));

        for (const file of files) {
            Logger.info(`Running seed [${file}] for tenant: ${tenantName}`);
            const seedModule = await import(path.join(seedsDir, file));

            if (typeof seedModule.default === "function") {
                // Pass the Prisma client for this tenant
                await seedModule.default(tenantClient);
            } else {
                Logger.warn(`Seed file ${file} does not export a default function.`);
            }
        }
    }
}
