import { describe, test, beforeAll, afterAll, afterEach, beforeEach, expect, assert } from "vitest";
import Client from "@/Client";
import { ScriptPermissionsService } from "@/services/ScriptPermissionsService";
import { FetchMock, dummyJWT } from "../mocks";

function parseBody(config: RequestInit | { [key: string]: any } | undefined): any {
    const raw = config?.body;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
}

describe("ScriptPermissionsService", function () {
    const client = new Client("test_base_url");
    const fetchMock = new FetchMock();
    let service: ScriptPermissionsService;

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
        service = new ScriptPermissionsService(client);
        setSuperuser();
    });

    afterEach(function () {
        fetchMock.clearMocks();
        client.authStore.clear();
    });

    test("create() inserts a permission with version 1", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/script-permissions"),
            replyCode: 201,
            replyBody: {
                id: "perm1",
                scriptId: "script1",
                scriptName: "hello.py",
                content: "user",
                version: 1,
            },
            additionalMatcher: (_, config) => parseBody(config)?.script_name === "hello.py",
        });

        const result = await service.create({ scriptName: "hello.py", content: "user", scriptId: "script1" });

        assert.equal(result.id, "perm1");
        assert.equal(result.version, 1);
    });

    test("get() returns a permission", async function () {
        fetchMock.on({
            method: "GET",
            url: service.client.buildURL("/api/script-permissions/hello.py"),
            replyCode: 200,
            replyBody: {
                id: "perm1",
                scriptId: "script1",
                scriptName: "hello.py",
                content: "anonymous",
                version: 2,
            },
        });

        const result = await service.get("hello.py");

        assert.equal(result.content, "anonymous");
        assert.equal(result.version, 2);
    });

    test("update() updates and returns permission", async function () {
        fetchMock.on({
            method: "PATCH",
            url: service.client.buildURL("/api/script-permissions/hello.py"),
            replyCode: 200,
            replyBody: {
                id: "perm1",
                scriptId: "script1",
                scriptName: "hello.py",
                content: "superuser",
                version: 3,
            },
            additionalMatcher: (_, config) => parseBody(config)?.content === "superuser",
        });

        const result = await service.update("hello.py", { content: "superuser" });

        assert.equal(result.content, "superuser");
        assert.equal(result.version, 3);
    });

    test("delete() removes a permission", async function () {
        fetchMock.on({
            method: "DELETE",
            url: service.client.buildURL("/api/script-permissions/hello.py"),
            replyCode: 204,
            replyBody: {},
        });

        const removed = await service.delete("hello.py");

        assert.isTrue(removed);
    });

    test("requires superuser auth", async function () {
        client.authStore.clear();

        await expect(service.create({ scriptName: "test", content: "user" })).rejects.toThrow(
            "Superuser authentication is required",
        );
    });
});
