import { describe, test, beforeAll, afterAll, afterEach, beforeEach, expect, assert } from "vitest";
import Client from "@/Client";
import { ScriptService } from "@/services/ScriptService";
import { FetchMock, dummyJWT } from "../mocks";

function parseQuery(config: RequestInit | { [key: string]: any } | undefined): string {
    const raw = config?.body;
    const body = typeof raw === "string" ? JSON.parse(raw) : raw;
    return body?.query || "";
}

function registerEnsureTableMocks(fetchMock: FetchMock, service: ScriptService) {
    fetchMock.on({
        method: "POST",
        url: service.client.buildURL("/api/sql/execute"),
        replyCode: 200,
        replyBody: { rowsAffected: 0 },
        additionalMatcher: (_, config) =>
            parseQuery(config).startsWith("CREATE TABLE IF NOT EXISTS function_scripts"),
    });

    fetchMock.on({
        method: "POST",
        url: service.client.buildURL("/api/sql/execute"),
        replyCode: 200,
        replyBody: { rowsAffected: 0 },
        additionalMatcher: (_, config) =>
            parseQuery(config).includes("ALTER TABLE function_scripts ADD COLUMN id"),
    });

    fetchMock.on({
        method: "POST",
        url: service.client.buildURL("/api/sql/execute"),
        replyCode: 200,
        replyBody: { columns: ["name"], rows: [] },
        additionalMatcher: (_, config) =>
            parseQuery(config).startsWith("SELECT name FROM function_scripts WHERE id IS NULL"),
    });

    fetchMock.on({
        method: "POST",
        url: service.client.buildURL("/api/sql/execute"),
        replyCode: 200,
        replyBody: { rowsAffected: 0 },
        additionalMatcher: (_, config) =>
            parseQuery(config).includes("CREATE UNIQUE INDEX IF NOT EXISTS function_scripts_id_idx"),
    });
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
        registerEnsureTableMocks(fetchMock, service);

        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/sql/execute"),
            replyCode: 200,
            replyBody: { rowsAffected: 1 },
            additionalMatcher: (_, config) => parseQuery(config).startsWith("INSERT INTO function_scripts"),
        });

        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/sql/execute"),
            replyCode: 200,
            replyBody: {
                columns: ["id", "name", "content", "description", "version", "created", "updated"],
                rows: [
                    [
                        "id123",
                        "hello",
                        "print('hi')",
                        "example script",
                        "1",
                        "2024-01-01T00:00:00Z",
                        "2024-01-01T00:00:00Z",
                    ],
                ],
            },
            additionalMatcher: (_, config) =>
                parseQuery(config).startsWith("SELECT id, name, content, description"),
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
        registerEnsureTableMocks(fetchMock, service);

        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/sql/execute"),
            replyCode: 200,
            replyBody: { rowsAffected: 1 },
            additionalMatcher: (_, config) => {
                const query = parseQuery(config);
                return query.startsWith("UPDATE function_scripts") && query.includes("version = version + 1");
            },
        });

        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/sql/execute"),
            replyCode: 200,
            replyBody: {
                columns: ["id", "name", "content", "description", "version", "created", "updated"],
                rows: [
                    [
                        "id123",
                        "hello",
                        "print('hi')",
                        "new description",
                        "2",
                        "2024-01-01T00:00:00Z",
                        "2024-01-02T00:00:00Z",
                    ],
                ],
            },
            additionalMatcher: (_, config) => parseQuery(config).startsWith("SELECT id, name, content, description"),
        });

        const updated = await service.update("hello", { description: "new description" });

        assert.equal(updated.version, 2);
        assert.equal(updated.description, "new description");
    });

    test("list() returns mapped scripts", async function () {
        registerEnsureTableMocks(fetchMock, service);

        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/sql/execute"),
            replyCode: 200,
            replyBody: {
                columns: ["id", "name", "content", "description", "version", "created", "updated"],
                rows: [
                    ["id-a", "a", "print('a')", "first", "1", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"],
                    ["id-b", "b", "print('b')", "second", "3", "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"],
                ],
            },
            additionalMatcher: (_, config) => parseQuery(config).startsWith("SELECT id, name, content, description"),
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
        registerEnsureTableMocks(fetchMock, service);

        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/sql/execute"),
            replyCode: 200,
            replyBody: { rowsAffected: 1 },
            additionalMatcher: (_, config) => parseQuery(config).startsWith("DELETE FROM function_scripts"),
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
