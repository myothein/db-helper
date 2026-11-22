import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TenantService } from '../tenants/tenant.service';
import type { PostgresProvider } from '../providers/postgres.provider';
import { Logger } from '../utils/logger';
import { parsePostgresDatabaseUrl, validateTenantName } from '../security/tenant-guards';

export type BackupCommandRunner = (
    exe: string, args: string[], options: { env: NodeJS.ProcessEnv; timeout: number }
) => Promise<void>;
const exec = promisify(execFile);
const defaultRunner: BackupCommandRunner = async (exe, args, options) => {
    await exec(exe, args, { ...options, maxBuffer: 1024 * 1024, windowsHide: true });
};
async function sha256(file: string): Promise<string> {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest('hex');
}

/** A tenant backup is never an unescaped shell command or a plaintext SQL dump. */
export class TenantBackupService {
    constructor(
        private readonly provider: PostgresProvider,
        private readonly tenantService: TenantService,
        private readonly run: BackupCommandRunner = defaultRunner,
        private readonly backupDir: string = path.resolve('backups')
    ) {}

    async backupTenant(name: string): Promise<string> {
        validateTenantName(name);
        const tenant = await this.tenantService.getTenantByName(name);
        if (!tenant?.databaseUrl) throw new Error('Tenant backup source is not configured');
        const db = parsePostgresDatabaseUrl(tenant.databaseUrl);
        // Connection URLs are not logged, embedded in shell commands or written to manifests.
        mkdirSync(this.backupDir, {recursive:true,mode:0o700});
        const file = path.join(this.backupDir,
            name + '_' + Date.now() + '_' + randomBytes(6).toString('hex') + '.dump');
        const partial = file + '.partial';
        const env: NodeJS.ProcessEnv = {
            ...process.env, PGPASSWORD: db.password,
            ...(db.sslmode ? { PGSSLMODE:db.sslmode } : {})
        };
        let published = false;
        try {
            await this.run('pg_dump',[
                '--format=custom','--no-owner','--no-acl',
                '--no-password','--host',db.host,'--port',String(db.port),
                '--username',db.user,'--dbname',db.database,'--file',partial
            ],{env,timeout:300_000});
            if (!existsSync(partial) || statSync(partial).size < 64 ||
                readFileSync(partial).subarray(0,5).toString('ascii') !== 'PGDMP') {
                throw new Error('Invalid PostgreSQL custom-format archive');
            }
            // pg_restore --list checks that the archive is parseable, without DB writes.
            await this.run('pg_restore',['--list',partial],{env,timeout:30_000});
            const digest=await sha256(partial);
            renameSync(partial,file);
            published=true;
            writeFileSync(file+'.sha256',digest+'  '+path.basename(file)+'\n',
                {encoding:'utf8',flag:'wx',mode:0o600});
            Logger.info('Verified tenant backup created: '+name+' ('+path.basename(file)+')');
            return file;
        } catch {
            // Keep unverified outputs from being confused with successful backup artifacts.
            for(const target of [partial,...(published ? [file,file+'.sha256'] : [])]) {
                try{ if(existsSync(target))unlinkSync(target); }catch{}
            }
            throw new Error('Tenant backup failed validation; no successful backup published');
        }
    }
}
