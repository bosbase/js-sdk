import { BaseService } from "@/services/BaseService";
import {
    VectorDocument,
    VectorSearchOptions,
    VectorSearchResponse,
    VectorBatchInsertOptions,
    VectorBatchInsertResponse,
    VectorInsertResponse,
    VectorEmbedding,
} from "@/tools/vector-types";
import { SendOptions } from "@/tools/options";

export interface VectorServiceOptions extends SendOptions {
    /**
     * Collection or table name to operate on.
     */
    collection?: string;
}

/**
 * VectorService provides an abstracted interface for vector database operations.
 * This abstraction allows support for multiple vector databases through a unified API.
 */
export class VectorService extends BaseService {
    /**
     * Base path for vector operations.
     */
    private get baseVectorPath(): string {
        return "/api/vectors";
    }

    /**
     * Collection-specific path.
     */
    private getPath(collection?: string): string {
        if (collection) {
            return `${this.baseVectorPath}/${encodeURIComponent(collection)}`;
        }
        return this.baseVectorPath;
    }

    /**
     * Insert a single vector document.
     *
     * @example
     * ```js
     * const result = await pb.vectors.insert({
     *     vector: [0.1, 0.2, 0.3],
     *     metadata: { category: 'example' },
     *     content: 'Example text'
     * }, { collection: 'documents' });
     * ```
     */
    async insert(
        document: VectorDocument,
        options?: VectorServiceOptions,
    ): Promise<VectorInsertResponse> {
        const path = this.getPath(options?.collection);

        return this.client.send<VectorInsertResponse>(path, {
            method: "POST",
            body: document,
            ...options,
        });
    }

    /**
     * Insert multiple vector documents in a batch.
     *
     * @example
     * ```js
     * const result = await pb.vectors.batchInsert({
     *     documents: [
     *         { vector: [0.1, 0.2, 0.3], content: 'Example 1' },
     *         { vector: [0.4, 0.5, 0.6], content: 'Example 2' }
     *     ],
     *     skipDuplicates: true
     * }, { collection: 'documents' });
     * ```
     */
    async batchInsert(
        data: VectorBatchInsertOptions,
        options?: VectorServiceOptions,
    ): Promise<VectorBatchInsertResponse> {
        const path = `${this.getPath(options?.collection)}/documents/batch`;

        return this.client.send<VectorBatchInsertResponse>(path, {
            method: "POST",
            body: data,
            ...options,
        });
    }

    /**
     * Update an existing vector document.
     *
     * @example
     * ```js
     * const result = await pb.vectors.update('doc_id', {
     *     vector: [0.1, 0.2, 0.3],
     *     metadata: { updated: true }
     * }, { collection: 'documents' });
     * ```
     */
    async update(
        id: string,
        document: Partial<VectorDocument>,
        options?: VectorServiceOptions,
    ): Promise<VectorInsertResponse> {
        const path = `${this.getPath(options?.collection)}/${encodeURIComponent(id)}`;

        return this.client.send<VectorInsertResponse>(path, {
            method: "PATCH",
            body: document,
            ...options,
        });
    }

    /**
     * Delete a vector document by ID.
     *
     * @example
     * ```js
     * await pb.vectors.delete('doc_id', { collection: 'documents' });
     * ```
     */
    async delete(id: string, options?: VectorServiceOptions): Promise<void> {
        const path = `${this.getPath(options?.collection)}/${encodeURIComponent(id)}`;

        await this.client.send(path, {
            method: "DELETE",
            ...options,
        });
    }

    /**
     * Search for similar vectors.
     *
     * @example
     * ```js
     * const results = await pb.vectors.search({
     *     queryVector: [0.1, 0.2, 0.3],
     *     limit: 10,
     *     minScore: 0.7
     * }, { collection: 'documents' });
     * ```
     */
    async search(
        searchOptions: VectorSearchOptions,
        options?: VectorServiceOptions,
    ): Promise<VectorSearchResponse> {
        const path = `${this.getPath(options?.collection)}/documents/search`;

        return this.client.send<VectorSearchResponse>(path, {
            method: "POST",
            body: searchOptions,
            ...options,
        });
    }

    /**
     * Get a vector document by ID.
     *
     * @example
     * ```js
     * const doc = await pb.vectors.get('doc_id', { collection: 'documents' });
     * ```
     */
    async get(id: string, options?: VectorServiceOptions): Promise<VectorDocument> {
        const path = `${this.getPath(options?.collection)}/${encodeURIComponent(id)}`;

        return this.client.send<VectorDocument>(path, {
            method: "GET",
            ...options,
        });
    }

    /**
     * List all vector documents in a collection (with optional pagination).
     *
     * @example
     * ```js
     * const docs = await pb.vectors.list({
     *     page: 1,
     *     perPage: 100
     * }, { collection: 'documents' });
     * ```
     */
    async list(
        options?: VectorServiceOptions & { page?: number; perPage?: number },
    ): Promise<{ items: VectorDocument[]; page: number; perPage: number; totalItems: number }> {
        const path = this.getPath(options?.collection);

        return this.client.send(path, {
            method: "GET",
            ...options,
        });
    }

    /**
     * Create or ensure a vector collection/table exists.
     *
     * @example
     * ```js
     * await pb.vectors.createCollection('documents', {
     *     dimension: 384,
     *     distance: 'cosine'
     * });
     * ```
     */
    async createCollection(
        name: string,
        config?: { dimension?: number; distance?: string },
        options?: VectorServiceOptions,
    ): Promise<void> {
        const path = `${this.getPath()}/collections/${encodeURIComponent(name)}`;

        await this.client.send(path, {
            method: "POST",
            body: config || {},
            ...options,
        });
    }

    /**
     * Update a vector collection configuration (distance metric and options).
     * Note: Collection name and dimension cannot be changed after creation.
     *
     * @example
     * ```js
     * await pb.vectors.updateCollection('documents', {
     *     distance: 'l2'  // Change from cosine to L2
     * });
     * ```
     */
    async updateCollection(
        name: string,
        config?: { distance?: string; options?: Record<string, any> },
        options?: VectorServiceOptions,
    ): Promise<void> {
        const path = `${this.getPath()}/collections/${encodeURIComponent(name)}`;

        await this.client.send(path, {
            method: "PATCH",
            body: config || {},
            ...options,
        });
    }

    /**
     * Delete a vector collection/table.
     *
     * @example
     * ```js
     * await pb.vectors.deleteCollection('documents');
     * ```
     */
    async deleteCollection(name: string, options?: VectorServiceOptions): Promise<void> {
        const path = `${this.getPath()}/collections/${encodeURIComponent(name)}`;

        await this.client.send(path, {
            method: "DELETE",
            ...options,
        });
    }

    /**
     * List all available vector collections.
     *
     * @example
     * ```js
     * const collections = await pb.vectors.listCollections();
     * ```
     */
    async listCollections(options?: VectorServiceOptions): Promise<Array<{ name: string; dimension?: number; count?: number }>> {
        const path = `${this.getPath()}/collections`;

        return this.client.send(path, {
            method: "GET",
            ...options,
        });
    }
}

