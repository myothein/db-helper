// packages/db-helper/src/jobs/background-migration.job.ts

import { MigrationService } from "../migrations/core/migration.service";
import { TenantService } from "../tenants/tenant.service";
import { Logger } from "../utils/logger";

export class BackgroundMigrationJob {
    private migrationService: MigrationService;
    private tenantService: TenantService;
    private intervalMs: number;

    constructor(migrationService: MigrationService, tenantService: TenantService, intervalMs: number = 60000) {
        this.migrationService = migrationService;
        this.tenantService = tenantService;
        this.intervalMs = intervalMs;
    }

    /** Start the background job to run pending migrations periodically */
    start() {
        Logger.info("Starting background migration job...");
        setInterval(async () => {
            try {
                const tenants = await this.tenantService.listTenants();
                for (const tenant of tenants) {
                    try {
                        await this.migrationService.runMigrations(tenant.name);
                        Logger.info(`Background migration completed for tenant: ${tenant.name}`);
                    } catch (err) {
                        Logger.error(`Migration failed for tenant: ${tenant.name}`, err);
                    }
                }
            } catch (err) {
                Logger.error("Failed to fetch tenants for background migration", err);
            }
        }, this.intervalMs);
    }
}
