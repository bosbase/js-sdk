## LLM Document API

The `LLMDocumentService` wraps the `/api/llm-documents` endpoints that are backed by the embedded chromem-go vector store (persisted in rqlite). Each document contains text content, optional metadata and an embedding vector that can be queried with semantic search.

### Getting Started

```ts
import Client from "bosbase";

const pb = new Client("http://localhost:8090");

// create a logical namespace for your documents
await pb.llmDocuments.createCollection("knowledge-base", {
    domain: "internal",
});
```

### Insert Documents

```ts
const doc = await pb.llmDocuments.insert(
    {
        content: "Leaves are green because chlorophyll absorbs red and blue light.",
        metadata: { topic: "biology" },
    },
    { collection: "knowledge-base" },
);

await pb.llmDocuments.insert(
    {
        id: "sky",
        content: "The sky is blue because of Rayleigh scattering.",
        metadata: { topic: "physics" },
    },
    { collection: "knowledge-base" },
);
```

### Query Documents

```ts
const result = await pb.llmDocuments.query(
    {
        queryText: "Why is the sky blue?",
        limit: 3,
        where: { topic: "physics" },
    },
    { collection: "knowledge-base" },
);

result.results.forEach((match) => {
    console.log(match.id, match.similarity);
});
```

### Manage Documents

```ts
// update a document
await pb.llmDocuments.update(
    "sky",
    { metadata: { topic: "physics", reviewed: "true" } },
    { collection: "knowledge-base" },
);

// list documents with pagination
const page = await pb.llmDocuments.list({
    collection: "knowledge-base",
    page: 1,
    perPage: 25,
});

// delete unwanted entries
await pb.llmDocuments.delete("sky", { collection: "knowledge-base" });
```

### Go Reference

Behind the scenes these APIs call the same chromem-go primitives:

```go
err := c.AddDocuments(ctx, []chromem.Document{
    {ID: "1", Content: "The sky is blue because of Rayleigh scattering."},
    {ID: "2", Content: "Leaves are green because chlorophyll absorbs red and blue light."},
}, runtime.NumCPU())
if err != nil {
    panic(err)
}

res, err := c.Query(ctx, "Why is the sky blue?", 1, nil, nil)
if err != nil {
    panic(err)
}
_ = res
```

### HTTP Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET /api/llm-documents/collections` | List collections |
| `POST /api/llm-documents/collections/{name}` | Create collection |
| `DELETE /api/llm-documents/collections/{name}` | Delete collection |
| `GET /api/llm-documents/{collection}` | List documents |
| `POST /api/llm-documents/{collection}` | Insert document |
| `GET /api/llm-documents/{collection}/{id}` | Fetch document |
| `PATCH /api/llm-documents/{collection}/{id}` | Update document |
| `DELETE /api/llm-documents/{collection}/{id}` | Delete document |
| `POST /api/llm-documents/{collection}/documents/query` | Query by semantic similarity |

### Management Page (`sasspb/ui`)

Prefer to click instead of code? Open the Bosbase console at `/_/#/vectors` and switch to the **LLM Documents** view. The UI speaks to the same `/api/llm-documents` endpoints, so anything you do there is instantly reflected in SDK clients (and vice versa).

#### CRUD workflow

- **Browse** – Collections load in a sidebar and each selection renders a paginated table of documents; the page/limit controls map directly to the `page` and `perPage` query params exposed by `llmDocuments.list()`.
- **Create** – Use the *New document* action to paste content, attach optional metadata JSON, and either supply an ID or let the backend generate one before the UI issues a `POST /api/llm-documents/{collection}` request.
- **Update** – Click any row to open an inline JSON/text editor. Saving triggers the `PATCH /api/llm-documents/{collection}/{id}` endpoint so you can revise content or metadata without leaving the browser.
- **Delete** – Remove individual rows or select many at once; the UI fans out the appropriate `DELETE` calls so you can clean up collections in bulk.

#### Wiring it inside `sasspb/ui`

The Bosbase superuser console lives in the `sasspb/ui` workspace. Running it locally gives you the new management page out of the box:

```sh
cd sasspb/ui
npm install
npm run dev   # opens http://localhost:3000/#/llm-documents
```

After signing in as a superuser, choose **LLM Documents** to reach the page backed by `sasspb/ui/src/components/llmDocuments/PageLLMDocuments.svelte` (route wiring in `sasspb/ui/src/routes.js`). The component hydrates the sidebar with `GET /api/llm-documents/collections`, reuses the REST pagination contract from `LLMDocumentService.list()`, and wraps create/update/delete/query helpers so you can drop the same logic into your own admin shell. The core looks like:

```svelte
<script lang="ts">
    import ApiClient from "@/utils/ApiClient";
    import { onMount } from "svelte";

    let collection = "knowledge-base";
    let page = 1;
    let perPage = 25;
    let totalItems = 0;
    let documents = [];
    let editing: { id?: string } | null = null;
    let queryText = "";
    let limit = 5;
    let queryResults = [];

    const base = () => `/api/llm-documents/${encodeURIComponent(collection)}`;

    async function loadDocuments() {
        const res = await ApiClient.send(base(), { query: { page, perPage } });
        documents = res.items;
        totalItems = res.totalItems;
    }

    async function saveDocument(payload) {
        const hasId = Boolean(editing?.id);
        const url = hasId ? `${base()}/${encodeURIComponent(editing.id)}` : base();
        await ApiClient.send(url, {
            method: hasId ? "PATCH" : "POST",
            body: payload,
        });
        editing = null;
        await loadDocuments();
    }

    async function deleteDocument(id) {
        await ApiClient.send(`${base()}/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadDocuments();
    }

    async function runQuery() {
        const res = await ApiClient.send(
            `${base()}/documents/query`,
            {
                method: "POST",
                body: { queryText, limit },
            }
        );
        queryResults = res.results;
    }

    onMount(loadDocuments);
</script>
```

Repurpose that snippet—or the full Svelte page—whenever you need a turnkey CRUD + semantic query experience for LLM documents.

##### Pagination controls

The UI keeps three reactive values—`page`, `perPage`, and `totalItems`—so it can mirror the SDK’s pagination contract. A lightweight pager is typically all that’s required:

```svelte
<div class="pager">
    <button on:click={() => page = Math.max(1, page - 1)} disabled={page === 1}>
        Prev
    </button>
    <span>{page} / {Math.max(1, Math.ceil(totalItems / perPage))}</span>
    <button
        on:click={() => page = page + 1}
        disabled={page * perPage >= totalItems}
    >
        Next
    </button>

    <select bind:value={perPage} on:change={() => { page = 1; loadDocuments(); }}>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
    </select>
</div>
```

Whenever any of those values change, call `loadDocuments()` again and the backend will respond with the correct slice as well as a fresh `totalItems` count so the UI can keep the controls honest.

##### Endpoint map

For quick reference, here’s how each UI affordance maps to the server:

| UI action | HTTP request |
| --- | --- |
| Load collections sidebar | `GET /api/llm-documents/collections` |
| Create collection | `POST /api/llm-documents/collections/{name}` |
| Delete collection | `DELETE /api/llm-documents/collections/{name}` |
| List documents for the active collection | `GET /api/llm-documents/{collection}?page=…&perPage=…` |
| Create document | `POST /api/llm-documents/{collection}` |
| Update document | `PATCH /api/llm-documents/{collection}/{id}` |
| Delete document | `DELETE /api/llm-documents/{collection}/{id}` |
| Semantic search tab (optional) | `POST /api/llm-documents/{collection}/documents/query` |

All of these calls run through the shared `ApiClient`, so superuser auth and error handling (toasts, confirmation modals, etc.) behave exactly like the rest of the Bosbase console.
