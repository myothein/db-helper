// packages/db-helper/src/telemetry/metrics.ts

import { performance } from "perf_hooks";
import { Logger } from "../utils/logger";

interface Metric {
    name: string;
    durationMs: number;
    timestamp: Date;
}

const metrics: Metric[] = [];

export const recordMetric = (name: string, startTime: number) => {
    const duration = performance.now() - startTime;
    const metric: Metric = { name, durationMs: duration, timestamp: new Date() };
    metrics.push(metric);
    Logger.info(`[Metric] ${name} took ${duration.toFixed(2)} ms`);
};

export const getMetrics = () => metrics;
export const clearMetrics = () => metrics.splice(0, metrics.length);
