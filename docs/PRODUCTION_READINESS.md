# Production readiness gates — db-helper

**Status: NO-GO.** This proposed branch addresses source-control hygiene only. It is **not** a production certification.

## Mandatory pre-merge checks

- [ ] Arrange independent, verified backup of all runtime tenant databases, logs and original configuration. Removing tracked files from a branch must not erase the only copy of operational evidence.
- [ ] Review and rotate/revoke any potentially committed live credentials, and provision secret-manager environment injection. A Git commit deletion does **not** remove secrets or data from past Git history, forks or caches. History cleanup requires separately approved coordination.
- [ ] Generate and commit a pinned dependency lockfile; run clean reproducible dependency install and production build.
- [ ] Add unit/integration tests, verify cross-service API and DB contracts, and collect pass/fail evidence.
- [ ] Prove least-privilege authorization, auditability, tenant isolation, zero hard-coded production credentials, and recovery after restart.
- [ ] Complete service-specific blockers:
- [ ] Generate clients reproducibly from versioned schemas
- [ ] Validate tenant isolation, RLS and migration rollback
- [ ] Resolve system credentials/storage policy
- [ ] Confirm University extension strategy without replacing UIMS schema
- [ ] Require independent review, security scan, signed artifacts where applicable, restore drill and approved release go/no-go.

Do not integrate with UIMS V1 until the six infrastructure repositories pass their release gates. No production deployment is authorized by this PR.


## 2026-11-23 — Student-write idempotency additive migration (Draft only)

- Added source Prisma model `StudentWriteIdempotency` and immutable, additive tenant migration `20261123151000_student_write_idempotency`; no existing table is dropped or changed.
- The table uses a composite primary key `(tenant_code, key_digest)` for serialized concurrent retries, principal/operation/resource/request digests for conflict detection, and an optional minimal JSON response recorded with the domain + outbox transaction. Raw request keys, student names, contacts and medical fields must never be stored here.
- Review migration and restore from a **verified independent backup** before any non-disposable environment. Apply initial tenant migration → local_events migration → replay-ledger migration in order. Do not run this migration on production without separate written owner approval.
- **Operational acceptance remains pending:** least-privilege column/table grants, database migration parity, historical exposure cleanup, replay-ledger retention/restore policy, and consistent client rollout. The table is intentionally not deleted automatically; automatic TTL cleanup would permit duplicate writes after key expiry.
