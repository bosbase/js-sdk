import { BaseService } from "@/services/BaseService";
import { SendOptions } from "@/tools/options";
import { ScriptCreate, ScriptRecord, ScriptUpdate } from "@/tools/script-types";

export class ScriptService extends BaseService {
    private readonly basePath = "/api/scripts";

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

        return this.client.send<ScriptRecord>(this.basePath, {
            method: "POST",
            body: {
                name,
                content: data.content,
                description: data.description ?? "",
            },
            ...options,
        });
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

        return this.client.send<ScriptRecord>(`${this.basePath}/${encodeURIComponent(trimmedName)}`, {
            method: "GET",
            ...options,
        });
    }

    /**
     * List all scripts.
     *
     * Requires superuser authentication.
     */
    async list(options?: SendOptions): Promise<Array<ScriptRecord>> {
        this.requireSuperuser();

        const response = await this.client.send<{ items: Array<ScriptRecord> }>(this.basePath, {
            method: "GET",
            ...options,
        });

        return response?.items || [];
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

        return this.client.send<ScriptRecord>(`${this.basePath}/${encodeURIComponent(trimmedName)}`, {
            method: "PATCH",
            body: changes,
            ...options,
        });
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

        await this.client.send(`${this.basePath}/${encodeURIComponent(trimmedName)}`, {
            method: "DELETE",
            ...options,
        });

        return true;
    }

    private requireSuperuser(): void {
        if (!this.client.authStore.isSuperuser) {
            throw new Error("Superuser authentication is required to manage scripts");
        }
    }
}
