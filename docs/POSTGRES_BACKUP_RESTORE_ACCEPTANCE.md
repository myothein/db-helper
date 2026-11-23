# DB Helper — Security and PostgreSQL Backup/Restore Acceptance

**Status: PRODUCTION NO-GO.** This is a proposal in Draft PR #1. No main branch, production tenant, or UIMS V1 database is changed.

## Confirmed QA evidence — 2026-11-22

- GitHub Actions: https://github.com/myothein/db-helper/actions/runs/45045834669
- Locked clean build and 6 non-destructive security unit tests **PASS**.
- Actual PostgreSQL **17** service with a synthetic tenant data table: **PASS**.
- `pg_dump` custom-format archive created through argument-vector execution, verified by `pg_restore --list`, SHA-256 published in adjacent manifest, and independently restored to another **disposable** database. Exact original UUID, tenant code and sample values matched. This is **not** a full production tenant schema disaster-recovery test.
- All backup/restore operations in this CI run targeted disposable PostgreSQL containers. No production credentials, users or UIMS data.

## Implemented safe baseline

- Removes hardcoded default credentials from SYSTEM_DATABASE_URL and DEFAULT_TENANT_DB_URL_TEMPLATE. Missing configuration now fails closed.
- Eliminates logging of full tenant PostgreSQL connection URLs.
- Strictly validates tenant identifiers, URL protocol and supported connection options.
- Disables implicit tenant database creation through the ordinary connection path.
- `backup-tenant` now writes a PostgreSQL custom-format archive (`.dump`), NOT the historical plaintext SQL `.sql` file. The CLI help text may require follow-up adjustment.
- Uses `execFile` with separate arguments rather than `exec` shell concatenation. Credentials are supplied through the child process environment; never printed or stored in archive metadata.
- Validates archive magic/header, runs `pg_restore --list`, hashes file with streaming SHA-256, publishes only verified backups, and removes failed partial output.
- Historical `restoreTenant`, `dropTenant`, `resetTenant`, `rotateCredentials`, and `provisionTenant` methods are intentionally **disabled** in the Draft Branch because earlier implementations contain unsafe database destruction/SQL interpolation, plaintext credential handling or missing recovery gates. They are NOT considered finished production workflows.

## Required before enabling destructive/operator features

1. Approved PostgreSQL target allowlist and non-production dry-run, separation of duties, explicit individual operation approval, and robust audit trail.
2. Cryptographically versioned/signed manifests or trusted checksum custody; SHA-256 alone only detects accidental modification, not malicious replacement.
3. Independent backup location and off-host copy, retention/encryption policy and full schema/roles/ACL restore on disposable Windows/Linux QA targets.
4. Safe restore into a *new* database with same schema, row counts and integrity evidence, followed by explicit tested cutover/rollback; never drop a live database during validation.
5. Use parameterized queries for data values; correctly quote/validate all SQL identifiers and eliminate raw interpolation. Do not embed credentials or expose them in logs/errors.
6. Role provisioning/rotation through an approved secret store, credential rotation, historical Git secret exposure remediation, tenant authorization/RLS and cross-tenant negative tests.
7. Resolve schema drift between db-helper, tenant-service and existing UIMS V1 without replacing the latter's schema.
8. Require human reviewer verification, rollback evidence and explicit production GO sign-off.

## Compatibility warning

This hardening branch is intentionally **breaking** for previously unsafe destructive operations and changes backup artifacts from `.sql` to `.dump`. Calling clients and operators must be updated before any merge. Do not merge to main or deploy just because the new CI tests pass.

## 2026-11-23 — Cross-tenant backup and archive-file permission hardening

- `backupTenant(name)` now verifies the registry database URL's **decoded database name exactly matches the requested tenant identifier**, before directory creation or any `pg_dump` invocation. This prevents a stale or malicious tenant registry mapping from silently exporting another university tenant's data.
- Adds negative tests for wrong database names and URL-encoded cross-tenant aliases. The backup runner must not execute and no dump artifacts may be created on rejection.
- Existing backup directories are rejected on POSIX if they are symbolic links, have group/other permissions, are owned by a different Unix user, or use a redirected path. The randomly named `.partial` file is reserved exclusively with mode `0600` before PostgreSQL writes it.
- Regression tests check private intermediate file mode and reject pre-existing publicly readable output directories. Existing PostgreSQL 17 disposable backup/independent-restore tests remain the validation target.
- **Important Windows limitation:** POSIX file modes do not establish NTFS ACL safety. Windows folder/file ACLs, EFS/BitLocker-at-rest as appropriate, backup copies, operator authorization and real recovery tests require separate acceptance before a production release.
- A successful SHA-256 manifest and `pg_restore --list` check do not provide authenticated signature custody or production disaster-recovery guarantees.

Status remains PRODUCTION NO-GO. No production data or UIMS V1 was accessed by this code change.
