import { describe, assert, test, beforeAll, afterAll, afterEach, expect } from "vitest";
import Client from "@/Client";
import { SQLService } from "@/services/SQLService";
import { FetchMock } from "../mocks";

describe("SQLService", function () {
    const client = new Client("test_base_url");
    const service = new SQLService(client);
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

    test("execute() sends SQL payload", async function () {
        fetchMock.on({
            method: "POST",
            url: service.client.buildURL("/api/sql/execute"),
            body: { query: "SELECT 1" },
            additionalMatcher: (_, config) => config?.headers?.["x-test"] === "yes",
            replyCode: 200,
            replyBody: { columns: ["one"], rows: [["1"]], rowsAffected: 0 },
        });

        const result = await service.execute("  SELECT 1  ", {
            headers: { "x-test": "yes" },
        });

        assert.deepEqual(result, { columns: ["one"], rows: [["1"]], rowsAffected: 0 });
    });

    test("execute() throws on empty query", async function () {
        await expect(service.execute("   ")).rejects.toThrow("query is required");
    });
});
