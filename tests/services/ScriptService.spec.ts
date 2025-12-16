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

    test("command() executes a shell command", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/scripts/command"),
            replyCode: 200,
            replyBody: { output: "command-ok" },
            additionalMatcher: (_, config) => parseBody(config)?.command === "echo ok",
        });

        const result = await service.command("echo ok");

        assert.equal(result.output, "command-ok");
    });

    test("wasmAsync() starts an async wasm job", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/scripts/wasm/async"),
            replyCode: 202,
            replyBody: { id: "job123", status: "running" },
            additionalMatcher: (_, config) => {
                const body = parseBody(config);
                return body?.wasm === "demo.wasm" && body?.options === "--reactor" && body?.params === "fib 5";
            },
        });

        const result = await service.wasmAsync("--reactor", "demo.wasm", "fib 5");

        assert.equal(result.id, "job123");
        assert.equal(result.status, "running");
    });

    test("wasmAsyncStatus() fetches wasm job status", async function () {
        fetchMock.on({
            method: "GET",
            url: service.client.buildURL("/api/scripts/wasm/async/job123"),
            replyCode: 200,
            replyBody: {
                id: "job123",
                wasmName: "demo.wasm",
                status: "done",
                output: "ok",
                stdout: "ok",
                stderr: "",
                duration: "1s",
                startedAt: "2024-01-01T00:00:00Z",
                finishedAt: "2024-01-01T00:00:01Z",
            },
        });

        const status = await service.wasmAsyncStatus("job123");

        assert.equal(status.id, "job123");
        assert.equal(status.status, "done");
        assert.equal(status.output, "ok");
    });

    test("execute() calls the execute endpoint", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/scripts/hello/execute"),
            replyCode: 200,
            replyBody: { output: "exec-ok" },
        });

        const result = await service.execute("hello");

        assert.equal(result.output, "exec-ok");
    });

    test("execute() with arguments calls the execute endpoint with arguments", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/scripts/hello/execute"),
            replyCode: 200,
            replyBody: { output: "exec-ok" },
            additionalMatcher: (_, config) => {
                const body = parseBody(config);
                return Array.isArray(body?.arguments) && body.arguments.length === 2;
            },
        });

        const result = await service.execute("hello", ["arg1", "arg2"]);

        assert.equal(result.output, "exec-ok");
    });

    test("execute() with function_name calls the execute endpoint with function_name", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/scripts/hello/execute"),
            replyCode: 200,
            replyBody: { output: "exec-ok" },
            additionalMatcher: (_, config) => {
                const body = parseBody(config);
                return body?.function_name === "myFunction";
            },
        });

        const result = await service.execute("hello", { function_name: "myFunction" });

        assert.equal(result.output, "exec-ok");
    });

    test("execute() with arguments and function_name calls the execute endpoint with both", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/scripts/hello/execute"),
            replyCode: 200,
            replyBody: { output: "exec-ok" },
            additionalMatcher: (_, config) => {
                const body = parseBody(config);
                return (
                    body?.function_name === "myFunction" &&
                    Array.isArray(body?.arguments) &&
                    body.arguments.length === 2
                );
            },
        });

        const result = await service.execute("hello", {
            arguments: ["arg1", "arg2"],
            function_name: "myFunction",
        });

        assert.equal(result.output, "exec-ok");
    });

    test("requires superuser auth", async function () {
        client.authStore.clear();

        await expect(service.create({ name: "test", content: "print('x')" })).rejects.toThrow(
            "Superuser authentication is required",
        );
    });
});
