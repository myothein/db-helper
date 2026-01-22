import { TenantService } from "../tenants/tenant.service";
import { PostgresProvider } from "../providers/postgres.provider";
import { Logger } from "../utils/logger";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

export class TenantBackupService {
    constructor(
        private readonly provider: PostgresProvider,
        private readonly tenantService: TenantService
    ) {}

    async backupTenant(tenantName: string): Promise<string> {
        Logger.info(`Backing up tenant: ${tenantName}`);

        const tenant = await this.tenantService.getTenantByName(tenantName);
        if (!tenant) {
            throw new Error(`Tenant "${tenantName}" not found`);
        }

        if (!tenant.databaseUrl) {
            throw new Error(`Tenant "${tenantName}" has no databaseUrl`);
        }

        const backupDir = path.resolve("backups");
        fs.mkdirSync(backupDir, { recursive: true });

        const backupFile = path.join(
            backupDir,
            `${tenantName}_${Date.now()}.sql`
        );

        const url = new URL(tenant.databaseUrl);

        const cmd = [
            "pg_dump",
            `-h ${url.hostname}`,
            `-p ${url.port || 5432}`,
            `-U ${url.username}`,
            `-d ${url.pathname.replace("/", "")}`,
            `-f "${backupFile}"`
        ].join(" ");

        Logger.info(`Backing up tenant "${tenantName}" → ${backupFile}`);

        await new Promise<void>((resolve, reject) => {
            exec(
                cmd,
                { env: { ...process.env, PGPASSWORD: url.password } },
                (err) => (err ? reject(err) : resolve())
            );
        });

        return backupFile;
    }
}
