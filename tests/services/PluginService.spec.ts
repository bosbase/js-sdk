import { describe, assert, test, beforeAll, afterAll, afterEach, expect } from "vitest";
import Client from "@/Client";
import { PluginService } from "@/services/PluginService";
import { FetchMock } from "../mocks";

describe("PluginService", function () {
    const client = new Client("test_base_url");
    const service = new PluginService(client);
    const fetchMock = new FetchMock();

    beforeAll(function () {
        fetchMock.init();
    });

    afterAll(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();
    });

    test("request() forwards method, headers, query, and body", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/plugins/example/echo?via=query"),
            body: { nested: true },
            replyCode: 200,
            replyBody: { ok: 1 },
            additionalMatcher: (_, config) => {
                return (config?.headers as any)?.["x-plugin-header"] === "demo";
            },
        });

        const response = await service.request("post", "/example/echo", {
            query: { via: "query" },
            body: { nested: true },
            headers: { "x-plugin-header": "demo" },
        });

        assert.deepEqual(response, { ok: 1 });
    });

    test("request() accepts already prefixed paths and trims slashes", async function () {
        fetchMock.on({
            method: "HEAD",
            url: service.client.buildURL("/api/plugins?ping=1"),
            replyCode: 200,
            replyBody: {},
        });

        await service.request("HEAD", "/api/plugins", { query: { ping: 1 } });
    });

    test("request() returns EventSource for SSE streams", function () {
        const originalEventSource = (global as any).EventSource;
        const calls: Array<{ url: string; init?: EventSourceInit & { headers?: any } }> =
            [];
        class EventSourceMock {
            url: string;
            init?: EventSourceInit;
            constructor(url: string, init?: EventSourceInit) {
                this.url = url;
                this.init = init;
                calls.push({ url, init });
            }
            addEventListener() {}
            removeEventListener() {}
            close() {}
        }
        (global as any).EventSource = EventSourceMock as any;

        client.authStore.save("demo_token");

        try {
            const es = service.request("sse", "/stream", {
                query: { foo: "bar" },
                eventSourceInit: { withCredentials: true },
                headers: { "x-demo": "1" },
            }) as any;

            assert.instanceOf(es, EventSourceMock as any);

            const parsed = new URL(calls[0].url, "http://localhost");
            assert.isTrue(parsed.pathname.endsWith("/api/plugins/stream"));
            assert.equal(parsed.searchParams.get("foo"), "bar");
            assert.equal(parsed.searchParams.get("token"), "demo_token");
            assert.deepEqual(calls[0].init, {
                withCredentials: true,
                headers: { "x-demo": "1" },
            });
        } finally {
            client.authStore.clear();
            (global as any).EventSource = originalEventSource;
        }
    });

    test("request() opens WebSocket when asked", function () {
        const originalWebSocket = (global as any).WebSocket;
        const sockets: Array<any> = [];
        class WebSocketMock {
            url: string;
            protocols?: string | string[];
            options?: any;
            readyState = 1;
            constructor(url: string, protocols?: string | string[], options?: any) {
                this.url = url;
                this.protocols = protocols;
                this.options = options;
                sockets.push(this);
            }
            send() {}
            close() {}
        }
        (global as any).WebSocket = WebSocketMock as any;

        client.authStore.save("ws_token");

        try {
            const ws = service.request("websocket", "ws-demo", {
                query: { q: 1 },
                websocketProtocols: ["proto1"],
                headers: { "x-ws": "2" },
            }) as any;

            assert.instanceOf(ws, WebSocketMock as any);

            const parsed = new URL(ws.url, "http://localhost");
            assert.equal(parsed.protocol, "ws:");
            assert.isTrue(parsed.pathname.endsWith("/api/plugins/ws-demo"));
            assert.equal(parsed.searchParams.get("q"), "1");
            assert.equal(parsed.searchParams.get("token"), "ws_token");
            assert.deepEqual(ws.protocols, ["proto1"]);
            assert.deepEqual(ws.options, { headers: { "x-ws": "2" } });
        } finally {
            client.authStore.clear();
            (global as any).WebSocket = originalWebSocket;
        }
    });

    test("request() throws on unsupported methods", function () {
        expect(() => service.request("TRACE" as any, "/health")).toThrow(
            /Unsupported plugin method/i,
        );
    });
});
