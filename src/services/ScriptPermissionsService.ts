import { BaseService } from "@/services/BaseService";
import { SendOptions } from "@/tools/options";
import {
    ScriptPermissionCreate,
    ScriptPermissionRecord,
    ScriptPermissionUpdate,
} from "@/tools/script-types";

export class ScriptPermissionsService extends BaseService {
    private readonly basePath = "/api/script-permissions";

    async create(data: ScriptPermissionCreate, options?: SendOptions): Promise<ScriptPermissionRecord> {
        this.requireSuperuser();

        if (!data?.scriptName?.trim()) {
            throw new Error("scriptName is required");
        }
        if (!data?.content?.trim()) {
            throw new Error("content is required");
        }

        return this.client.send<ScriptPermissionRecord>(this.basePath, {
            method: "POST",
            body: {
                script_id: data.scriptId?.trim(),
                script_name: data.scriptName.trim(),
                content: data.content.trim(),
            },
            ...options,
        });
    }

    async get(scriptName: string, options?: SendOptions): Promise<ScriptPermissionRecord> {
        this.requireSuperuser();

        const name = scriptName?.trim();
        if (!name) {
            throw new Error("scriptName is required");
        }

        return this.client.send<ScriptPermissionRecord>(`${this.basePath}/${encodeURIComponent(name)}`, {
            method: "GET",
            ...options,
        });
    }

    async update(
        scriptName: string,
        data: ScriptPermissionUpdate,
        options?: SendOptions,
    ): Promise<ScriptPermissionRecord> {
        this.requireSuperuser();

        const name = scriptName?.trim();
        if (!name) {
            throw new Error("scriptName is required");
        }

        return this.client.send<ScriptPermissionRecord>(`${this.basePath}/${encodeURIComponent(name)}`, {
            method: "PATCH",
            body: {
                script_id: data.scriptId?.trim(),
                script_name: data.scriptName?.trim(),
                content: data.content?.trim(),
            },
            ...options,
        });
    }

    async delete(scriptName: string, options?: SendOptions): Promise<boolean> {
        this.requireSuperuser();

        const name = scriptName?.trim();
        if (!name) {
            throw new Error("scriptName is required");
        }

        await this.client.send(`${this.basePath}/${encodeURIComponent(name)}`, {
            method: "DELETE",
            ...options,
        });

        return true;
    }

    private requireSuperuser(): void {
        if (!this.client.authStore.isSuperuser) {
            throw new Error("Superuser authentication is required to manage script permissions");
        }
    }
}
