export interface TenantSeed {
    name: string;
    checksum: string;
    run: (prisma: any) => Promise<void>;
}
