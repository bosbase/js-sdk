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

## Executing Scripts

Run a stored script via the backend runner (uses `/api/scripts/{name}/execute`).
The server loads the latest script content, writes it under `EXECUTE_PATH` (defaults to `/pb/functions`), activates `.venv/bin/activate`, and runs `python <name>`. The combined stdout/stderr is returned.
Pass optional CLI arguments as an array (second parameter to `execute`) and they will be appended to the python invocation in order, e.g., `python add.py 10 20`.
Execution permission is controlled by `pb.scriptsPermissions`:
- `anonymous`: anyone can execute
- `user`: requires an authenticated user (or superuser)
- `superuser`: only superuser (default when no permission entry exists)

```javascript
// pass optional CLI arguments as the second parameter
const result = await pb.scripts.execute("add.py", ["10", "20"]);
console.log(result.output); // console output from the python script
```

## Executing Scripts Asynchronously

Use `pb.scripts.executeAsync` to start an execution run and receive a job id immediately (HTTP 202).
You can then poll the status using `pb.scripts.executeAsyncStatus`.

The execution continues running even if the client disconnects due to network issues.

```javascript
const started = await pb.scripts.executeAsync("long-task.py", {
    arguments: ["10", "20"],
    function_name: "main",
});

console.log(started.id); // job id
console.log(started.status); // "running"

// poll status
let job;
do {
    job = await pb.scripts.executeAsyncStatus(started.id);
    await new Promise((r) => setTimeout(r, 500));
} while (job.status === "running");

if (job.status === "done") {
    console.log(job.output);
} else {
    console.error(job.error);
}
```

## Streaming Execution (SSE)

Use `pb.scripts.executeSSE` to run a script and receive the output via a single Server-Sent Event. Query parameters mirror the HTTP execute payload: `arguments` and `function_name`.

```javascript
// In browsers or any environment with EventSource
const es = pb.scripts.executeSSE("add", { arguments: ["10", "20"] });

es.addEventListener("message", (ev) => {
    const payload = JSON.parse(ev.data);
    console.log(payload.output); // "doc execution success updated 10 20"
    es.close();
});

es.addEventListener("error", (err) => {
    console.error("SSE error", err);
    es.close();
});
```

Options:
- `headers`: optional headers for the SSE request (where supported).
- `query`: extra query params to append.
- `eventSourceInit`: passed to the `EventSource` constructor.

> If `EventSource` is not available (for example in some Node runtimes), this helper will throw.

## WebSocket Execution

Use `pb.scripts.executeWebSocket` to execute a script over WebSocket. You can pass `arguments`/`function_name` via query params, or omit them and send a JSON message after connect:

```javascript
// Execute immediately using query params
const ws = pb.scripts.executeWebSocket("add", { arguments: ["1", "2"] });

ws.onmessage = (event) => {
    const payload = JSON.parse(typeof event.data === "string" ? event.data : String(event.data || ""));
    console.log(payload.output); // "doc execution success updated 1 2"
    ws.close();
};

ws.onerror = (err) => {
    console.error("WS error", err);
    ws.close();
};
```

Options:
- `headers`: optional headers for the websocket upgrade (where supported).
- `query`: extra query params to append.
- `websocketProtocols`: optional subprotocols array/string.

> If `WebSocket` is not available in the runtime, this helper will throw.

## Managing Script Permissions

Use `pb.scriptsPermissions` to control who can call `/api/scripts/{name}/execute`.
Valid `content` values are:
- `anonymous`: anyone can execute
- `user`: authenticated users in the `users` collection (and superusers)
- `superuser`: only superusers

If no permission row exists for a script, execution is superuser-only.

```javascript
// create or update permissions (superuser required)
await pb.scriptsPermissions.create({
    scriptName: "hello.py",
    content: "user",
});

const perm = await pb.scriptsPermissions.get("hello.py");
console.log(perm.content); // "user"
```

## Running Shell Commands

Run arbitrary shell commands in the functions directory (defaults to `EXECUTE_PATH` env or `/pb/functions`). Useful for managing dependencies, inspecting files, etc. **Superuser authentication is required.**

```javascript
const result = await pb.scripts.command(`cat pyproject.toml`);
console.log(result.output);

const result2 = await pb.scripts.command(`uv add "httpx>0.1.0"`);
console.log(result2.output);


```

Notes for `command`:
- Superuser auth is required.
- Commands run with `EXECUTE_PATH` as the working directory and inherit environment vars (including `EXECUTE_PATH`).
- The combined stdout/stderr is returned as `result.output`; non-zero exit codes surface as errors.

## Uploading Files to `EXECUTE_PATH`

Upload arbitrary files into the functions directory (from `EXECUTE_PATH` env/Docker Compose, default `/pb/functions`). Existing files are overwritten and stored with read/write/execute permissions. **Superuser authentication is required.**

```javascript
const uploadName = "hello-upload.sh";
const uploadContent = `#!/bin/sh
echo "upload-ok"
`;

const uploadFile = new File([uploadContent], uploadName, { type: "text/x-shellscript" });

const upload = await pb.scripts.upload({
    file: uploadFile,
    path: uploadName, // optional; defaults to uploadFile.name
});
console.log(upload.output); // e.g., "uploaded hello-upload.sh to /pb/functions"

const runUploaded = await pb.scripts.command(`./${uploadName}`);
console.log(runUploaded.output); // upload-ok
```

Notes for `upload`:
- Superuser auth is required and files are written under the configured `EXECUTE_PATH` (fallback `/pb/functions`).
- The `path` sets the relative destination (including filename); defaults to the uploaded file name.
- Files are written with read/write/execute permissions and overwrite any existing file with the same path.

## Executing WASM files

Run a WASM file in `EXECUTE_PATH` using `wasmedge`, with permissions checked from `function_script_permissions` by the wasm file name.

```javascript
// optional: upload a custom wasmedge binary into EXECUTE_PATH
await pb.scripts.upload({
    file: new Blob([`#!/bin/sh\necho "wasm-runner $@"\n`], { type: "text/x-shellscript" }),
    path: "wasmedge",
});

const result = await pb.scripts.wasm(
    '--reactor --env "REDIS_URL=redis://localhost/"', // CLI options
    "fibonacci.wasm", // wasm filename
    "fib 10", // parameters passed to wasm
);

console.log(result.output); // wasm-runner --reactor --env "REDIS_URL=redis://localhost/" fibonacci.wasm fib 10
```

Notes for `wasm`:
- Permission comes from `function_script_permissions` with `script_name = <wasm name>`: `anonymous`, `user`, `superuser` (default).
- Commands run in `EXECUTE_PATH` (env/Docker Compose, default `/pb/functions`) with that directory added to `PATH`.
- Options and params are concatenated into `wasmedge <options> <wasm> <params>`; output combines stdout/stderr.

### Run WASM asynchronously

Kick off a WASM call that keeps running even if the client disconnects (e.g., flaky network). Poll for completion using the returned job id.

```javascript
const start = await pb.scripts.wasmAsync("--reactor", "fibonacci.wasm", "fib 35");
// Later: check status
const status = await pb.scripts.wasmAsyncStatus(start.id);
console.log(status.status); // "running" | "done" | "error"
console.log(status.output); // combined stdout/stderr or function return values
console.log(status.duration); // execution duration string
```

Example: start and poll until completion

```javascript
const { id } = await pb.scripts.wasmAsync("--reactor", "fibonacci.wasm", "fib 35");

async function waitForJob(jobId, intervalMs = 500) {
    for (;;) {
        const job = await pb.scripts.wasmAsyncStatus(jobId);
        if (job.status === "running") {
            await new Promise((r) => setTimeout(r, intervalMs));
            continue;
        }
        return job;
    }
}

const done = await waitForJob(id);
if (done.status === "done") {
    console.log("WASM output:", done.output);
} else {
    console.error("WASM failed:", done.error);
}
```

Notes for `wasmAsync`:
- Same permission rules as `wasm`; execution continues server-side if the client drops.
- `wasmAsyncStatus` returns stdout/stderr, combined output, duration, and any error once finished.
- Status response shape:
  - `status`: `"running" | "done" | "error"`
  - `output`: combined stdout + stderr (or return values if no output captured)
  - `stdout` / `stderr`: raw streams from WASM
  - `duration`: string duration measured server-side
  - `startedAt` / `finishedAt`: RFC3339 timestamps
  - `error`: populated when `status === "error"`

## Managing Script Permissions

Superusers can define who may execute a script using `pb.scriptsPermissions`.

Allowed permission levels: `"anonymous"`, `"user"`, `"superuser"` (default when no entry exists).

```javascript
await pb.scriptsPermissions.create({
    scriptName: "hello.py",
    content: "user", // allow logged-in users and superusers
});

const perm = await pb.scriptsPermissions.get("hello.py");
console.log(perm.content); // user

await pb.scriptsPermissions.update("hello.py", { content: "anonymous" });

await pb.scriptsPermissions.delete("hello.py"); // back to superuser-only execution
```

## Deleting Scripts

Remove a script by name. Returns `true` when a row was deleted.

```javascript
const removed = await pb.scripts.delete("hello.py");
console.log(removed); // true or false
```

## Notes

- Script CRUD and `scriptsPermissions` require superuser auth; `scripts.execute` obeys the stored permission level; `command` is superuser-only.
- `id` is generated as a UUIDv7 string on insert and backfilled automatically for older rows.
- Execution uses the directory from `EXECUTE_PATH` env/docker-compose (default `/pb/functions`) and expects a `.venv` there with Python available.
- `command` also runs inside `EXECUTE_PATH` and returns combined stdout/stderr.
- Content is stored as plain text.
- Table creation runs automatically on first use of the service instance.
