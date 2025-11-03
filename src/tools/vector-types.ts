/**
 * Vector types and interfaces for abstracted vector database support.
 * This abstraction allows for compatibility with different vector databases.
 */

/**
 * Represents a vector embedding as an array of numbers.
 */
export type VectorEmbedding = number[];

/**
 * Metadata associated with a vector (optional key-value pairs).
 */
export interface VectorMetadata {
    [key: string]: any;
}

/**
 * A vector document/record that can be stored and queried.
 */
export interface VectorDocument {
    /**
     * Unique identifier for the vector document.
     */
    id?: string;

    /**
     * The vector embedding.
     */
    vector: VectorEmbedding;

    /**
     * Optional metadata to attach to the vector.
     */
    metadata?: VectorMetadata;

    /**
     * Optional content/text that this vector represents (for display purposes).
     */
    content?: string;
}

/**
 * A result from a vector similarity search.
 */
export interface VectorSearchResult {
    /**
     * The vector document that matched.
     */
    document: VectorDocument;

    /**
     * The similarity score (higher is better, typically 0-1 range).
     */
    score: number;

    /**
     * Optional distance metric value (lower is better).
     */
    distance?: number;
}

/**
 * Options for vector search operations.
 */
export interface VectorSearchOptions {
    /**
     * The query vector to search for.
     */
    queryVector: VectorEmbedding;

    /**
     * Maximum number of results to return.
     */
    limit?: number;

    /**
     * Optional filter metadata criteria.
     */
    filter?: VectorMetadata;

    /**
     * Minimum score threshold (results below this will be filtered out).
     */
    minScore?: number;

    /**
     * Minimum distance threshold (results above this will be filtered out).
     */
    maxDistance?: number;

    /**
     * Whether to return distances in addition to scores.
     */
    includeDistance?: boolean;

    /**
     * Whether to include the full document content.
     */
    includeContent?: boolean;
}

/**
 * Options for batch vector insert operations.
 */
export interface VectorBatchInsertOptions {
    /**
     * The vectors to insert.
     */
    documents: VectorDocument[];

    /**
     * Whether to skip duplicate IDs.
     */
    skipDuplicates?: boolean;
}

/**
 * Response from a vector search operation.
 */
export interface VectorSearchResponse {
    /**
     * The search results.
     */
    results: VectorSearchResult[];

    /**
     * Total number of vectors that matched before limit.
     */
    totalMatches?: number;

    /**
     * Query execution time in milliseconds.
     */
    queryTime?: number;
}

/**
 * Response from a vector insert operation.
 */
export interface VectorInsertResponse {
    /**
     * The inserted document ID (if generated).
     */
    id: string;

    /**
     * Whether the insert succeeded.
     */
    success: boolean;
}

/**
 * Response from a batch vector insert operation.
 */
export interface VectorBatchInsertResponse {
    /**
     * Number of successfully inserted vectors.
     */
    insertedCount: number;

    /**
     * Number of failed insertions.
     */
    failedCount: number;

    /**
     * List of inserted document IDs.
     */
    ids: string[];

    /**
     * List of errors (if any).
     */
    errors?: string[];
}

/**
 * Vector database provider type.
 */
export type VectorProvider = "sqlite_vec" | "pinecone" | "weaviate" | "qdrant" | "milvus" | "custom";

/**
 * Configuration for vector operations.
 */
export interface VectorConfig {
    /**
     * The vector database provider to use.
     */
    provider: VectorProvider;

    /**
     * Configuration specific to the provider.
     */
    providerConfig?: {
        [key: string]: any;
    };
}

