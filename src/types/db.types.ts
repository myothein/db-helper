// packages/db-helper/src/types/db.types.ts

export type QueryParams = any[];

export interface DBResult {
    rowCount: number;
    rows?: any[];
}
