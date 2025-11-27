import { BaseService } from "@/services/BaseService";
import { SendOptions } from "@/tools/options";
import { SQLExecuteRequest, SQLExecuteResponse } from "@/tools/sql-types";

/**
 * SQLService provides superuser-only SQL execution helpers.
 */
export class SQLService extends BaseService {
    /**
     * Execute a SQL statement and return the result.
     *
     * Only superusers can call this endpoint.
     */
    async execute(query: string, options?: SendOptions): Promise<SQLExecuteResponse> {
        const trimmed = (query || "").trim();
        if (!trimmed) {
            throw new Error("query is required");
        }

        const payload: SQLExecuteRequest = { query: trimmed };

        return this.client.send<SQLExecuteResponse>("/api/sql/execute", {
            method: "POST",
            body: payload,
            ...options,
        });
    }
}
