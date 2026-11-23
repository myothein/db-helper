-- GTSP tenant-service student mutations: immutable replay ledger.
-- Apply only after tenant backup / independent migration review; NO production DDL here.
-- Key digests are SHA-256 of high-entropy client idempotency keys. No raw keys or PII.
CREATE TABLE "student_write_idempotency" (
    "tenant_code" TEXT NOT NULL,
    "key_digest" VARCHAR(64) NOT NULL,
    "principal_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "request_digest" VARCHAR(64) NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "student_write_idempotency_pkey" PRIMARY KEY ("tenant_code", "key_digest"),
    CONSTRAINT "student_write_idempotency_key_hex" CHECK ("key_digest" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "student_write_idempotency_request_hex" CHECK ("request_digest" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "student_write_idempotency_operation" CHECK (
        "operation" IN ('student.create', 'student.update', 'student.delete')
    ),
    CONSTRAINT "student_write_idempotency_response" CHECK (
        ("response_status" IS NULL AND "response_body" IS NULL)
        OR ("response_status" IN (200, 201) AND "response_body" IS NOT NULL)
    )
);

COMMENT ON TABLE "student_write_idempotency" IS
  'Durable student-write replay ledger; no raw idempotency keys or student PII.';
COMMENT ON COLUMN "student_write_idempotency"."response_body" IS
  'Public-safe student mutation response only; never store contact or medical data.';
