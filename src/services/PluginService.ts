import { BaseService } from "@/services/BaseService";
import {
    SendOptions,
    normalizeUnknownQueryParams,
    serializeQueryParams,
} from "@/tools/options";

const pluginHttpMethods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
] as const;

const pluginSseMethods = ["SSE"] as const;
const pluginWebSocketMethods = ["WS", "WEBSOCKET"] as const;

const allowedPluginMethods = [
    ...pluginHttpMethods,
    ...pluginSseMethods,
    ...pluginWebSocketMethods,
] as const;

export type PluginHTTPMethod = (typeof pluginHttpMethods)[number];
export type PluginSSEMethod = (typeof pluginSseMethods)[number];
export type PluginWebSocketMethod = (typeof pluginWebSocketMethods)[number];

export type PluginMethod = PluginHTTPMethod | PluginSSEMethod | PluginWebSocketMethod;

export type PluginHTTPMethodInput = PluginHTTPMethod | Lowercase<PluginHTTPMethod>;
export type PluginSSEMethodInput = PluginSSEMethod | Lowercase<PluginSSEMethod>;
export type PluginWebSocketMethodInput =
    | PluginWebSocketMethod
    | Lowercase<PluginWebSocketMethod>;

export type PluginMethodInput = PluginMethod | Lowercase<PluginMethod>;

export interface PluginRequestOptions extends SendOptions {}

export interface PluginSSERequestOptions extends PluginRequestOptions {
    eventSourceInit?: EventSourceInit;
}

export interface PluginWebSocketRequestOptions extends PluginRequestOptions {
    websocketProtocols?: string | string[];
}

/**
 * PluginService forwards requests to the configured plugin proxy endpoint.
 */
export class PluginService extends BaseService {
    /**
     * Send a request to the plugin proxy endpoint.
     */
    request(
        method: PluginSSEMethodInput,
        path: string,
        options?: PluginSSERequestOptions,
    ): EventSource;
    request(
        method: PluginWebSocketMethodInput,
        path: string,
        options?: PluginWebSocketRequestOptions,
    ): WebSocket;
    request<T = any>(
        method: PluginHTTPMethodInput,
        path: string,
        options?: PluginRequestOptions,
    ): Promise<T>;
    request<T = any>(
        method: PluginMethodInput,
        path: string,
        options?: PluginRequestOptions,
    ): Promise<T> | EventSource | WebSocket {
        const normalizedMethod = (method || "").toUpperCase() as PluginMethod;
        if (!allowedPluginMethods.includes(normalizedMethod)) {
            throw new Error(
                `Unsupported plugin method "${method}", expected one of ${allowedPluginMethods.join(", ")}`,
            );
        }

        const targetPath = this.normalizePath(path);

        if (this.isSseMethod(normalizedMethod)) {
            return this.createEventSource(targetPath, options as PluginSSERequestOptions);
        }

        if (this.isWebSocketMethod(normalizedMethod)) {
            return this.createWebSocket(targetPath, options as PluginWebSocketRequestOptions);
        }

        const { eventSourceInit, websocketProtocols, ...restOptions } = options || {};

        return this.client.send<T>(targetPath, {
            ...(restOptions || {}),
            method: normalizedMethod,
        });
    }

    private isSseMethod(method: PluginMethod): method is PluginSSEMethod {
        return (pluginSseMethods as readonly string[]).includes(method);
    }

    private isWebSocketMethod(method: PluginMethod): method is PluginWebSocketMethod {
        return (pluginWebSocketMethods as readonly string[]).includes(method);
    }

    private normalizePath(path: string): string {
        const normalizedPath = (path || "").replace(/^\/+/, "");

        return normalizedPath
            ? normalizedPath.startsWith("api/plugins")
                ? `/${normalizedPath}`
                : `/api/plugins/${normalizedPath}`
            : "/api/plugins";
    }

    private createEventSource(
        targetPath: string,
        options?: PluginSSERequestOptions,
    ): EventSource {
        if (typeof EventSource === "undefined") {
            throw new Error("EventSource is not available in this runtime environment.");
        }

        const url = this.buildURL(targetPath, options, true);

        const init: EventSourceInit & { headers?: { [key: string]: string } } = {
            ...(options?.eventSourceInit || {}),
        };

        if (options?.headers) {
            init.headers = options.headers;
        }

        return new EventSource(url, init);
    }

    private createWebSocket(
        targetPath: string,
        options?: PluginWebSocketRequestOptions,
    ): WebSocket {
        if (typeof WebSocket === "undefined") {
            throw new Error("WebSocket is not available in this runtime environment.");
        }

        let url: URL;
        try {
            url = new URL(
                this.buildURL(targetPath, options, true),
                typeof window !== "undefined" ? window.location.href : "http://localhost",
            );
        } catch {
            url = new URL("http://localhost");
        }

        if (url.protocol === "https:") {
            url.protocol = "wss:";
        } else if (url.protocol === "http:") {
            url.protocol = "ws:";
        } else if (!url.protocol || url.protocol === ":") {
            url.protocol = "ws:";
        }

        const ctor: any = WebSocket as any;
        const protocols = options?.websocketProtocols;

        if (options?.headers) {
            try {
                return new ctor(url.toString(), protocols, { headers: options.headers });
            } catch (_) {
                // fallback to native signature below
            }
        }

        return new ctor(url.toString(), protocols);
    }

    private buildURL(
        targetPath: string,
        options?: PluginRequestOptions,
        includeToken = false,
    ): string {
        const queryParams = this.buildQueryParams(options);
        let url = this.client.buildURL(targetPath);

        const query = serializeQueryParams(queryParams);
        if (query) {
            url += (url.includes("?") ? "&" : "?") + query;
        }

        if (includeToken && this.client.authStore?.token) {
            try {
                const urlObj = new URL(
                    url,
                    typeof window !== "undefined"
                        ? window.location.href
                        : "http://localhost",
                );
                if (!urlObj.searchParams.has("token")) {
                    urlObj.searchParams.set("token", this.client.authStore.token);
                }
                url = urlObj.toString();
            } catch {
                url +=
                    (url.includes("?") ? "&" : "?") +
                    "token=" +
                    encodeURIComponent(this.client.authStore.token);
            }
        }

        return url;
    }

    private buildQueryParams(options?: PluginRequestOptions): { [key: string]: any } {
        if (!options) {
            return {};
        }

        const normalized = Object.assign({}, options);
        delete (normalized as any).eventSourceInit;
        delete (normalized as any).websocketProtocols;

        normalizeUnknownQueryParams(normalized);

        return Object.assign({}, normalized.params, normalized.query);
    }
}
