export interface ScriptRecord {
    id: string;
    name: string;
    content: string;
    description?: string;
    version: number;
    created?: string;
    updated?: string;
}

export interface ScriptCreate {
    name: string;
    content: string;
    description?: string;
}

export interface ScriptUpdate {
    content?: string;
    description?: string;
}

export interface ScriptExecutionResult {
    output: string;
    stdout?: string;
    stderr?: string;
    duration?: string;
}

export type ScriptExecuteJobStatus = "running" | "done" | "error";

export interface ScriptExecuteJob {
    id: string;
    scriptName: string;
    status: ScriptExecuteJobStatus;
    output: string;
    error: string;
    startedAt: string;
    finishedAt?: string;
}

export interface ScriptExecuteAsyncResponse {
    id: string;
    status: ScriptExecuteJobStatus;
}

export interface ScriptWasmJob {
    id: string;
    wasmName: string;
    status: ScriptExecuteJobStatus;
    output: string;
    stdout: string;
    stderr: string;
    error: string;
    duration: string;
    startedAt: string;
    finishedAt?: string;
}

export interface ScriptWasmAsyncResponse {
    id: string;
    status: ScriptExecuteJobStatus;
}

export type ScriptCommandJobStatus = "running" | "done" | "error";

export interface ScriptCommandJob {
    id: string;
    command: string;
    status: ScriptCommandJobStatus;
    output: string;
    error: string;
    startedAt: string;
    finishedAt?: string;
}

export interface ScriptCommandAsyncResponse {
    id: string;
    status: ScriptCommandJobStatus;
}

export interface ScriptExecuteParams {
    /**
     * Command-line arguments to pass to the script.
     */
    arguments?: Array<string>;
    /**
     * Function name to execute within the script.
     * Defaults to "main" if not provided.
     */
    function_name?: string;
}

export interface ScriptExecuteSSEOptions {
    /**
     * Additional headers to send with the EventSource request (where supported).
     */
    headers?: Record<string, string>;
    /**
     * Additional query parameters to append to the URL.
     */
    query?: Record<string, any>;
    /**
     * EventSource init options passed to the constructor.
     */
    eventSourceInit?: EventSourceInit;
}

export interface ScriptExecuteWebSocketOptions {
    /**
     * Additional headers to send with the websocket upgrade (where supported).
     */
    headers?: Record<string, string>;
    /**
     * Additional query parameters to append to the URL.
     */
    query?: Record<string, any>;
    /**
     * Optional websocket subprotocols.
     */
    websocketProtocols?: string | string[];
}

export interface ScriptWasmParams {
    options?: string;
    wasm: string;
    params?: string;
}

export interface ScriptUploadParams {
    /**
     * File content to upload (Blob/File or React Native file object).
     */
    file: Blob | File | { uri: string; name?: string; type?: string };
    /**
     * Target relative path (including filename) inside EXECUTE_PATH.
     * Defaults to the uploaded file name when omitted.
     */
    path?: string;
}

export interface ScriptUploadResult {
    output: string;
    path?: string;
}

export interface ScriptPermissionRecord {
    id: string;
    scriptId?: string;
    scriptName: string;
    content: "anonymous" | "user" | "superuser";
    version: number;
    created?: string;
    updated?: string;
}

export interface ScriptPermissionCreate {
    scriptName: string;
    scriptId?: string;
    content: string;
}

export interface ScriptPermissionUpdate {
    scriptName?: string;
    scriptId?: string;
    content?: string;
}
