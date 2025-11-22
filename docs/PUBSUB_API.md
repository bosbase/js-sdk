# Pub/Sub API

BosBase now exposes a lightweight WebSocket-based publish/subscribe channel so SDK users can push and receive custom messages. The Go backend uses the `ws` transport and persists each published payload in the `_pubsub_messages` table so every node in a cluster can replay and fan-out messages to its local subscribers.

- Endpoint: `/api/pubsub` (WebSocket)
- Auth: the SDK automatically forwards `authStore.token` as a `token` query parameter; cookie-based auth also works.
- Reliability: automatic reconnect with topic re-subscription; messages are stored in the database and broadcasted to all connected nodes.

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
```

## API Surface

- `pb.pubsub.publish(topic, data)` → `Promise<{ id, topic, created }>`
- `pb.pubsub.subscribe(topic, handler)` → `Promise<() => Promise<void>>`
- `pb.pubsub.unsubscribe(topic?)` → `Promise<void>` (omit `topic` to drop all topics)
- `pb.pubsub.disconnect()` to explicitly close the socket and clear pending requests.
- `pb.pubsub.isConnected` exposes the current WebSocket state.

## Notes for Clusters

- Messages are written to `_pubsub_messages` with a timestamp; every running node polls the table and pushes new rows to its connected WebSocket clients.
- Old pub/sub rows are cleaned up automatically after a day to keep the table small.
- If a node restarts, it resumes from the latest message and replays new rows as they are inserted, so connected clients on other nodes stay in sync.
