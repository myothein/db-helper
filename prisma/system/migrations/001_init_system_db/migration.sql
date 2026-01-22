-- ========================================
-- 1️⃣ Create TenantStatus enum if not exists
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenantstatus') THEN
CREATE TYPE "TenantStatus" AS ENUM (
            'ACTIVE',
            'DOWN',
            'DEGRADED',
            'SUSPENDED',
            'DROPPED',
            'UNKNOWN'
        );
END IF;
END $$;

-- ========================================
-- 2️⃣ Create system tables
-- ========================================

CREATE TABLE IF NOT EXISTS "tenants" (
                                         "id" TEXT NOT NULL PRIMARY KEY,
                                         "name" TEXT NOT NULL UNIQUE,
                                         "databaseUrl" TEXT NOT NULL,
                                         "isActive" BOOLEAN NOT NULL DEFAULT true,
                                         "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
                                         "tenant_status" "TenantStatus",
                                         "lastHeartbeat" TIMESTAMP(3),
    "lastError" TEXT,
    "dbUser" TEXT,
    "dbPassword" TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS "_migration_versions" (
                                                     "id" SERIAL NOT NULL PRIMARY KEY,
                                                     "version" TEXT NOT NULL UNIQUE,
                                                     "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS "MigrationLock" (
                                               "id" INTEGER NOT NULL DEFAULT 1 PRIMARY KEY,
                                               "locked" BOOLEAN NOT NULL DEFAULT false,
                                               "lockedAt" TIMESTAMP(3)
    );

CREATE TABLE IF NOT EXISTS "SchemaVersion" (
                                               "id" INTEGER NOT NULL DEFAULT 1 PRIMARY KEY,
                                               "version" TEXT NOT NULL,
                                               "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS "SystemSetting" (
                                               "id" SERIAL NOT NULL PRIMARY KEY,
                                               "key" TEXT NOT NULL UNIQUE,
                                               "value" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
                                          "id" SERIAL NOT NULL PRIMARY KEY,
                                          "tenantId" TEXT,
                                          "action" TEXT NOT NULL,
                                          "performedBy" TEXT,
                                          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- ========================================
-- 3️⃣ Create tenant_agents table
-- ========================================
CREATE TABLE IF NOT EXISTS "tenant_agents" (
                                               "agentId" TEXT NOT NULL PRIMARY KEY,
                                               "tenantId" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "version" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS "tenant_agents_tenantId_idx" ON "tenant_agents"("tenantId");

-- ========================================
-- 4️⃣ Create events table
-- ========================================
CREATE TABLE IF NOT EXISTS "events" (
                                        "id" TEXT NOT NULL PRIMARY KEY,
                                        "tenantId" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "agentId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS "events_tenantId_idx" ON "events"("tenantId");
CREATE INDEX IF NOT EXISTS "events_type_idx" ON "events"("type");
CREATE INDEX IF NOT EXISTS "events_occurredAt_idx" ON "events"("occurredAt");

-- ========================================
-- 5️⃣ Create event_cursors table
-- ========================================
CREATE TABLE IF NOT EXISTS "event_cursors" (
                                               "id" SERIAL NOT NULL PRIMARY KEY,
                                               "consumerName" TEXT NOT NULL UNIQUE,
                                               "lastEventId" TEXT,
                                               "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- ========================================
-- 6️⃣ Create dead_events table
-- ========================================
CREATE TABLE IF NOT EXISTS "dead_events" (
                                             "id" TEXT NOT NULL PRIMARY KEY,
                                             "tenantId" TEXT NOT NULL,
                                             "type" TEXT NOT NULL,
                                             "payload" JSONB NOT NULL,
                                             "error" TEXT NOT NULL,
                                             "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS "dead_events_tenantId_idx" ON "dead_events"("tenantId");
CREATE INDEX IF NOT EXISTS "dead_events_type_idx" ON "dead_events"("type");
