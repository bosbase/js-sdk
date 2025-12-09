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
