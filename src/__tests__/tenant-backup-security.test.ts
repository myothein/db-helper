import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateTenantName, parsePostgresDatabaseUrl } from '../security/tenant-guards';
import { TenantBackupService, type BackupCommandRunner } from '../backup/tenant-backup.service';
import { TenantRestoreService } from '../backup/tenant-restore.service';
import type { TenantService } from '../tenants/tenant.service';
import type { PostgresProvider } from '../providers/postgres.provider';

describe('database identifiers and credentials', () => {
    it('rejects SQL injection, path traversal, control chars and protected names', () => {
        for (const name of ['postgres','system_db','template0','../escape','tenant";DROP DATABASE postgres;--',
            'tenant space','tenant/other','', 'TenantCAPS', 'a'.repeat(64)]) {
            expect(() => validateTenantName(name)).toThrow(/Invalid or protected/);
        }
        expect(validateTenantName('university_ci_a')).toBe('university_ci_a');
    });
    it('parses a URL without shell interpolation and rejects malicious URL options', () => {
        const p = parsePostgresDatabaseUrl(
            'postgresql://qa_user:percent%20secret@127.0.0.1:5433/university_ci_a?schema=public');
        expect(p).toEqual({host:'127.0.0.1',port:5433,user:'qa_user',
            password:'percent secret',database:'university_ci_a'});
        expect(() => parsePostgresDatabaseUrl('http://qa_user:secret@localhost/tenant_a')).toThrow();
        expect(() => parsePostgresDatabaseUrl('postgresql://qa_user:secret@localhost/tenant_a?options=--bad')).toThrow();
        expect(() => parsePostgresDatabaseUrl('postgresql://qa_user:secret@localhost/tenant_a/extra')).toThrow();
        expect(() => parsePostgresDatabaseUrl('postgresql://qa_user:secret@localhost/postgres')).toThrow();
    });
});

describe('verified tenant backups never execute a shell command', () => {
    it('passes separated safe arguments, verifies archive and writes checksum manifest', async () => {
        const dir=mkdtempSync(path.join(tmpdir(),'db-helper-safe-backup-'));
        const executed:{exe:string;args:string[];env:NodeJS.ProcessEnv}[]=[];
        const fake:BackupCommandRunner=async(exe,args,opts)=>{
            executed.push({exe,args,env:opts.env});
            if(exe==='pg_dump') {
                const target=args[args.indexOf('--file')+1];
                writeFileSync(target,Buffer.concat([Buffer.from('PGDMP'),
                    Buffer.alloc(128,1)]));
            } else if(exe!=='pg_restore') throw Error('unexpected subprocess');
        };
        const tenant={
            getTenantByName:vi.fn(async()=>({
                databaseUrl:'postgresql://qa_user:secret%20test@localhost:5432/tenant_ci'
            }))
        } as unknown as TenantService;
        try {
            const svc=new TenantBackupService({} as PostgresProvider,tenant,fake,dir);
            const output=await svc.backupTenant('tenant_ci');
            expect(path.dirname(output)).toBe(dir);
            expect(output.endsWith('.dump')).toBe(true);
            expect(executed.map(x=>x.exe)).toEqual(['pg_dump','pg_restore']);
            expect(executed[0].args).toContain('--format=custom');
            expect(executed[0].args).toContain('tenant_ci');
            expect(executed[0].env.PGPASSWORD).toBe('secret test');
            expect(JSON.stringify(executed.map(x=>x.args))).not.toContain('secret test');
            expect(readFileSync(output).subarray(0,5).toString()).toBe('PGDMP');
            expect(readFileSync(output+'.sha256','utf8')).toMatch(/^[a-f0-9]{64}  tenant_ci_.*\.dump\n$/);
            expect(readdirSync(dir).filter(name=>name.endsWith('.partial'))).toHaveLength(0);
        } finally {rmSync(dir,{recursive:true,force:true});}
    });
    it('rejects failed pg_restore verification and deletes unverified dump', async () => {
        const dir=mkdtempSync(path.join(tmpdir(),'db-helper-invalid-backup-'));
        const fake:BackupCommandRunner=async(exe,args)=>{
            if(exe==='pg_dump') writeFileSync(args[args.indexOf('--file')+1],
                Buffer.concat([Buffer.from('PGDMP'),Buffer.alloc(128)]));
            if(exe==='pg_restore') throw Error('tampered archive');
        };
        const tenant={getTenantByName:async()=>({
            databaseUrl:'postgresql://qa_user:secret@localhost:5432/tenant_ci'
        })} as unknown as TenantService;
        try {
            const svc=new TenantBackupService({} as PostgresProvider,tenant,fake,dir);
            await expect(svc.backupTenant('tenant_ci')).rejects.toThrow(/failed validation/);
            expect(readdirSync(dir)).toHaveLength(0);
        } finally{rmSync(dir,{recursive:true,force:true});}
    });
    it('rejects bad tenant identifiers before contacting DB provider', async()=>{
        const tenant={getTenantByName:vi.fn()} as unknown as TenantService;
        const backup=new TenantBackupService({} as PostgresProvider,tenant);
        await expect(backup.backupTenant('../postgres')).rejects.toThrow(/Invalid or protected/);
        expect(tenant.getTenantByName).not.toHaveBeenCalled();
    });
});

describe('destructive restore safety gate',()=>{
    it('never opens a database or executes a restore command',async()=>{
        const connect=vi.fn();
        const restore=new TenantRestoreService({connect} as unknown as PostgresProvider);
        await expect(restore.restoreTenant('tenant_ci','untrusted.sql',true))
            .rejects.toThrow(/Unsafe tenant restore disabled/);
        expect(connect).not.toHaveBeenCalled();
    });
});
