import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import Client from "@/Client";
import { GraphQLService } from "@/services/GraphQLService";
import { FetchMock } from "../mocks";

describe("GraphQLService", function () {
    const client = new Client("test_base_url");
    const service = new GraphQLService(client);
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

    test("query() should send GraphQL payload", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/graphql"),
            body: {
                query: "query MyQuery { field }",
                operationName: "MyQuery",
                variables: { foo: "bar" },
            },
            additionalMatcher: (_, config) => config?.headers?.["x-test"] === "123",
            replyCode: 200,
            replyBody: { data: { ok: true } },
        });

        const result = await service.query<{ ok: boolean }>(
            "query MyQuery { field }",
            { foo: "bar" },
            { operationName: "MyQuery", headers: { "x-test": "123" } },
        );

        assert.deepEqual(result, { data: { ok: true } });
    });

    test("query() merges variables passed via options", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/graphql"),
            body: {
                query: "{ ping }",
                variables: { via: "options" },
            },
            replyCode: 200,
            replyBody: { data: { pong: true }, errors: [{ message: "warn" }] },
        });

        const result = await service.query<{ pong: boolean }>(
            "{ ping }",
            null,
            {
                variables: { via: "options" },
            },
        );

        assert.deepEqual(result, { data: { pong: true }, errors: [{ message: "warn" }] });
    });
});
