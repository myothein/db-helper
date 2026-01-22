// packages/db-helper/src/tenants/tenant.provision.ts

import { TenantService } from "./tenant.service";
import { MigrationService } from "../migrations/core/migration.service";
import { SeedRunner } from "../seeds/seed-runner";

export class TenantProvisioner {
    private tenantService: TenantService;
    private migrationService: MigrationService;
    private seedRunner: SeedRunner;

    constructor(tenantService: TenantService, migrationService: MigrationService, seedRunner: SeedRunner) {
        this.tenantService = tenantService;
        this.migrationService = migrationService;
        this.seedRunner = seedRunner;
    }

    async provisionTenant(name: string) {
        const tenant = await this.tenantService.createTenant(name);
        await this.migrationService.runMigrations(tenant.name);
        await this.seedRunner.run(tenant.name);
        return tenant;
    }
}
