import { it, expect } from 'vitest';
import { Client } from 'pg';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { TenantService } from '../tenants/tenant.service';
import type { PostgresProvider } from '../providers/postgres.provider';
import { TenantBackupService, type BackupCommandRunner } from '../backup/tenant-backup.service';

const ciOnly = process.env.RUN_PG_BACKUP_E2E === '1' ? it : it.skip;
const url = 'postgresql://ci_qa:ci_only_password@127.0.0.1:5432/tenant_backup_ci';

/** Use matching PostgreSQL 17 binaries inside disposable official Docker images. */
const postgres17Runner = (directory: string): BackupCommandRunner => async (command, args, options) => {
    if (!['pg_dump','pg_restore'].includes(command) || process.platform !== 'linux' ||
        process.env.GITHUB_ACTIONS !== 'true') {
        throw new Error('PostgreSQL client runner restricted to Linux GitHub CI');
    }
    const uid=process.getuid?.(),gid=process.getgid?.();
    if (uid === undefined || gid === undefined) throw new Error('Missing ephemeral CI UID');
    await new Promise<void>((resolve,reject) => {
        const child=spawn('docker',[
            'run','--rm','--network','host','--user',uid+':'+gid,
            '--volume',directory+':'+directory,
            '--env','PGPASSWORD',
            'postgres:17',command,...args
        ],{
            env:options.env,stdio:['ignore','ignore','ignore'],timeout:options.timeout
        });
        child.once('error',()=>reject(new Error('Ephemeral PostgreSQL client failed')));
        child.once('close',(code,signal)=>code===0 && !signal
            ? resolve() : reject(new Error('Ephemeral PostgreSQL client rejected archive')));
    });
};

ciOnly('PostgreSQL 17: verified custom archive restores exact synthetic data in a separate database',async()=>{
    const root=mkdtempSync(path.join(tmpdir(),'db-helper-pg17-restore-'));
    const createClient=(database:string)=>new Client({
        connectionString:url.replace('/tenant_backup_ci','/'+database)
    });
    const source=createClient('tenant_backup_ci');
    const verify=createClient('tenant_restored_ci');
    let createdRestored=false;
    try {
        await source.connect();
        await source.query('CREATE TABLE qa_backup_record (id UUID PRIMARY KEY, tenant_code TEXT NOT NULL, details TEXT NOT NULL)');
        const uuid=randomUUID();
        await source.query('INSERT INTO qa_backup_record (id,tenant_code,details) VALUES ($1,$2,$3)',
            [uuid,'tenant_backup_ci','Synthetic backup/restore CI fixture']);
        const tenant={getTenantByName:async()=>({databaseUrl:url})} as unknown as TenantService;
        const service=new TenantBackupService(
            {} as PostgresProvider,tenant,postgres17Runner(root),root
        );
        const archive=await service.backupTenant('tenant_backup_ci');
        const digest=createHash('sha256').update(readFileSync(archive)).digest('hex');
        expect(readFileSync(archive+'.sha256','utf8')).toContain(digest);
        // Restore ONLY into a fresh, disposable CI database. No destructive overwrite.
        await source.query('CREATE DATABASE tenant_restored_ci');
        createdRestored=true;
        await postgres17Runner(root)('pg_restore',[
            '--no-owner','--no-acl','--host','127.0.0.1',
            '--port','5432','--username','ci_qa','--dbname','tenant_restored_ci',archive
        ],{env:{...process.env,PGPASSWORD:'ci_only_password'},timeout:120_000});
        await verify.connect();
        const rows=await verify.query<{id:string;tenant_code:string;details:string}>(
            'SELECT id,tenant_code,details FROM qa_backup_record');
        expect(rows.rows).toEqual([{
            id:uuid,tenant_code:'tenant_backup_ci',
            details:'Synthetic backup/restore CI fixture'
        }]);
        const original=await source.query('SELECT count(*)::int AS n FROM qa_backup_record');
        expect(original.rows[0].n).toBe(1);
        console.log('PASS PG17: verified custom-format backup restored independently with UUID/data parity');
    } finally {
        await Promise.allSettled([verify.end(),source.end()]);
        rmSync(root,{recursive:true,force:true});
    }
},120_000);
