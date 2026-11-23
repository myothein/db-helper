import type { PostgresProvider } from '../providers/postgres.provider';

/**
 * The previous restore path killed client sessions, dropped the target DB and
 * executed SQL through a shell string with no independent restore test.
 * The API stays present but ALWAYS fails closed until safe staged restore with
 * explicit approval, target allowlist and verification has been implemented.
 */
export class TenantRestoreService {
    constructor(private readonly provider: PostgresProvider) {}
    async restoreTenant(_tenantName: string, _backupFile: string, _dropExisting = true): Promise<never> {
        throw new Error('Unsafe tenant restore disabled: use independently approved isolated restore QA');
    }
}
