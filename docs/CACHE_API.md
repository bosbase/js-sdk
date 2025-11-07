# Cache API (JS SDK)

BosBase caches combine in-memory [FreeCache](https://github.com/coocood/freecache) storage with persistent database copies. Each cache instance is safe to use in single-node or multi-node (cluster) mode: nodes read from FreeCache first, fall back to the database if an item is missing or expired, and then reload FreeCache automatically.

The JS SDK exposes the cache endpoints through `pb.caches`. Typical use cases include:

- Caching AI prompts/responses that must survive restarts.
- Quickly sharing feature flags and configuration between workers.
- Preloading expensive vector search results for short periods.

> **Timeouts & TTLs:** Each cache defines a default TTL (in seconds). Individual entries may provide their own `ttlSeconds`. A value of `0` keeps the entry until it is manually deleted.

## Manage cache configurations

```ts
import BosBase from "bosbase";

const pb = new BosBase("http://127.0.0.1:8090");
await pb.admins.authWithPassword("root@example.com", "hunter2");

// Create a 64MB cache with a 5 minute default TTL.
await pb.caches.create({
  name: "ai-session",
  sizeBytes: 64 * 1024 * 1024,
  defaultTTLSeconds: 300,
  readTimeoutMs: 25, // optional concurrency guard
});

// Update limits later (eg. shrink TTL to 2 minutes).
await pb.caches.update("ai-session", {
  defaultTTLSeconds: 120,
});

// List all caches (returns persisted metadata).
const caches = await pb.caches.list();

// Delete the cache (DB rows + FreeCache).
await pb.caches.delete("ai-session");
```

Field reference:

| Field | Description |
|-------|-------------|
| `sizeBytes` | Approximate FreeCache size. Values too small (<512KB) or too large (>512MB) are clamped. |
| `defaultTTLSeconds` | Default expiration for entries. `0` means no expiration. |
| `readTimeoutMs` | Optional lock timeout while reading FreeCache. When exceeded, the value is fetched from the database instead. |

## Work with cache entries

```ts
// Store an object in cache. The same payload is serialized into the DB.
await pb.caches.setEntry("ai-session", "dialog:42", {
  prompt: "describe Saturn",
  embedding: [/* vector */],
}, 90); // per-entry TTL in seconds

// Read from cache. `source` indicates where the hit came from.
const entry = await pb.caches.getEntry<{
  prompt: string;
  embedding: number[];
}>("ai-session", "dialog:42");

console.log(entry.source);   // "cache" or "database"
console.log(entry.expiresAt); // RFC3339 timestamp or undefined

// Renew an entry's TTL without changing its value.
// This extends the expiration time by the specified TTL (or uses the cache's default TTL if omitted).
const renewed = await pb.caches.renewEntry("ai-session", "dialog:42", 120); // extend by 120 seconds
console.log(renewed.expiresAt); // new expiration time

// Delete an entry.
await pb.caches.deleteEntry("ai-session", "dialog:42");
```

### Cluster-aware behaviour

1. **Write-through persistence** – every `setEntry` writes to FreeCache and the `_cache_entries` table so other nodes (or a restarted node) can immediately reload values.
2. **Read path** – FreeCache is consulted first. If a lock cannot be acquired within `readTimeoutMs` or if the entry is missing/expired, BosBase queries the database copy and repopulates FreeCache in the background.
3. **Automatic cleanup** – expired entries are ignored and removed from the database when fetched, preventing stale data across nodes.

Use caches whenever you need fast, transient data that must still be recoverable or shareable across BosBase nodes.

