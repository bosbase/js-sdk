# Register Existing SQL Tables with the JS SDK

Use the SQL table helpers to expose existing tables (or run SQL to create them) and automatically generate REST collections. Both calls are **superuser-only**.

- `registerSqlTables(tables: string[])` – map existing tables to collections without running SQL.
- `importSqlTables(tables: SqlTableDefinition[])` – optionally run SQL to create tables first, then register them. Returns `{ created, skipped }`.

## Requirements

- Authenticate with a `_superusers` token.
- Each table must contain a `TEXT` primary key column named `id`.
- Common system columns are respected if present (`created`, `updated`, `createdBy`, `updatedBy`); no extra columns are added.
- Non-system columns are mapped by best effort (text, number, bool, date/time, JSON).

## Basic Usage

```js
import BosBase from "bosbase"; // or your client name

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

## Create-or-register flow

`importSqlTables()` accepts `SqlTableDefinition { name: string; sql?: string }` items, runs the SQL (if provided), and registers collections. Existing collection names are reported under `skipped`.

```js
import BosBase from "bosbase"; // or your client name

const pb = new BosBase("http://localhost:8090");
pb.authStore.save(superuserToken, null); // must be a superuser token

const result = await pb.collections.importSqlTables([
  {
    name: "legacy_orders",
    sql: `
      CREATE TABLE IF NOT EXISTS legacy_orders (
        id TEXT PRIMARY KEY,
        customer_email TEXT NOT NULL,
        total NUMERIC NOT NULL
      );
    `,
  },
  { name: "reporting_view" }, // assumes table already exists
]);

console.log(result.created.map((c) => c.name)); // ["legacy_orders", "reporting_view"]
console.log(result.skipped); // collection names that already existed
```

## What It Does

- Creates BosBase collection metadata for the provided tables.
- Generates REST endpoints for CRUD against those tables.
- Leaves the existing SQL schema and data untouched; no field mutations or table syncs are performed.
- Marks created collections with `externalTable: true` so you can distinguish them from regular BosBase-managed tables.

## Troubleshooting

- 400 error: ensure `id` exists as `TEXT PRIMARY KEY` and the table name is not system-reserved (no leading `_`).
- 401/403: confirm you are authenticated as a superuser.
- Default audit fields (`created`, `updated`, `createdBy`, `updatedBy`) are auto-added to the collection metadata when present in the table; if they’re missing from the table, they won’t be synthesized.
