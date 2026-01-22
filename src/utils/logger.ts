type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

export class Logger {
    // Set default log level from environment
    private static level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

    private static shouldLog(level: LogLevel) {
        return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(Logger.level);
    }

    private static formatMessage(level: LogLevel, message: string, meta?: any) {
        const timestamp = new Date().toISOString();
        const color = {
            debug: "\x1b[34m", // blue
            info: "\x1b[36m",  // cyan
            warn: "\x1b[33m",  // yellow
            error: "\x1b[31m", // red
        }[level];

        let formatted = `${color}[${level.toUpperCase()}] ${timestamp} - ${message}\x1b[0m`;

        if (meta) {
            if (meta instanceof Error) {
                formatted += `\n${meta.stack}`;
            } else if (typeof meta === "object") {
                formatted += `\n${JSON.stringify(meta, null, 2)}`;
            } else {
                formatted += `\n${meta}`;
            }
        }

        return formatted;
    }

    static debug(message: string, meta?: any) {
        if (process.env.DEBUG !== "true" || !Logger.shouldLog("debug")) return;
        console.debug(Logger.formatMessage("debug", message, meta));
    }

    static info(message: string, meta?: any) {
        if (!Logger.shouldLog("info")) return;
        console.log(Logger.formatMessage("info", message, meta));
    }

    static warn(message: string, meta?: any) {
        if (!Logger.shouldLog("warn")) return;
        console.warn(Logger.formatMessage("warn", message, meta));
    }

    static error(message: string, meta?: any) {
        if (!Logger.shouldLog("error")) return;
        console.error(Logger.formatMessage("error", message, meta));
    }

    static success(message: string, meta?: any) {
        if (!Logger.shouldLog("info")) return; // treat as info level
        console.log("\x1b[32m%s\x1b[0m", `[SUCCESS] ${new Date().toISOString()} - ${message}`, meta || "");
    }

}
