// packages/db-helper/src/telemetry/tracing.ts

import { Logger } from "../utils/logger";

export class Tracer {
    private stack: string[] = [];

    start(operation: string) {
        this.stack.push(operation);
        Logger.info(`[Trace Start] ${operation}`);
    }

    end(operation: string) {
        const last = this.stack.pop();
        if (last !== operation) {
            Logger.warn(`[Trace Mismatch] Expected ${last} but got ${operation}`);
        }
        Logger.info(`[Trace End] ${operation}`);
    }

    trace<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        this.start(operation);
        return fn()
            .then((result) => {
                this.end(operation);
                return result;
            })
            .catch((err) => {
                this.end(operation);
                throw err;
            });
    }
}

export const tracer = new Tracer();
