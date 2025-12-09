import { describe, test, beforeAll, afterAll, afterEach, beforeEach, expect, assert } from "vitest";
import Client from "@/Client";
import { ScriptService } from "@/services/ScriptService";
import { FetchMock, dummyJWT } from "../mocks";

function parseBody(config: RequestInit | { [key: string]: any } | undefined): any {
    const raw = config?.body;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
}

describe("ScriptService", function () {
    const client = new Client("test_base_url");
    const fetchMock = new FetchMock();
    let service: ScriptService;

    const setSuperuser = () => {
        client.authStore.save(
            dummyJWT({ type: "auth", collectionId: "pbc_3142635823" }),
            { id: "id", collectionName: "_superusers" } as any,
        );
    };

    beforeAll(function () {
        fetchMock.init();
    });

    afterAll(function () {
        fetchMock.restore();
    });

    beforeEach(function () {
        service = new ScriptService(client);
        setSuperuser();
    });

    afterEach(function () {
        fetchMock.clearMocks();
        client.authStore.clear();
    });

    test("create() inserts a new script with version 1", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/scripts"),
            replyCode: 201,
            replyBody: {
                id: "id123",
                name: "hello",
                content: "print('hi')",
                description: "example script",
                version: 1,
                created: "2024-01-01T00:00:00Z",
                updated: "2024-01-01T00:00:00Z",
            },
            additionalMatcher: (_, config) => {
                const body = parseBody(config);
                return body?.name === "hello" && body?.content === "print('hi')";
            },
        });

        const result = await service.create({
            name: "hello",
            content: "print('hi')",
            description: "example script",
        });

        assert.equal(result.id, "id123");
        assert.equal(result.name, "hello");
        assert.equal(result.description, "example script");
        assert.equal(result.version, 1);
    });

    test("update() increments the version and updates fields", async function () {
        fetchMock.on({
            method: "PATCH",
            url: service.client.buildURL("/api/scripts/hello"),
            replyCode: 200,
            replyBody: {
                id: "id123",
                name: "hello",
                content: "print('hi')",
                description: "new description",
                version: 2,
                created: "2024-01-01T00:00:00Z",
                updated: "2024-01-02T00:00:00Z",
            },
            additionalMatcher: (_, config) => parseBody(config)?.description === "new description",
        });

        const updated = await service.update("hello", { description: "new description" });

        assert.equal(updated.version, 2);
        assert.equal(updated.description, "new description");
    });

    test("list() returns mapped scripts", async function () {
        fetchMock.on({
            method: "GET",
            url: service.client.buildURL("/api/scripts"),
            replyCode: 200,
            replyBody: {
                items: [
                    {
                        id: "id-a",
                        name: "a",
                        content: "print('a')",
                        description: "first",
                        version: 1,
                        created: "2024-01-01T00:00:00Z",
                        updated: "2024-01-01T00:00:00Z",
                    },
                    {
                        id: "id-b",
                        name: "b",
                        content: "print('b')",
                        description: "second",
                        version: 3,
                        created: "2024-01-01T00:00:00Z",
                        updated: "2024-01-02T00:00:00Z",
                    },
                ],
            },
        });

        const scripts = await service.list();

        assert.equal(scripts.length, 2);
        assert.deepEqual(
            scripts.map((s) => s.id),
            ["id-a", "id-b"],
        );
        assert.deepEqual(
            scripts.map((s) => [s.name, s.version]),
            [
                ["a", 1],
                ["b", 3],
            ],
        );
    });

    test("delete() removes a script", async function () {
        fetchMock.on({
            method: "DELETE",
            url: service.client.buildURL("/api/scripts/hello"),
            replyCode: 204,
            replyBody: {},
        });

        const removed = await service.delete("hello");

        assert.isTrue(removed);
    });

    test("requires superuser auth", async function () {
        client.authStore.clear();

        await expect(service.create({ name: "test", content: "print('x')" })).rejects.toThrow(
            "Superuser authentication is required",
        );
    });
});
