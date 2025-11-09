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
