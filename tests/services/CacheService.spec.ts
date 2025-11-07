import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { CacheService } from "@/services/CacheService";

describe("CacheService", function () {
    const client = new Client("test_base_url");
    const service = new CacheService(client);
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

    test("list()", async function () {
        fetchMock.on({
            method: "GET",
            url: service.client.buildURL("/api/cache"),
            replyCode: 200,
            replyBody: { items: [{ name: "test", sizeBytes: 1, defaultTTLSeconds: 1, readTimeoutMs: 1 }] },
        });

        const items = await service.list();
        assert.equal(items.length, 1);
        assert.equal(items[0].name, "test");
    });

    test("create()", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/cache"),
            replyCode: 201,
            replyBody: { name: "cache-a" },
        });

        const payload = { name: "cache-a", sizeBytes: 1048576 };
        const created = await service.create(payload);
        assert.equal(created.name, "cache-a");
    });

    test("setEntry()", async function () {
        fetchMock.on({
            method: "PUT",
            url: service.client.buildURL("/api/cache/foo/entries/bar"),
            replyCode: 200,
            replyBody: { cache: "foo", key: "bar", value: { hello: "world" }, source: "cache" },
        });

        const result = await service.setEntry("foo", "bar", { hello: "world" }, 60);
        assert.equal(result.cache, "foo");
        assert.deepEqual(result.value, { hello: "world" });
    });

    test("deleteEntry()", async function () {
        fetchMock.on({
            method: "DELETE",
            url: service.client.buildURL("/api/cache/foo/entries/bar"),
            replyCode: 204,
        });

        const removed = await service.deleteEntry("foo", "bar");
        assert.isTrue(removed);
    });
});

