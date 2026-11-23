import type { Client } from 'pg';

/**
 * CI-ONLY capability. Never expose this from the db-helper CLI or public DBHelper.
 * A production provisioner requires a distinct authorization and secrets workflow.
 */
export interface CiTenantIdentity {
    databaseName: string;
    roleName: string;
    password: string;
}

const qaIdentifier = /^qa_isolation_[a-z0-9_]{1,24}$/;

function checkIdentity(identity: CiTenantIdentity) {
    if (!qaIdentifier.test(identity.databaseName) ||
        !qaIdentifier.test(identity.roleName) ||
        identity.databaseName === identity.roleName ||
        typeof identity.password !== 'string' ||
        Buffer.byteLength(identity.password, 'utf8') < 32) {
        throw new Error('CI tenant identity invalid or outside isolated naming scope');
    }
}

/**
 * Provision an ephemeral, isolated database and non-privileged login on a
 * GitHub-hosted, PostgreSQL-17 CI service only. Throws before writing elsewhere.
 *
 * Passwords enter PostgreSQL via parameterized format(%L) and are never logged.
 * CREATE ROLE / DATABASE cannot use ordinary SQL parameters, so identifiers
 * are safely formatted with PostgreSQL's %I inside the server.
 */
export async function provisionCiTenantDatabase(
    admin: Client, identity: CiTenantIdentity
): Promise<void> {
    checkIdentity(identity);
    if (process.env.RUN_PG_TENANT_ISOLATION !== '1' ||
        process.env.GITHUB_ACTIONS !== 'true' ||
        process.env.CI !== 'true' ||
        process.env.RUNNER_OS !== 'Linux') {
        throw new Error('Isolated CI provisioning gate is not enabled');
    }
    const context=await admin.query<{
        database:string; username:string; version:number
    }>(`SELECT current_database() AS database, current_user AS username,
        current_setting('server_version_num')::int AS version`);
    const actual=context.rows[0];
    if (!actual || actual.database !== 'tenant_backup_ci' ||
        actual.username !== 'ci_qa' ||
        actual.version < 170000 || actual.version >= 180000) {
        throw new Error('Refusing provisioning outside the pinned PostgreSQL 17 CI fixture');
    }

    const existing=await admin.query<{role_exists:boolean; database_exists:boolean}>(`
        SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=$1) AS role_exists,
               EXISTS(SELECT 1 FROM pg_database WHERE datname=$2) AS database_exists
    `,[identity.roleName, identity.databaseName]);
    if (existing.rows[0].role_exists || existing.rows[0].database_exists) {
        throw new Error('CI tenant role/database already exists; refusing overwrite');
    }

    // The password is never embedded by our code into a shell command or log.
    // PostgreSQL format(%L) safely quotes arbitrary password strings.
    const roleDdl=await admin.query<{statement:string}>(`
        SELECT format(
            'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT',
            $1::text, $2::text
        ) AS statement`,[identity.roleName,identity.password]);
    await admin.query(roleDdl.rows[0].statement);

    const dbDdl=await admin.query<{statement:string}>(`
        SELECT format('CREATE DATABASE %I OWNER %I TEMPLATE template0',
                      $1::text,$2::text) AS statement`,
        [identity.databaseName,identity.roleName]);
    // CREATE DATABASE cannot run inside a transaction.
    await admin.query(dbDdl.rows[0].statement);

    const accessDdl=await admin.query<{revoke_sql:string; grant_sql:string}>(`
        SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC',$1::text) AS revoke_sql,
               format('GRANT CONNECT ON DATABASE %I TO %I',$1::text,$2::text) AS grant_sql`,
        [identity.databaseName,identity.roleName]);
    await admin.query(accessDdl.rows[0].revoke_sql);
    await admin.query(accessDdl.rows[0].grant_sql);
}
