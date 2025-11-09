/**
 * Types for LLM document APIs backed by chromem-go.
 */

export interface LLMDocument {
    /**
     * Unique identifier for the document.
     */
    id?: string;

    /**
     * Source text that embeddings are derived from.
     */
    content: string;

    /**
     * Optional metadata for filtering.
     */
    metadata?: Record<string, string>;

    /**
     * Optional embedding vector. If omitted, the server may derive it.
     */
    embedding?: number[];
}

export interface LLMDocumentUpdate {
    content?: string;
    metadata?: Record<string, string>;
    embedding?: number[];
}

export interface LLMQueryOptions {
    queryText?: string;
    queryEmbedding?: number[];
    limit?: number;
    where?: Record<string, string>;
    negative?: {
        text?: string;
        embedding?: number[];
        mode?: string;
        filterThreshold?: number;
    };
}

export interface LLMQueryResult {
    id: string;
    content: string;
    metadata: Record<string, string>;
    similarity: number;
}
