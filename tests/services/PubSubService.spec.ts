import { describe, test, expect, assert } from "vitest";
import Client from "@/Client";
import {
    PublishAck,
    PubSubMessage,
    PubSubService,
    RealtimeMessage,
} from "@/services/PubSubService";

class StubPubSubService extends PubSubService {
    published: { topic: string; data: any } | null = null;
    subCb?: (msg: PubSubMessage) => void;
    unsubCalled = false;

    constructor() {
        super(new Client("http://example.com"));
    }

    override async publish(topic: string, data: any): Promise<PublishAck> {
        this.published = { topic, data };
        return { id: "ack", topic, created: "now" };
    }

    override async subscribe(
        topic: string,
        cb: (data: PubSubMessage) => void,
    ): Promise<() => Promise<void>> {
        this.subCb = cb;
        return async () => {
            this.unsubCalled = true;
        };
    }
}

describe("PubSubService realtime helpers", () => {
    test("realtimePublish forwards event, payload and ref", async () => {
        const service = new StubPubSubService();

        const ack = await service.realtimePublish(
            "messages:123",
            "join",
            { text: "hello" },
            "custom-ref",
        );

        assert.deepEqual(ack, { id: "ack", topic: "messages:123", created: "now" });
        assert.deepEqual(service.published, {
            topic: "messages:123",
            data: { event: "join", payload: { text: "hello" }, ref: "custom-ref" },
        });
    });

    test("realtimePublish auto-generates ref when missing", async () => {
        const service = new StubPubSubService();

        await service.realtimePublish("messages", "join", { ok: true });

        expect(service.published?.data?.ref).toBeTruthy();
    });

    test("realtimePublish requires event", async () => {
        const service = new StubPubSubService();

        await expect(service.realtimePublish("messages", "", {})).rejects.toThrow(
            "event must be set.",
        );
    });

    test("realtimeSubscribe normalizes the realtime message shape", async () => {
        const service = new StubPubSubService();
        let received: RealtimeMessage<any> | null = null;

        const unsubscribe = await service.realtimeSubscribe("messages", (msg) => {
            received = msg;
        });

        expect(typeof unsubscribe).toBe("function");
        service.subCb?.({
            id: "m1",
            topic: "messages",
            created: "2024-01-01",
            data: { event: "join", payload: { foo: "bar" }, ref: "abc" },
        });

        assert.deepEqual(received, {
            topic: "messages",
            event: "join",
            payload: { foo: "bar" },
            ref: "abc",
            id: "m1",
            created: "2024-01-01",
        });

        await unsubscribe();
        expect(service.unsubCalled).toBe(true);
    });
});
