## LangChaingo API (JS SDK)

BosBase exposes the `/api/langchaingo` endpoints so you can run LangChainGo powered workflows without leaving the platform. The JS SDK wraps these endpoints with the `pb.langchaingo` service.

The service exposes two high-level methods:

| Method | HTTP Endpoint | Description |
| --- | --- | --- |
| `pb.langchaingo.completions()` | `POST /api/langchaingo/completions` | Runs a chat/completion call using the configured LLM provider. |
| `pb.langchaingo.rag()` | `POST /api/langchaingo/rag` | Runs a retrieval-augmented generation pass over an `llmDocuments` collection. |

Both methods accept an optional `model` block:

```ts
interface LangChaingoModelConfig {
    provider?: "openai" | "ollama" | string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
}
```

If you omit the `model` section, BosBase defaults to `provider: "openai"` and `model: "gpt-4o-mini"` with credentials read from the server environment. Passing an `apiKey` lets you override server defaults on a per-request basis.

### Text + Chat Completions

```ts
import Client from "bosbase";

const pb = new Client("http://localhost:8090");

const completion = await pb.langchaingo.completions({
    model: { provider: "openai", model: "gpt-4o-mini" },
    messages: [
        { role: "system", content: "Answer in one sentence." },
        { role: "user", content: "Explain Rayleigh scattering." },
    ],
    temperature: 0.2,
});

console.log(completion.content);
```

The completion response mirrors the LangChainGo `ContentResponse` shape, so you can inspect the `functionCall`, `toolCalls`, or `generationInfo` fields when you need more than plain text.

### Retrieval-Augmented Generation (RAG)

Pair the LangChaingo endpoints with the `/api/llm-documents` store to build RAG workflows. The backend automatically uses the chromem-go collection configured for the target LLM collection.

```ts
const answer = await pb.langchaingo.rag({
    collection: "knowledge-base",
    question: "Why is the sky blue?",
    topK: 4,
    returnSources: true,
    filters: {
        where: { topic: "physics" },
    },
});

console.log(answer.answer);
for (const source of answer.sources ?? []) {
    console.log(source.score?.toFixed(3), source.metadata?.title);
}
```

Set `promptTemplate` when you want to control how the retrieved context is stuffed into the answer prompt:

```ts
await pb.langchaingo.rag({
    collection: "knowledge-base",
    question: "Summarize the explanation below in 2 sentences.",
    promptTemplate: `Context:\n{{.context}}\n\nQuestion: {{.question}}\nSummary:`,
});
```

### Dart SDK

Looking for the Dart equivalent? See [`dart-sdk/doc/LANGCHAINGO_API.md`](../../dart-sdk/doc/LANGCHAINGO_API.md) for identical request/response shapes and Flutter-ready examples.
