# Pub/Sub API

BosBase exposes a lightweight WebSocket-based publish/subscribe channel so SDK users can push and receive custom messages. The Go backend uses the `ws` transport and synchronizes messages through Redis so every node in a cluster can fan-out events to its connected clients without storing them in a database.

- Endpoint: `/api/pubsub` (WebSocket)
- Auth: the SDK automatically forwards `authStore.token` as a `token` query parameter; cookie-based auth also works. Anonymous clients may subscribe, but publishing requires an authenticated token.
- Reliability: automatic reconnect with topic re-subscription; messages are broadcast across nodes via Redis (no database persistence required).

## Quick Start

```ts
import Client from "bosbase";

const pb = new Client("http://127.0.0.1:8090");

// Subscribe to a topic
const unsubscribe = await pb.pubsub.subscribe("chat/general", (msg) => {
    console.log("message", msg.topic, msg.data);
});

// Publish to a topic (resolves when the server stores and accepts it)
const ack = await pb.pubsub.publish("chat/general", { text: "Hello team!" });
console.log("published at", ack.created);

// Later, stop listening
await unsubscribe();

// Or use the realtime helpers that normalize { topic, event, payload, ref }
const rtUnsub = await pb.pubsub.realtimeSubscribe("chat/general", (msg) => {
    console.log("event", msg.event, "payload", msg.payload, "ref", msg.ref);
});

await pb.pubsub.realtimePublish("chat/general", "join", { text: "Hello again" });
await rtUnsub();
```

## API Surface

- `pb.pubsub.publish(topic, data)` → `Promise<{ id, topic, created }>`
- `pb.pubsub.subscribe(topic, handler)` → `Promise<() => Promise<void>>`
- `pb.pubsub.realtimePublish(topic, event, payload, ref?)` → `Promise<{ id, topic, created }>` (wraps `publish()` with a `{ event, payload, ref }` envelope)
- `pb.pubsub.realtimeSubscribe(topic, handler)` → `Promise<() => Promise<void>>` (wraps `subscribe()` and normalizes `{ topic, event, payload, ref, id?, created? }`)
- `pb.pubsub.unsubscribe(topic?)` → `Promise<void>` (omit `topic` to drop all topics)
- `pb.pubsub.disconnect()` to explicitly close the socket and clear pending requests.
- `pb.pubsub.isConnected` exposes the current WebSocket state.

## Notes for Clusters

- Messages are fanned-out via Redis so multiple nodes can stay in sync without relying on database storage.
- If a node restarts, it resumes listening on Redis and continues broadcasting to its connected clients after reconnect.
