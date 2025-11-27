export interface SQLExecuteRequest {
    /**
     * SQL statement to execute.
     */
    query: string;
}

export interface SQLExecuteResponse {
    /**
     * Column names when the query returns rows.
     */
    columns?: string[];
    /**
     * Query results represented as an array of rows.
     */
    rows?: Array<Array<string>>;
    /**
     * Rows affected for write operations.
     */
    rowsAffected?: number;
}
