// packages/db-helper/src/audit/audit.logger.ts

import { writeFileSync, appendFileSync } from "fs";
import path from "path";

export class AuditLogger {
    private logFile: string;

    constructor(logFileName: string = "audit.log") {
        this.logFile = path.resolve(process.cwd(), logFileName);
        // Initialize file if not exists
        try {
            writeFileSync(this.logFile, "", { flag: "wx" });
        } catch {
            // File exists, ignore
        }
    }

    /** Log an operation */
    log(action: string, entity: string, details: Record<string, any> = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = JSON.stringify({ timestamp, action, entity, details });
        appendFileSync(this.logFile, logEntry + "\n", "utf-8");
    }

    /** Log tenant operations */
    logTenantOperation(tenantName: string, action: string, details: Record<string, any> = {}) {
        this.log(action, `tenant:${tenantName}`, details);
    }

    /** Log migration operations */
    logMigration(tenantName: string, version: string, status: string) {
        this.log("migration", `tenant:${tenantName}`, { version, status });
    }
}

// Export singleton for convenience
export const auditLogger = new AuditLogger();
