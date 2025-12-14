import { BaseService } from "@/services/BaseService";
import { SendOptions } from "@/tools/options";
import {
    ScriptCreate,
    ScriptExecuteParams,
    ScriptExecutionResult,
    ScriptRecord,
    ScriptUpdate,
    ScriptUploadParams,
    ScriptUploadResult,
    ScriptWasmParams,
} from "@/tools/script-types";

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
     * Execute an arbitrary shell command in the functions directory.
     *
     * Requires superuser authentication.
     */
    async command(command: string, options?: SendOptions): Promise<ScriptExecutionResult> {
        this.requireSuperuser();

        const trimmed = command?.trim();
        if (!trimmed) {
            throw new Error("command is required");
        }

        return this.client.send<ScriptExecutionResult>(`${this.basePath}/command`, {
            method: "POST",
            body: { command: trimmed },
            ...options,
        });
    }

    /**
     * Upload a file to the EXECUTE_PATH directory (default /pb/functions).
     * Overwrites existing files and returns the upload output.
     *
     * Requires superuser authentication.
     */
    async upload(
        fileOrParams: FormData | ScriptUploadParams | Blob | File,
        options?: SendOptions,
    ): Promise<ScriptUploadResult> {
        this.requireSuperuser();

        const body = this.prepareUploadBody(fileOrParams);

        return this.client.send<ScriptUploadResult>(`${this.basePath}/upload`, {
            method: "POST",
            body,
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
     * Execute a stored script.
     *
     * @param name - The name of the script to execute
     * @param paramsOrArgs - Either a params object with arguments and function_name, or an array of string arguments (for backward compatibility)
     * @param options - Optional send options
     *
     * Requires superuser authentication.
     */
    async execute(
        name: string,
        paramsOrArgs?: ScriptExecuteParams | Array<string> | SendOptions,
        options?: SendOptions,
    ): Promise<ScriptExecutionResult> {
        this.requireSuperuser();

        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new Error("script name is required");
        }

        let body: ScriptExecuteParams | undefined;
        let sendOptions: SendOptions | undefined;

        // Handle different parameter patterns for backward compatibility
        if (Array.isArray(paramsOrArgs)) {
            // Old signature: execute(name, args[], options?)
            body = { arguments: paramsOrArgs };
            sendOptions = options;
        } else if (
            paramsOrArgs &&
            typeof paramsOrArgs === "object" &&
            ("arguments" in paramsOrArgs || "function_name" in paramsOrArgs)
        ) {
            // New signature: execute(name, { arguments: [], function_name: "..." }, options?)
            body = paramsOrArgs as ScriptExecuteParams;
            sendOptions = options;
        } else if (paramsOrArgs && typeof paramsOrArgs === "object") {
            // Old signature: execute(name, options?)
            sendOptions = paramsOrArgs as SendOptions;
        } else {
            sendOptions = options;
        }

        // Ensure body has the correct structure
        if (body) {
            if (body.arguments) {
                body.arguments = body.arguments.map((arg) => (typeof arg === "string" ? arg : String(arg)));
            }
            // function_name is optional and will be handled by the backend
        }

        return this.client.send<ScriptExecutionResult>(
            `${this.basePath}/${encodeURIComponent(trimmedName)}/execute`,
            {
                method: "POST",
                ...(body ? { body } : {}),
                ...sendOptions,
            },
        );
    }

    /**
     * Execute a WASM file inside EXECUTE_PATH using wasmedge.
     *
     * Permission is determined by script permissions for the provided wasm name.
     * Default permission is superuser-only when no entry exists.
     */
    async wasm(
        cliOptions: string,
        wasmName: string,
        params?: string,
        requestOptions?: SendOptions,
    ): Promise<ScriptExecutionResult> {
        const trimmedName = wasmName?.trim();
        if (!trimmedName) {
            throw new Error("wasm name is required");
        }

        const body: ScriptWasmParams = {
            options: cliOptions?.trim() || "",
            wasm: trimmedName,
            params: params?.trim() || "",
        };

        return this.client.send<ScriptExecutionResult>(`${this.basePath}/wasm`, {
            method: "POST",
            body,
            ...requestOptions,
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

    private prepareUploadBody(
        fileOrParams: FormData | ScriptUploadParams | Blob | File,
    ): FormData | ScriptUploadParams {
        if (typeof FormData !== "undefined" && fileOrParams instanceof FormData) {
            return fileOrParams;
        }

        const params =
            fileOrParams && typeof fileOrParams === "object" && "file" in (fileOrParams as any)
                ? (fileOrParams as ScriptUploadParams)
                : ({ file: fileOrParams } as ScriptUploadParams);

        const file = params.file;
        if (!file) {
            throw new Error("file is required");
        }

        const path = params.path?.trim() || "";
        const filename =
            path || (typeof (file as any)?.name === "string" ? (file as any).name : "") || "upload.bin";

        if (typeof FormData !== "undefined") {
            const form = new FormData();
            const useNamedAppend =
                (typeof Blob !== "undefined" && file instanceof Blob) ||
                (typeof File !== "undefined" && file instanceof File);
            if (useNamedAppend && filename) {
                form.append("file", file as any, filename);
            } else {
                form.append("file", file as any);
            }

            if (path) {
                form.append("path", path);
            }

            return form;
        }

        const body: ScriptUploadParams = { file };
        if (path) {
            body.path = path;
        }

        return body;
    }

    private requireSuperuser(): void {
        if (!this.client.authStore.isSuperuser) {
            throw new Error("Superuser authentication is required to manage scripts");
        }
    }
}
