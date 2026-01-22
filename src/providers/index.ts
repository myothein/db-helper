// packages/db-helper/src/providers/index.ts

import { PostgresProvider } from "./postgres.provider";
import { MySQLProvider } from "./mysql.provider";
import { SQLiteProvider } from "./sqlite.provider";

export enum DBEngine {
    POSTGRES = "postgres",
    MYSQL = "mysql",
    SQLITE = "sqlite",
}

export const createProvider = (engine: DBEngine = DBEngine.POSTGRES) => {
    switch (engine) {
        case DBEngine.POSTGRES:
            return new PostgresProvider();
        case DBEngine.MYSQL:
            return new MySQLProvider();
        case DBEngine.SQLITE:
            return new SQLiteProvider();
        default:
            throw new Error(`Unknown DB engine: ${engine}`);
    }
};
