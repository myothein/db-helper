/** Reject untrusted database identifiers before SQL, paths or template substitution. */
export function validateTenantName(name: string): string {
    if (typeof name !== 'string' || !/^[a-z][a-z0-9_-]{0,62}$/.test(name) ||
        ['postgres', 'template0', 'template1', 'system_db'].includes(name)) {
        throw new Error('Invalid or protected tenant identifier');
    }
    return name;
}

export interface PgConnectionParts {
    host: string; port: number; user: string; password: string;
    database: string; sslmode?: string;
}

/** Parse a PostgreSQL URL without ever placing it in logs or command strings. */
export function parsePostgresDatabaseUrl(value: string): PgConnectionParts {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error('Invalid PostgreSQL URL'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname ||
        url.hash || url.username === '' || url.password === '' ||
        (url.pathname.match(/\//g) || []).length !== 1) {
        throw new Error('Unsupported PostgreSQL connection URL');
    }
    const database = decodeURIComponent(url.pathname.slice(1));
    validateTenantName(database);
    const port = url.port ? Number(url.port) : 5432;
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PostgreSQL port');
    const allowed = new Set(['schema', 'sslmode']);
    for (const key of url.searchParams.keys()) {
        if (!allowed.has(key)) throw new Error('Unsupported PostgreSQL URL query option');
    }
    const sslmode = url.searchParams.get('sslmode') ?? undefined;
    if (sslmode && !['disable', 'require', 'verify-ca', 'verify-full'].includes(sslmode)) {
        throw new Error('Unsupported PostgreSQL SSL mode');
    }
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    if (!user || !password || user.includes('\u0000') || password.includes('\u0000')) {
        throw new Error('Invalid PostgreSQL credentials');
    }
    return { host: url.hostname, port, user, password, database, ...(sslmode ? {sslmode} : {}) };
}
