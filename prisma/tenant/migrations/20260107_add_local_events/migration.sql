-- migrations/tenant/20260107_add_local_events.sql
CREATE TABLE IF NOT EXISTS local_events (
                                            id UUID PRIMARY KEY,
                                            tenant_code VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    retry_count INT NOT NULL DEFAULT 0,
    event_version INT NOT NULL DEFAULT 1,
    headers JSONB DEFAULT '{}'::jsonb
    );
CREATE INDEX IF NOT EXISTS idx_local_events_tenant_sent ON local_events (tenant_code, sent);
