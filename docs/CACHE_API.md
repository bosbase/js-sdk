# Cache API (JS SDK)

BosBase caches combine in-memory [FreeCache](https://github.com/coocood/freecache) storage with persistent database copies. Each cache instance is safe to use in single-node or multi-node (cluster) mode: nodes read from FreeCache first, fall back to the database if an item is missing or expired, and then reload FreeCache automatically.

The JS SDK exposes the cache endpoints through `pb.caches`. Typical use cases include:

- Caching AI prompts/responses that must survive restarts.
- Quickly sharing feature flags and configuration between workers.
- Preloading expensive vector search results for short periods.

> **Timeouts & TTLs:** Each cache defines a default TTL (in seconds). Individual entries may provide their own `ttlSeconds`. A value of `0` keeps the entry until it is manually deleted.

## List available caches

The `list()` function allows you to query and retrieve all currently available caches, including their names and capacities. This is particularly useful for AI systems to discover existing caches before creating new ones, avoiding duplicate cache creation.

```ts
import BosBase from "bosbase";

const pb = new BosBase("http://127.0.0.1:8090");
await pb.admins.authWithPassword("root@example.com", "hunter2");

// Query all available caches
const caches = await pb.caches.list();

// Each cache object contains:
// - name: string - The cache identifier
// - sizeBytes: number - The cache capacity in bytes
// - defaultTTLSeconds: number - Default expiration time
// - readTimeoutMs: number - Read timeout in milliseconds
// - created: string - Creation timestamp (RFC3339)
// - updated: string - Last update timestamp (RFC3339)

// Example: Find a cache by name and check its capacity
const targetCache = caches.find(c => c.name === "ai-session");
if (targetCache) {
  console.log(`Cache "${targetCache.name}" has capacity of ${targetCache.sizeBytes} bytes`);
  // Use the existing cache directly
} else {
  console.log("Cache not found, create a new one if needed");
}
```

## Manage cache configurations

```ts
import BosBase from "bosbase";

const pb = new BosBase("http://127.0.0.1:8090");
await pb.admins.authWithPassword("root@example.com", "hunter2");

// List all available caches (including name and capacity).
// This is useful for AI to discover existing caches before creating new ones.
const caches = await pb.caches.list();
console.log("Available caches:", caches);
// Output example:
// [
//   {
//     name: "ai-session",
//     sizeBytes: 67108864,
//     defaultTTLSeconds: 300,
//     readTimeoutMs: 25,
//     created: "2024-01-15T10:30:00Z",
//     updated: "2024-01-15T10:30:00Z"
//   },
//   {
//     name: "query-cache",
//     sizeBytes: 33554432,
//     defaultTTLSeconds: 600,
//     readTimeoutMs: 50,
//     created: "2024-01-14T08:00:00Z",
//     updated: "2024-01-14T08:00:00Z"
//   }
// ]

// Find an existing cache by name
const existingCache = caches.find(c => c.name === "ai-session");
if (existingCache) {
  console.log(`Found cache "${existingCache.name}" with capacity ${existingCache.sizeBytes} bytes`);
  // Use the existing cache directly without creating a new one
} else {
  // Create a new cache only if it doesn't exist
  await pb.caches.create({
    name: "ai-session",
    sizeBytes: 64 * 1024 * 1024,
    defaultTTLSeconds: 300,
    readTimeoutMs: 25, // optional concurrency guard
  });
}

// Update limits later (eg. shrink TTL to 2 minutes).
await pb.caches.update("ai-session", {
  defaultTTLSeconds: 120,
});

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

