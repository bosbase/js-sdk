import { BaseService } from "@/services/BaseService";
import { SendOptions } from "@/tools/options";
import {
    LLMDocument,
    LLMDocumentUpdate,
    LLMQueryOptions,
    LLMQueryResult,
} from "@/tools/llm-types";

export interface LLMServiceOptions extends SendOptions {
    collection: string;
}

export class LLMDocumentService extends BaseService {
    private get basePath(): string {
        return "/api/llm-documents";
    }

    private collectionsPath(): string {
        return `${this.basePath}/collections`;
    }

    private collectionPath(collection: string): string {
        if (!collection) {
            throw new Error("collection is required");
        }
        return `${this.basePath}/${encodeURIComponent(collection)}`;
    }

    async listCollections(options?: SendOptions): Promise<Array<{ name: string; count: number; metadata: Record<string, string> }>> {
        return this.client.send(this.collectionsPath(), {
            method: "GET",
            ...options,
        });
    }

    async createCollection(
        name: string,
        metadata?: Record<string, string>,
        options?: SendOptions,
    ): Promise<void> {
        await this.client.send(`${this.collectionsPath()}/${encodeURIComponent(name)}`, {
            method: "POST",
            body: { metadata },
            ...options,
        });
    }

    async deleteCollection(name: string, options?: SendOptions): Promise<void> {
        await this.client.send(`${this.collectionsPath()}/${encodeURIComponent(name)}`, {
            method: "DELETE",
            ...options,
        });
    }

    async insert(document: LLMDocument, options: LLMServiceOptions): Promise<{ id: string; success: boolean }> {
        return this.client.send(this.collectionPath(options.collection), {
            method: "POST",
            body: document,
            ...options,
        });
    }

    async get(id: string, options: LLMServiceOptions): Promise<LLMDocument> {
        return this.client.send(`${this.collectionPath(options.collection)}/${encodeURIComponent(id)}`, {
            method: "GET",
            ...options,
        });
    }

    // Alias for get() to mirror other SDK surfaces.
    async getOne(id: string, options: LLMServiceOptions): Promise<LLMDocument> {
        return this.get(id, options);
    }

    async update(
        id: string,
        document: LLMDocumentUpdate,
        options: LLMServiceOptions,
    ): Promise<{ success: boolean }> {
        return this.client.send(`${this.collectionPath(options.collection)}/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: document,
            ...options,
        });
    }

    async delete(id: string, options: LLMServiceOptions): Promise<void> {
        await this.client.send(`${this.collectionPath(options.collection)}/${encodeURIComponent(id)}`, {
            method: "DELETE",
            ...options,
        });
    }

    async list(
        options: LLMServiceOptions & { page?: number; perPage?: number },
    ): Promise<{ items: LLMDocument[]; page: number; perPage: number; totalItems: number }> {
        return this.client.send(this.collectionPath(options.collection), {
            method: "GET",
            query: {
                page: options.page,
                perPage: options.perPage,
                ...(options.query ?? {}),
            },
            ...options,
        });
    }

    async query(
        payload: LLMQueryOptions,
        options: LLMServiceOptions,
    ): Promise<{ results: LLMQueryResult[] }> {
        return this.client.send(`${this.collectionPath(options.collection)}/documents/query`, {
            method: "POST",
            body: payload,
            ...options,
        });
    }
}
