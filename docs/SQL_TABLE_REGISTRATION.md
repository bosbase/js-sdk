# Register Existing SQL Tables with the JS SDK

Use `pb.collections.registerSqlTables()` to register pre-existing SQL tables and automatically expose them as REST collections. This is **superuser-only** and does **not** modify the underlying tables—use it when your schema is already defined in SQL and you just need the BosBase APIs on top.

## Requirements

- Authenticate with a `_superusers` token.
- Each table must contain a `TEXT` primary key column named `id`.
- Common system columns are respected if present (`created`, `updated`, `createdBy`, `updatedBy`); no extra columns are added.
- Non-system columns are mapped by best effort (text, number, bool, date/time, JSON).

## Basic Usage

```js
import BosBase from "bosbase";

const pb = new BosBase("http://127.0.0.1:8090");
pb.authStore.save(SUPERUSER_JWT); // must be a superuser token

const collections = await pb.collections.registerSqlTables([
  "projects",
  "accounts",
]);

console.log(collections.map((c) => c.name));
// => ["projects", "accounts"]
```

## With Request Options

You can pass standard request options (headers, query params, cancellation keys, etc.).

```js
const collections = await pb.collections.registerSqlTables(
  ["legacy_orders"],
  {
    headers: { "x-trace-id": "reg-123" },
    q: 1, // adds ?q=1
  },
);
```

## What It Does

- Creates BosBase collection metadata for the provided tables.
- Generates REST endpoints for CRUD against those tables.
- Leaves the existing SQL schema and data untouched; no field mutations or table syncs are performed.

## Troubleshooting

- 400 error: ensure `id` exists as `TEXT PRIMARY KEY` and the table name is not system-reserved (no leading `_`).
- 401/403: confirm you are authenticated as a superuser.
