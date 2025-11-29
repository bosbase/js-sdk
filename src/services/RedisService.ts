import { BaseService } from "@/services/BaseService";
import { CommonOptions } from "@/tools/options";

export interface RedisKeySummary {
    key: string;
}

export interface RedisEntry<T = any> {
    key: string;
    value: T;
    ttlSeconds?: number;
}

export interface RedisListPage {
    cursor: string;
    items: RedisKeySummary[];
}

export interface CreateRedisKeyBody<T = any> {
    key: string;
    value: T;
    ttlSeconds?: number;
}

export interface UpdateRedisKeyBody<T = any> {
    value: T;
    ttlSeconds?: number;
}

export class RedisService extends BaseService {
    /**
     * Iterates redis keys using SCAN.
     */
    async listKeys(
        query?: { cursor?: string | number; pattern?: string; count?: number },
        options?: CommonOptions,
    ): Promise<RedisListPage> {
        options = Object.assign(
            {
                method: "GET",
                query: Object.assign({}, query),
            },
            options,
        );

        return this.client.send("/api/redis/keys", options);
    }

    /**
     * Creates a new key only if it doesn't exist.
     */
    async createKey<T = any>(
        body: CreateRedisKeyBody<T>,
        options?: CommonOptions,
    ): Promise<RedisEntry<T>> {
        options = Object.assign(
            {
                method: "POST",
                body,
            },
            options,
        );

        return this.client.send("/api/redis/keys", options);
    }

    /**
     * Reads a key value.
     */
    async getKey<T = any>(key: string, options?: CommonOptions): Promise<RedisEntry<T>> {
        options = Object.assign({ method: "GET" }, options);

        return this.client.send(`/api/redis/keys/${encodeURIComponent(key)}`, options);
    }

    /**
     * Updates an existing key. If ttlSeconds is omitted the existing TTL is preserved.
     */
    async updateKey<T = any>(
        key: string,
        body: UpdateRedisKeyBody<T>,
        options?: CommonOptions,
    ): Promise<RedisEntry<T>> {
        options = Object.assign(
            {
                method: "PUT",
                body,
            },
            options,
        );

        return this.client.send(`/api/redis/keys/${encodeURIComponent(key)}`, options);
    }

    /**
     * Deletes a key.
     */
    async deleteKey(key: string, options?: CommonOptions): Promise<boolean> {
        options = Object.assign({ method: "DELETE" }, options);

        await this.client.send(`/api/redis/keys/${encodeURIComponent(key)}`, options);
        return true;
    }
}
