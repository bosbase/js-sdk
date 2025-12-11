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
