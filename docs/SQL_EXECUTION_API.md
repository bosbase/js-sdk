# SQL Execution API - JavaScript SDK

## Overview

The SQL Execution API lets superusers run ad-hoc SQL statements against the BosBase database and retrieve the results. Use it for controlled maintenance or diagnostics tasks—never expose it to untrusted users.

**Key Points**
- Superuser authentication is required for every request.
- Supports both read and write statements.
- Returns column names, rows, and `rowsAffected` for writes.
- Respects the SDK's regular request hooks, headers, and cancellation options.

**Endpoint**
- `POST /api/sql/execute`
- Body: `{ "query": "<your SQL statement>" }`

## Authentication

Authenticate as a superuser before calling `pb.sql.execute`:

```javascript
import BosBase from "bosbase";

const pb = new BosBase("http://127.0.0.1:8090");

await pb.collection("_superusers").authWithPassword("admin@example.com", "password");
```

## Executing a SELECT

```javascript
const result = await pb.sql.execute("SELECT id, text FROM demo1 ORDER BY id LIMIT 5");

console.log(result.columns); // ["id", "text"]
console.log(result.rows);
// [
//   ["84nmscqy84lsi1t", "test"],
//   ...
// ]
```

## Executing a Write Statement

```javascript
const update = await pb.sql.execute(
    "UPDATE demo1 SET text='updated via api' WHERE id='84nmscqy84lsi1t'",
);

console.log(update.rowsAffected); // 1
console.log(update.columns);      // ["rows_affected"]
console.log(update.rows);         // [["1"]]
```

## Inserts and Deletes

```javascript
// Insert
const insert = await pb.sql.execute(
    "INSERT INTO demo1 (id, text) VALUES ('new-id', 'hello from SQL API')",
);
console.log(insert.rowsAffected); // 1

// Delete
const removed = await pb.sql.execute("DELETE FROM demo1 WHERE id='new-id'");
console.log(removed.rowsAffected); // 1
```

## Response Shape

```jsonc
{
  "columns": ["col1", "col2"], // omitted when empty
  "rows": [["v1", "v2"]],      // omitted when empty
  "rowsAffected": 3            // only present for write operations
}
```

## Error Handling

- The SDK rejects empty queries before sending a request.
- Database or syntax errors are returned as `ClientResponseError` instances.
- You can pass standard `SendOptions` (headers, `requestKey`, `fetch`, etc.) to `pb.sql.execute()` when you need custom behavior.

## Safety Tips

- Never pass user-controlled SQL into this API.
- Prefer explicit statements over multi-statement payloads.
- Audit who has superuser credentials and rotate them regularly.
