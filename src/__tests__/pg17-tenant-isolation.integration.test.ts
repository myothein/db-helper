import { it, expect } from 'vitest';
import { Client } from 'pg';
import { randomBytes } from 'node:crypto';
import { provisionCiTenantDatabase } from '../security/ci-tenant-provisioner';

const active = process.env.RUN_PG_TENANT_ISOLATION === '1' ? it : it.skip;

active('PostgreSQL 17: two real database-scoped tenants reject cross-tenant access', async () => {
    const admin = new Client({
        host:'127.0.0.1',port:5432,user:'ci_qa',
        password:'ci_only_password',database:'tenant_backup_ci'
    });
    const a = {databaseName:'qa_isolation_a',roleName:'qa_isolation_role_a',
        password:randomBytes(32).toString('base64url')};
    const b = {databaseName:'qa_isolation_b',roleName:'qa_isolation_role_b',
        password:randomBytes(32).toString('base64url')};
    const own = (item:typeof a,database=item.databaseName) => new Client({
        host:'127.0.0.1',port:5432,
        user:item.roleName,password:item.password,database,
        connectionTimeoutMillis:3000
    });
    let clientA:Client|undefined;
    let clientB:Client|undefined;
    try {
        await admin.connect();
        await expect(provisionCiTenantDatabase(admin,{
            ...a,databaseName:'postgres'
        })).rejects.toThrow(/outside isolated naming scope/);
        await provisionCiTenantDatabase(admin,a);
        await provisionCiTenantDatabase(admin,b);

        const meta=await admin.query<{
            rolname:string;rolsuper:boolean;rolcreatedb:boolean;rolcreaterole:boolean;
            rolreplication:boolean;rolbypassrls:boolean
        }>(`SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls
            FROM pg_roles WHERE rolname=ANY($1::text[])`,[[a.roleName,b.roleName]]);
        expect(meta.rows).toHaveLength(2);
        for (const row of meta.rows){
            expect(row.rolsuper).toBe(false);
            expect(row.rolcreatedb).toBe(false);
            expect(row.rolcreaterole).toBe(false);
            expect(row.rolreplication).toBe(false);
            expect(row.rolbypassrls).toBe(false);
        }

        clientA=own(a);
        clientB=own(b);
        await clientA.connect();
        await clientB.connect();
        await clientA.query('CREATE TABLE ci_isolation_record (id int PRIMARY KEY, secret text NOT NULL)');
        await clientA.query('INSERT INTO ci_isolation_record VALUES (1,$1)',['tenant-A-synthetic-data']);
        await clientB.query('CREATE TABLE ci_isolation_record (id int PRIMARY KEY, secret text NOT NULL)');
        await clientB.query('INSERT INTO ci_isolation_record VALUES (1,$1)',['tenant-B-synthetic-data']);
        const valueA=await clientA.query<{secret:string}>('SELECT secret FROM ci_isolation_record');
        const valueB=await clientB.query<{secret:string}>('SELECT secret FROM ci_isolation_record');
        expect(valueA.rows[0].secret).toBe('tenant-A-synthetic-data');
        expect(valueB.rows[0].secret).toBe('tenant-B-synthetic-data');
        await expect(clientA.query('CREATE ROLE qa_isolation_escalation')).rejects.toThrow();

        const crossAB=own(a,b.databaseName);
        const crossBA=own(b,a.databaseName);
        try {
            await expect(crossAB.connect()).rejects.toThrow();
            await expect(crossBA.connect()).rejects.toThrow();
        } finally {
            await Promise.allSettled([crossAB.end(),crossBA.end()]);
        }

        await expect(provisionCiTenantDatabase(admin,a)).rejects.toThrow(/already exists/);
        const totals=await admin.query<{count:string}>(`
            SELECT count(*)::text AS count FROM pg_database
            WHERE datname=ANY($1::text[])`,[[a.databaseName,b.databaseName]]);
        expect(totals.rows[0].count).toBe('2');
    } finally {
        await Promise.allSettled([clientA?.end(),clientB?.end(),admin.end()]);
    }
},120_000);

it('CI-only provisioning must reject environments without isolated CI capability',async()=>{
    const fake = {query:async()=>{throw Error('Should not touch PostgreSQL')}} as unknown as Client;
    await expect(provisionCiTenantDatabase(fake,{
        databaseName:'qa_isolation_probe', roleName:'qa_isolation_probe_role',
        password:randomBytes(32).toString('base64url')
    })).rejects.toThrow(/gate is not enabled|invalid or outside isolated naming scope/);
});
