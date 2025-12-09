import { BaseService } from "@/services/BaseService";
import { SendOptions } from "@/tools/options";
import { ScriptCreate, ScriptRecord, ScriptUpdate } from "@/tools/script-types";

export class ScriptService extends BaseService {
    private readonly tableName = "function_scripts";
    private readonly columnOrder = [
        "id",
        "name",
        "content",
        "description",
        "version",
        "created",
        "updated",
    ];
    private tableReady = false;

    /**
     * Create a new script entry with version 1.
     *
     * Requires superuser authentication.
     */
    async create(data: ScriptCreate, options?: SendOptions): Promise<ScriptRecord> {
        this.requireSuperuser();

        const name = data?.name?.trim();
        if (!name) {
            throw new Error("script name is required");
        }
        if (!data?.content || !data.content.trim()) {
            throw new Error("script content is required");
        }

        await this.ensureTable(options);

        const id = this.generateId();
        const now = new Date().toISOString();
        const query = `INSERT INTO ${this.tableName} (id, name, content, description, version, created, updated) VALUES ('${this.escape(
            id,
        )}', '${this.escape(
            name,
        )}', '${this.escape(data.content)}', '${this.escape(
            data.description ?? "",
        )}', 1, '${now}', '${now}');`;

        await this.client.sql.execute(query, this.cloneOptions(options));

        return this.get(name, options);
    }

    /**
     * Retrieve a script by its name.
     *
     * Requires superuser authentication.
     */
    async get(name: string, options?: SendOptions): Promise<ScriptRecord> {
        this.requireSuperuser();

        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new Error("script name is required");
        }

        await this.ensureTable(options);

        const query = `SELECT id, name, content, description, version, created, updated FROM ${this.tableName} WHERE name='${this.escape(
            trimmedName,
        )}' LIMIT 1;`;
        const result = await this.client.sql.execute(query, this.cloneOptions(options));

        const row = result.rows?.[0];
        if (!row) {
            throw new Error(`Script "${trimmedName}" was not found`);
        }

        return this.mapRow(result.columns, row);
    }

    /**
     * List all scripts.
     *
     * Requires superuser authentication.
     */
    async list(options?: SendOptions): Promise<Array<ScriptRecord>> {
        this.requireSuperuser();

        await this.ensureTable(options);

        const query = `SELECT id, name, content, description, version, created, updated FROM ${this.tableName} ORDER BY name;`;
        const result = await this.client.sql.execute(query, this.cloneOptions(options));

        const rows = result.rows || [];
        return rows.map((row) => this.mapRow(result.columns, row));
    }

    /**
     * Update an existing script and increment its version.
     *
     * Requires superuser authentication.
     */
    async update(
        name: string,
        changes: ScriptUpdate,
        options?: SendOptions,
    ): Promise<ScriptRecord> {
        this.requireSuperuser();

        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new Error("script name is required");
        }

        const hasContent = typeof changes?.content === "string";
        const hasDescription = typeof changes?.description !== "undefined";
        if (!hasContent && !hasDescription) {
            throw new Error("at least one of content or description must be provided");
        }

        await this.ensureTable(options);

        const now = new Date().toISOString();
        const setClauses = [];
        if (hasContent) {
            setClauses.push(`content='${this.escape(changes.content || "")}'`);
        }
        if (hasDescription) {
            setClauses.push(`description='${this.escape(changes.description || "")}'`);
        }
        setClauses.push("version = version + 1");
        setClauses.push(`updated='${now}'`);

        const query = `UPDATE ${this.tableName} SET ${setClauses.join(
            ", ",
        )} WHERE name='${this.escape(trimmedName)}';`;
        const result = await this.client.sql.execute(query, this.cloneOptions(options));

        if (!result.rowsAffected) {
            throw new Error(`Script "${trimmedName}" was not found`);
        }

        return this.get(trimmedName, options);
    }

    /**
     * Delete a script by its name.
     *
     * Requires superuser authentication.
     */
    async delete(name: string, options?: SendOptions): Promise<boolean> {
        this.requireSuperuser();

        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new Error("script name is required");
        }

        await this.ensureTable(options);

        const query = `DELETE FROM ${this.tableName} WHERE name='${this.escape(
            trimmedName,
        )}';`;
        const result = await this.client.sql.execute(query, this.cloneOptions(options));

        return (result.rowsAffected || 0) > 0;
    }

    private async ensureTable(options?: SendOptions): Promise<void> {
        if (this.tableReady) {
            return;
        }

        const clone = this.cloneOptions(options);
        const createTableQuery = `CREATE TABLE IF NOT EXISTS ${this.tableName} (id TEXT, name TEXT PRIMARY KEY, content TEXT NOT NULL, description TEXT DEFAULT '', version INTEGER NOT NULL DEFAULT 1, created TEXT DEFAULT (datetime('now')), updated TEXT DEFAULT (datetime('now')));`;
        await this.client.sql.execute(createTableQuery, clone);
        await this.ensureIdColumn(clone);
        await this.client.sql.execute(
            `CREATE UNIQUE INDEX IF NOT EXISTS ${this.tableName}_id_idx ON ${this.tableName}(id);`,
            clone,
        );
        this.tableReady = true;
    }

    private mapRow(columns: Array<string> | undefined, row: Array<string>): ScriptRecord {
        const map: { [key: string]: any } = {};
        const cols = columns?.length ? columns : this.columnOrder;

        cols.forEach((col, index) => {
            map[col] = row[index];
        });

        if (!map.id || !map.name) {
            throw new Error("Invalid script row returned from the server");
        }

        return {
            id: String(map.id),
            name: map.name,
            content: map.content || "",
            description: map.description || "",
            version: Number(map.version || 0),
            created: map.created,
            updated: map.updated,
        };
    }

    private async ensureIdColumn(options?: SendOptions): Promise<void> {
        const clone = this.cloneOptions(options);
        try {
            await this.client.sql.execute(
                `ALTER TABLE ${this.tableName} ADD COLUMN id TEXT;`,
                clone,
            );
        } catch (err: any) {
            if (!this.isDuplicateColumnError(err)) {
                throw err;
            }
        }

        await this.backfillMissingIds(clone);
    }

    private async backfillMissingIds(options?: SendOptions): Promise<void> {
        const result = await this.client.sql.execute(
            `SELECT name FROM ${this.tableName} WHERE id IS NULL OR TRIM(id) = ''`,
            options,
        );

        const nameIndex = (result.columns || []).indexOf("name");
        if (nameIndex === -1) {
            return;
        }

        const rows = result.rows || [];
        for (const row of rows) {
            const name = row[nameIndex];
            const id = this.generateId();
            const updateQuery = `UPDATE ${this.tableName} SET id='${this.escape(
                id,
            )}' WHERE name='${this.escape(name)}';`;
            await this.client.sql.execute(updateQuery, options);
        }
    }

    private generateId(): string {
        const bytes = this.getRandomBytes(16);
        const timestamp = BigInt(Date.now());

        bytes[0] = Number((timestamp >> 40n) & 0xffn);
        bytes[1] = Number((timestamp >> 32n) & 0xffn);
        bytes[2] = Number((timestamp >> 24n) & 0xffn);
        bytes[3] = Number((timestamp >> 16n) & 0xffn);
        bytes[4] = Number((timestamp >> 8n) & 0xffn);
        bytes[5] = Number(timestamp & 0xffn);

        bytes[6] = (bytes[6] & 0x0f) | 0x70; // set version to 7
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // set variant to 10xxxxxx

        return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }

    private getRandomBytes(length: number): Uint8Array {
        const bytes = new Uint8Array(length);
        const crypto = (globalThis as any)?.crypto;
        if (crypto?.getRandomValues) {
            crypto.getRandomValues(bytes);
            return bytes;
        }

        for (let i = 0; i < length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }

        return bytes;
    }

    private isDuplicateColumnError(err: any): boolean {
        const message =
            (typeof err?.response?.message === "string" && err.response.message) ||
            (typeof err?.message === "string" && err.message) ||
            "";

        return message.toLowerCase().includes("duplicate column name");
    }

    private requireSuperuser(): void {
        if (!this.client.authStore.isSuperuser) {
            throw new Error("Superuser authentication is required to manage scripts");
        }
    }

    private escape(value: string): string {
        return (value || "").replace(/'/g, "''");
    }

    private cloneOptions(options?: SendOptions): SendOptions | undefined {
        if (!options) {
            return undefined;
        }

        return Object.assign({}, options, {
            headers: options.headers ? Object.assign({}, options.headers) : undefined,
            query: options.query ? Object.assign({}, options.query) : undefined,
            params: options.params ? Object.assign({}, options.params) : undefined,
        });
    }
}
