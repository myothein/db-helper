#!/usr/bin/env node
import { spawn } from "child_process";
import dotenv from "dotenv";
import { dbHelper } from "./lib/db.helper";

dotenv.config();

async function openTenantStudio(tenantName: string) {
    // 1️⃣ Ensure system DB is connected
    await dbHelper.getProvider().connect();

    // 2️⃣ Get tenant
    const tenants = await dbHelper.listTenants();
    const tenant = tenants.find(t => t.name === tenantName);

    if (!tenant) {
        console.error(`Tenant "${tenantName}" not found.`);
        process.exit(1);
    }

    const tenantDbUrl = tenant.databaseUrl;
    console.log(`[INFO] Opening Prisma Studio for tenant: ${tenantName}`);
    console.log(`[INFO] DB URL: ${tenantDbUrl}`);

    // 3️⃣ Launch Prisma Studio
    const studio = spawn(
        "npx",
        ["prisma", "studio", "--url", tenantDbUrl],
        { stdio: "inherit", shell: true }
    );

    studio.on("exit", code => process.exit(code || 0));
}


// CLI args
const tenantName = process.argv[2];
if (!tenantName) {
    console.error("Usage: pnpm db-helper-studio <tenantName>");
    process.exit(1);
}

openTenantStudio(tenantName);
