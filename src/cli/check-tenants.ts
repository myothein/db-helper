import { Command } from "commander";
import { PostgresProvider } from "../providers/postgres.provider";
import { Logger } from "../utils/logger";
import { TenantStatus } from "../../generated/system"; // import the enum

export function registerCheckTenants(program: Command) {
    program
        .command("check-tenants")
        .alias("tenant:check")
        .description("Check health of all tenant databases and update their status")
        .action(async () => {
            const provider = new PostgresProvider();

            try {
                await provider.connect();
                const prisma = provider.getSystemClient();

                const tenants = await prisma.tenant.findMany();
                Logger.info(`🔍 Checking ${tenants.length} tenants...\n`);

                // Table header
                console.log(
                    "Tenant".padEnd(15) +
                    "| isActive".padEnd(10) +
                    "| status".padEnd(12) +
                    "| tenant_status"
                );
                console.log("-".repeat(50));

                let ok = 0;
                let down = 0;

                for (const tenant of tenants) {
                    let tenant_status: TenantStatus;

                    // Skip suspended or dropped tenants
                    if (tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.DROPPED) {
                        tenant_status = TenantStatus.UNKNOWN; // mark skipped tenants as UNKNOWN
                        Logger.warn(`⏭️ Skipping ${tenant.name} (${tenant.status})`);
                    } else {
                        try {
                            const conn = await provider.getTenantConnection(tenant.name);
                            await conn.$queryRaw`SELECT 1`;
                            tenant_status = TenantStatus.ACTIVE;
                            ok++;
                        } catch (err: any) {
                            tenant_status = TenantStatus.DOWN;
                            down++;
                            Logger.error(`❌ ${tenant.name} DOWN: ${err?.message || err}`);
                        } finally {
                            await provider.disconnectTenant(tenant.name);
                        }
                    }

                    // Update tenant_status, lastHeartbeat, and lastError (if DOWN)
                    await prisma.tenant.update({
                        where: { id: tenant.id },
                        data: {
                            tenant_status,
                            lastHeartbeat: new Date(),
                            ...(tenant_status === TenantStatus.DOWN && { lastError: (tenant_status === TenantStatus.DOWN ? String((tenant as any).lastError || "Unknown error").slice(0, 500) : undefined) }),
                        },
                    });

                    console.log(
                        tenant.name.padEnd(15) +
                        `| ${tenant.isActive}`.padEnd(10) +
                        `| ${tenant.status}`.padEnd(12) +
                        `| ${tenant_status}`
                    );
                }

                console.log("\nSummary:");
                Logger.info(`✔️ Active tenants reachable: ${ok}`);
                Logger.info(`❌ Tenants DOWN: ${down}`);
            } catch (err) {
                Logger.error("check-tenants failed", err);
                process.exit(1);
            } finally {
                await provider.disconnect();
            }
        });
}
