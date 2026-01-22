// packages/db-helper/examples/postgres.ts

import { dbHelper } from "../lib/db.helper";

(async () => {
    console.log("=== PostgreSQL Example ===");

    // Health check
    const health = await dbHelper.checkHealth();
    console.log("System DB Health:", health);

    // Provision a new tenant
    const tenant = await dbHelper.provisionTenant("tenant_pg");
    console.log("Created Tenant:", tenant);

    // List tenants
    const tenants = await dbHelper.listTenants();
    console.log("All Tenants:", tenants);

    // Run a tenant migration
    await dbHelper.migrateTenant("tenant_pg");

    // Run seeds


    // Suspend / Resume
    await dbHelper.suspendTenant("tenant_pg");
    await dbHelper.resumeTenant("tenant_pg");

    console.log("PostgreSQL example finished.");
})();
