import { validateTenantName } from '../security/tenant-guards';

/**
 * Legacy privileged provisioning previously interpolated tenant identifiers into
 * CREATE DATABASE. This public entry point must never mutate a live database
 * until operator approval, external secret-store credentials and audited
 * production provisioning exist.
 *
 * The QA-only PostgreSQL 17 implementation lives in
 * src/security/ci-tenant-provisioner.ts and is not exposed here.
 */
export async function createTenantDatabase(tenantName: string): Promise<never> {
    validateTenantName(tenantName);
    throw new Error('Legacy privileged tenant database creation is disabled pending audited provisioning');
}
