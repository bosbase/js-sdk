# Scripts API - JavaScript SDK

## Overview

`pb.scripts` provides superuser-only helpers for storing and managing function code snippets (for example, Python scripts) through the `/api/scripts` endpoints. The backend takes care of persistence and automatic version bumps whenever a script is updated.

**Table schema**
- `id` (uuidv7, auto-generated)
- `name` (primary key)
- `content` (script body)
- `description` (optional)
- `version` (starts at 1, increments by 1 on every update)
- `created`, `updated` (ISO timestamps)


## Authentication

Authenticate as a superuser before calling any Scripts API method:

```javascript
import BosBase from "bosbase";

const pb = new BosBase("http://127.0.0.1:8090");

await pb.collection("_superusers").authWithPassword("admin@example.com", "password");
```

## Creating a Script

`pb.scripts.create` creates the table if it does not exist, writes the script, and returns the stored row with `version = 1`.

```javascript
const pythonCode = `
def main():
    print("Hello from functions!")


if __name__ == "__main__":
    main()
`;

const script = await pb.scripts.create({
    name: "hello.py",
    content: pythonCode,
    description: "Hello from functions!",
});

console.log(script.id); // uuidv7
console.log(script.version); // 1
```

## Reading Scripts

Fetch a single script by name or list all scripts:

```javascript
const script = await pb.scripts.get("hello.py");
console.log(script.content);

const allScripts = await pb.scripts.list();
console.log(allScripts.map((s) => [s.name, s.version]));
```

## Updating Scripts (auto-versioned)

Updates increment `version` by 1 automatically and refresh `updated`.

```javascript
const updated = await pb.scripts.update("hello.py", {
    content: `
def main():
    print("Hi from functions!")


if __name__ == "__main__":
    main()
`,
    description: "Now returns both total and count",
});

console.log(updated.version); // previous version + 1
```

You can update just the description if the code is unchanged:

```javascript
await pb.scripts.update("hello.py.py", { description: "Docs-only tweak" });
```

## Deleting Scripts

Remove a script by name. Returns `true` when a row was deleted.

```javascript
const removed = await pb.scripts.delete("hello.py");
console.log(removed); // true or false
```

## Notes

- All methods throw if the caller is not authenticated as a superuser.
- `id` is generated as a UUIDv7 string on insert and backfilled automatically for older rows.
- Content is stored as plain text; 
- Table creation runs automatically on first use of the service instance.
