import { BaseService } from "@/services/BaseService";
import { CommonOptions } from "@/tools/options";

export interface CacheConfigSummary {
    name: string;
    sizeBytes: number;
    defaultTTLSeconds: number;
    readTimeoutMs: number;
    created: string;
    updated: string;
}

export interface CacheEntry<T = any> {
    cache: string;
    key: string;
    value: T;
    source: "cache" | "database";
    expiresAt?: string;
}

export interface CreateCacheBody {
    name: string;
    sizeBytes?: number;
    defaultTTLSeconds?: number;
    readTimeoutMs?: number;
}

export interface UpdateCacheBody {
    sizeBytes?: number;
    defaultTTLSeconds?: number;
    readTimeoutMs?: number;
}

export interface CacheEntryBody<T = any> {
    value: T;
    ttlSeconds?: number;
}

export class CacheService extends BaseService {
    /**
     * Lists all configured caches.
     */
    async list(options?: CommonOptions): Promise<CacheConfigSummary[]> {
        options = Object.assign({ method: "GET" }, options);

        const response = await this.client.send("/api/cache", options);
        return response?.items ?? [];
    }

    /**
     * Creates a cache configuration.
     */
    async create(
        body: CreateCacheBody,
        options?: CommonOptions,
    ): Promise<CacheConfigSummary> {
        options = Object.assign(
            {
                method: "POST",
                body,
            },
            options,
        );

        return this.client.send("/api/cache", options);
    }

    /**
     * Updates a cache configuration.
     */
    async update(
        name: string,
        body: UpdateCacheBody,
        options?: CommonOptions,
    ): Promise<CacheConfigSummary> {
        options = Object.assign(
            {
                method: "PATCH",
                body,
            },
            options,
        );

        return this.client.send(`/api/cache/${encodeURIComponent(name)}`, options);
    }

    /**
     * Deletes a cache.
     */
    async delete(name: string, options?: CommonOptions): Promise<boolean> {
        options = Object.assign({ method: "DELETE" }, options);

        await this.client.send(`/api/cache/${encodeURIComponent(name)}`, options);
        return true;
    }

    /**
     * Creates or replaces a cache entry.
     */
    async setEntry<T = any>(
        cache: string,
        key: string,
        value: T,
        ttlSeconds?: number,
        options?: CommonOptions,
    ): Promise<CacheEntry<T>> {
        const body: CacheEntryBody<T> = { value };
        if (typeof ttlSeconds === "number") {
            body.ttlSeconds = ttlSeconds;
        }

        options = Object.assign(
            {
                method: "PUT",
                body,
            },
            options,
        );

        return this.client.send(
            `/api/cache/${encodeURIComponent(cache)}/entries/${encodeURIComponent(key)}`,
            options,
        );
    }

    /**
     * Reads a cache entry.
     */
    async getEntry<T = any>(
        cache: string,
        key: string,
        options?: CommonOptions,
    ): Promise<CacheEntry<T>> {
        options = Object.assign({ method: "GET" }, options);

        return this.client.send(
            `/api/cache/${encodeURIComponent(cache)}/entries/${encodeURIComponent(key)}`,
            options,
        );
    }

    /**
     * Deletes a cache entry.
     */
    async deleteEntry(
        cache: string,
        key: string,
        options?: CommonOptions,
    ): Promise<boolean> {
        options = Object.assign({ method: "DELETE" }, options);

        await this.client.send(
            `/api/cache/${encodeURIComponent(cache)}/entries/${encodeURIComponent(key)}`,
            options,
        );

        return true;
    }
}

