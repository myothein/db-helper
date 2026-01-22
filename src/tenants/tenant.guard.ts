// packages/db-helper/src/tenants/tenant.guard.ts

import { Tenant } from "./tenant.types";

export const assertTenantActive = (tenant: Tenant) => {
    if (!tenant.isActive) {
        throw new Error(`Tenant "${tenant.name}" is suspended`);
    }
};
