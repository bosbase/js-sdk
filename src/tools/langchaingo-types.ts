export interface LangChaingoModelConfig {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
}

export interface LangChaingoCompletionMessage {
    role?: string;
    content: string;
}

export interface LangChaingoCompletionRequest {
    model?: LangChaingoModelConfig;
    prompt?: string;
    messages?: LangChaingoCompletionMessage[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    candidateCount?: number;
    stop?: string[];
    json?: boolean;
}

export interface LangChaingoFunctionCall {
    name: string;
    arguments: string;
}

export interface LangChaingoToolCall {
    id: string;
    type: string;
    functionCall?: LangChaingoFunctionCall;
}

export interface LangChaingoCompletionResponse {
    content: string;
    stopReason?: string;
    generationInfo?: Record<string, unknown>;
    functionCall?: LangChaingoFunctionCall;
    toolCalls?: LangChaingoToolCall[];
}

export interface LangChaingoRAGFilters {
    where?: Record<string, string>;
    whereDocument?: Record<string, string>;
}

export interface LangChaingoRAGRequest {
    model?: LangChaingoModelConfig;
    collection: string;
    question: string;
    topK?: number;
    scoreThreshold?: number;
    filters?: LangChaingoRAGFilters;
    promptTemplate?: string;
    returnSources?: boolean;
}

export interface LangChaingoSourceDocument {
    content: string;
    metadata?: Record<string, unknown>;
    score?: number;
}

export interface LangChaingoRAGResponse {
    answer: string;
    sources?: LangChaingoSourceDocument[];
}
