# PostgreSQL 17 Tenant Isolation — Security Acceptance Evidence

**Date:** 2026-11-23 (Myanmar local)  
**Scope:** db-helper Draft PR #1, sandbox / GitHub-hosted ephemeral PostgreSQL only  
**Release classification:** **PRODUCTION NO-GO** — no production provisioner exposed.

## Real PostgreSQL 17 acceptance

Evidence: https://github.com/myothein/db-helper/actions/runs/45086012366

- Security unit tests + PostgreSQL 17 backup/restore + tenant isolation: **9/9 PASS**.
- GitHub CI created two separate databases `qa_isolation_a` / `qa_isolation_b`, each owned by a distinct, generated-password tenant login role.
- Role flags verified: no SUPERUSER, CREATEROLE, CREATEDB, REPLICATION or BYPASSRLS.
- Both tenant logins could create/read their own independent synthetic records, with differing content.
- The tenant A login attempting to connect to tenant B database, and tenant B to tenant A, were both **DENIED**.
- Unapproved SQL identifiers and duplicate role/database names are rejected before provisioning.
- Provisioning capability rejects execution outside specific GitHub CI, PostgreSQL 17 and disposable fixture conditions.
- **Important:** The test proves separate-database login isolation, not shared-database RLS or full cross-tenant API authorization.

## Production safety changes in draft

- `src/security/ci-tenant-provisioner.ts` is a **CI-only implementation**. It uses PostgreSQL's `format(%I)` for SQL identifiers and `format(%L)` for synthetic passwords, never concatenating untrusted input or passing credentials to a shell. It is not exported by the public DBHelper API.
- Legacy `createTenantDatabase` previously used raw database-name interpolation. It now fails closed instead of creating live databases.
- Legacy `TenantService.createTenant` is blocked until a credential-free metadata registry is designed. It previously stored a credential-bearing database URL in the central registry.
- Legacy reset/drop/restore/rotation paths remain blocked to protect existing tenants.

## Known gaps / requirements before production

1. Implement an independently reviewed production provisioning service with strong authorization, explicit operator approval, audit/event idempotency, and separation of control-plane from tenant runtime.
2. Use a protected secret store for tenant login credentials, with reference-only metadata rather than passwords/connection strings in the central tenants table. Rotate historical exposed credentials.
3. Provision roles and databases with least privileges, managed TLS, fixed schema/grants, separate deploy-time migration role and runtime login; do not use a PostgreSQL superuser in application code.
4. Design rollback/compensation for partially completed provisioning, avoiding silent orphan roles/databases. Test concurrent requests and name collisions.
5. Verify tenancy at API and application layers; database isolation is not a substitute for authorization. Implement shared-data RLS only where relevant.
6. Reconcile db-helper schema with tenant-service, central-service and existing UIMS before any integration.
7. Test backup/restore, upgrade, failover and operator key rotation on isolated Windows/server QA targets; complete security review and release approval.

This report is an audit of isolated synthetic CI work, not a certification of a real university deployment. All six project PRs remain Draft/NO-GO pending their separate release gates.
