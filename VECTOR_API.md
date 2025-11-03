# Vector Database API

Vector database operations for semantic search, RAG (Retrieval-Augmented Generation), and AI applications.

> **Note**: Vector operations are currently implemented using sqlite-vec but are designed with abstraction in mind to support future vector database providers.

## Overview

The Vector API provides a unified interface for working with vector embeddings, enabling you to:
- Store and search vector embeddings
- Perform similarity search
- Build RAG applications
- Create recommendation systems
- Enable semantic search capabilities

## Getting Started

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://localhost:8090');

// Authenticate as superuser (vectors require superuser auth)
await pb.admins.authWithPassword('admin@example.com', 'password');
```

## Types

### VectorEmbedding
Array of numbers representing a vector embedding.

```typescript
type VectorEmbedding = number[];
```

### VectorDocument
A vector document with embedding, metadata, and optional content.

```typescript
interface VectorDocument {
  id?: string;                    // Unique identifier (auto-generated if not provided)
  vector: VectorEmbedding;        // The vector embedding
  metadata?: VectorMetadata;      // Optional metadata (key-value pairs)
  content?: string;               // Optional text content
}
```

### VectorSearchOptions
Options for vector similarity search.

```typescript
interface VectorSearchOptions {
  queryVector: VectorEmbedding;        // Query vector to search for
  limit?: number;                      // Max results (default: 10, max: 100)
  filter?: VectorMetadata;             // Optional metadata filter
  minScore?: number;                   // Minimum similarity score threshold
  maxDistance?: number;                // Maximum distance threshold
  includeDistance?: boolean;           // Include distance in results
  includeContent?: boolean;            // Include full document content
}
```

### VectorSearchResult
Result from a similarity search.

```typescript
interface VectorSearchResult {
  document: VectorDocument;    // The matching document
  score: number;               // Similarity score (0-1, higher is better)
  distance?: number;           // Distance metric (optional)
}
```

## Collection Management

### Create Collection

Create a new vector collection with specified dimension and distance metric.

```javascript
await pb.vectors.createCollection('documents', {
  dimension: 384,      // Vector dimension (default: 384)
  distance: 'cosine'   // Distance metric: 'cosine' (default), 'l2', 'dot'
});

// Minimal example (uses defaults)
await pb.vectors.createCollection('documents');
```

**Parameters:**
- `name` (string): Collection name
- `config` (object, optional):
  - `dimension` (number, optional): Vector dimension. Default: 384
  - `distance` (string, optional): Distance metric. Default: 'cosine'
  - Options: 'cosine', 'l2', 'dot'

### List Collections

Get all available vector collections.

```javascript
const collections = await pb.vectors.listCollections();

collections.forEach(collection => {
  console.log(`${collection.name}: ${collection.count} vectors`);
});
```

**Response:**
```typescript
Array<{
  name: string;
  count?: number;
  dimension?: number;
}>
```

### Delete Collection

Delete a vector collection and all its data.

```javascript
await pb.vectors.deleteCollection('documents');
```

**⚠️ Warning**: This permanently deletes the collection and all vectors in it!

## Document Operations

### Insert Document

Insert a single vector document.

```javascript
// With custom ID
const result = await pb.vectors.insert({
  id: 'doc_001',
  vector: [0.1, 0.2, 0.3, 0.4],
  metadata: { category: 'tech', tags: ['AI', 'ML'] },
  content: 'Document about machine learning'
}, { collection: 'documents' });

console.log('Inserted:', result.id);

// Without ID (auto-generated)
const result2 = await pb.vectors.insert({
  vector: [0.5, 0.6, 0.7, 0.8],
  content: 'Another document'
}, { collection: 'documents' });
```

**Response:**
```typescript
{
  id: string;        // The document ID
  success: boolean;
}
```

### Batch Insert

Insert multiple vector documents efficiently.

```javascript
const result = await pb.vectors.batchInsert({
  documents: [
    { vector: [0.1, 0.2, 0.3], metadata: { cat: 'A' }, content: 'Doc A' },
    { vector: [0.4, 0.5, 0.6], metadata: { cat: 'B' }, content: 'Doc B' },
    { vector: [0.7, 0.8, 0.9], metadata: { cat: 'A' }, content: 'Doc C' },
  ],
  skipDuplicates: true  // Skip documents with duplicate IDs
}, { collection: 'documents' });

console.log(`Inserted: ${result.insertedCount}`);
console.log(`Failed: ${result.failedCount}`);
console.log('IDs:', result.ids);
```

**Response:**
```typescript
{
  insertedCount: number;   // Number of successfully inserted vectors
  failedCount: number;     // Number of failed insertions
  ids: string[];           // List of inserted document IDs
  errors?: string[];       // Error messages (if any)
}
```

### Get Document

Retrieve a vector document by ID.

```javascript
const doc = await pb.vectors.get('doc_001', { collection: 'documents' });
console.log('Vector:', doc.vector);
console.log('Content:', doc.content);
console.log('Metadata:', doc.metadata);
```

### Update Document

Update an existing vector document.

```javascript
// Update all fields
await pb.vectors.update('doc_001', {
  vector: [0.9, 0.8, 0.7, 0.6],
  metadata: { updated: true },
  content: 'Updated content'
}, { collection: 'documents' });

// Partial update (only metadata and content)
await pb.vectors.update('doc_001', {
  metadata: { category: 'updated' },
  content: 'New content'
}, { collection: 'documents' });
```

### Delete Document

Delete a vector document.

```javascript
await pb.vectors.delete('doc_001', { collection: 'documents' });
```

### List Documents

List all documents in a collection with pagination.

```javascript
// Get first page
const result = await pb.vectors.list({
  page: 1,
  perPage: 100
}, { collection: 'documents' });

console.log(`Page ${result.page} of ${result.totalPages}`);
result.items.forEach(item => {
  console.log(item.id, item.content);
});
```

**Response:**
```typescript
{
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: VectorDocument[];
}
```

## Vector Search

### Basic Search

Perform similarity search on vectors.

```javascript
const results = await pb.vectors.search({
  queryVector: [0.1, 0.2, 0.3, 0.4],
  limit: 10
}, { collection: 'documents' });

results.results.forEach(result => {
  console.log(`Score: ${result.score} - ${result.document.content}`);
});
```

### Advanced Search

```javascript
const results = await pb.vectors.search({
  queryVector: [0.1, 0.2, 0.3, 0.4],
  limit: 20,
  minScore: 0.7,              // Minimum similarity threshold
  maxDistance: 0.3,           // Maximum distance threshold
  includeDistance: true,      // Include distance metric
  includeContent: true,       // Include full content
  filter: { category: 'tech' } // Filter by metadata
}, { collection: 'documents' });

console.log(`Found ${results.totalMatches} matches in ${results.queryTime}ms`);
results.results.forEach(r => {
  console.log(`Score: ${r.score}, Distance: ${r.distance}`);
  console.log(`Content: ${r.document.content}`);
});
```

**Response:**
```typescript
{
  results: VectorSearchResult[];
  totalMatches?: number;
  queryTime?: number;
}
```

## Common Use Cases

### Semantic Search

```javascript
// 1. Generate embeddings for your documents
const documents = [
  { text: 'Introduction to machine learning', id: 'doc1' },
  { text: 'Deep learning fundamentals', id: 'doc2' },
  { text: 'Natural language processing', id: 'doc3' },
];

for (const doc of documents) {
  // Generate embedding using your model
  const embedding = await generateEmbedding(doc.text);
  
  await pb.vectors.insert({
    id: doc.id,
    vector: embedding,
    content: doc.text,
    metadata: { type: 'tutorial' }
  }, { collection: 'articles' });
}

// 2. Search
const queryEmbedding = await generateEmbedding('What is AI?');
const results = await pb.vectors.search({
  queryVector: queryEmbedding,
  limit: 5,
  minScore: 0.75
}, { collection: 'articles' });

results.results.forEach(r => {
  console.log(`${r.score.toFixed(2)}: ${r.document.content}`);
});
```

### RAG (Retrieval-Augmented Generation)

```javascript
async function retrieveContext(query, limit = 5) {
  const queryEmbedding = await generateEmbedding(query);
  
  const results = await pb.vectors.search({
    queryVector: queryEmbedding,
    limit: limit,
    minScore: 0.75,
    includeContent: true
  }, { collection: 'knowledge_base' });
  
  return results.results.map(r => r.document.content);
}

// Use with your LLM
const context = await retrieveContext('What are best practices for security?');
const answer = await llm.generate(context, userQuery);
```

### Recommendation System

```javascript
// Store user profile embeddings
await pb.vectors.insert({
  id: userId,
  vector: userProfileEmbedding,
  metadata: {
    preferences: ['tech', 'science'],
    demographics: { age: 30, location: 'US' }
  }
}, { collection: 'users' });

// Find similar users
const similarUsers = await pb.vectors.search({
  queryVector: currentUserEmbedding,
  limit: 20,
  includeDistance: true
}, { collection: 'users' });

// Generate recommendations based on similar users
const recommendations = await generateRecommendations(similarUsers);
```

### Multi-modal Search

```javascript
// Store embeddings from different sources
await pb.vectors.insert({
  id: 'image_001',
  vector: imageEmbedding,
  metadata: { type: 'image', url: 'https://...' },
  content: 'Description of the image'
}, { collection: 'media' });

await pb.vectors.insert({
  id: 'video_001',
  vector: videoEmbedding,
  metadata: { type: 'video', duration: 120 },
  content: 'Video transcript'
}, { collection: 'media' });

// Search across all media types
const results = await pb.vectors.search({
  queryVector: queryEmbedding,
  limit: 10,
  includeContent: true
}, { collection: 'media' });
```

## Best Practices

### Vector Dimensions

Choose the right dimension for your use case:

- **OpenAI embeddings**: 1536 (`text-embedding-3-large`)
- **Sentence Transformers**: 384-768
  - `all-MiniLM-L6-v2`: 384
  - `all-mpnet-base-v2`: 768
- **Custom models**: Match your model's output

### Distance Metrics

| Metric | Best For | Notes |
|--------|----------|-------|
| `cosine` | Text embeddings | Works well with normalized vectors |
| `l2` | General similarity | Euclidean distance |
| `dot` | Performance | Requires normalized vectors |

### Performance Tips

1. **Use batch insert** for multiple vectors
2. **Set appropriate limits** to avoid excessive results
3. **Use metadata filtering** to narrow search space
4. **Enable indexes** (automatic with sqlite-vec)

### Security

- All vector endpoints require superuser authentication
- Never expose credentials in client-side code
- Use environment variables for sensitive data

## Error Handling

```javascript
try {
  await pb.vectors.search({
    queryVector: [0.1, 0.2, 0.3]
  }, { collection: 'documents' });
} catch (error) {
  if (error.status === 404) {
    console.error('Collection not found');
  } else if (error.status === 400) {
    console.error('Invalid request:', error.response);
  } else {
    console.error('Error:', error);
  }
}
```

## Examples

### Complete RAG Application

```javascript
import BosBase from 'bosbase';
import { OpenAI } from 'openai';

const pb = new BosBase('http://localhost:8090');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize
await pb.admins.authWithPassword('admin@example.com', 'password');

// 1. Create knowledge base collection
await pb.vectors.createCollection('knowledge_base', {
  dimension: 1536,  // OpenAI dimensions
  distance: 'cosine'
});

// 2. Index documents
async function indexDocuments(documents) {
  for (const doc of documents) {
    // Generate OpenAI embedding
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: doc.content
    });
    
    await pb.vectors.insert({
      id: doc.id,
      vector: embedding.data[0].embedding,
      content: doc.content,
      metadata: { source: doc.source, topic: doc.topic }
    }, { collection: 'knowledge_base' });
  }
}

// 3. RAG Query
async function ask(question) {
  // Generate query embedding
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: question
  });
  
  // Search for relevant context
  const results = await pb.vectors.search({
    queryVector: embedding.data[0].embedding,
    limit: 5,
    minScore: 0.8,
    includeContent: true,
    filter: { topic: 'relevant_topic' }
  }, { collection: 'knowledge_base' });
  
  // Build context
  const context = results.results
    .map(r => r.document.content)
    .join('\n\n');
  
  // Generate answer with LLM
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: `Context: ${context}\n\nQuestion: ${question}` }
    ]
  });
  
  return completion.choices[0].message.content;
}

// Use it
const answer = await ask('What is machine learning?');
console.log(answer);
```

### Product Recommendations

```javascript
// Store product embeddings
async function indexProducts(products) {
  for (const product of products) {
    const embedding = await generateProductEmbedding(product);
    
    await pb.vectors.insert({
      id: product.id,
      vector: embedding,
      metadata: {
        category: product.category,
        price: product.price,
        brand: product.brand
      },
      content: `${product.name} - ${product.description}`
    }, { collection: 'products' });
  }
}

// Recommend products similar to user's purchase history
async function recommendProducts(userId) {
  // Get user's preferred products
  const userProducts = await getUserFavoriteProducts(userId);
  const productEmbeddings = userProducts.map(p => p.embedding);
  
  // Average embeddings to get user preference
  const avgEmbedding = averageEmbeddings(productEmbeddings);
  
  // Search for similar products
  const results = await pb.vectors.search({
    queryVector: avgEmbedding,
    limit: 20,
    minScore: 0.7,
    filter: { category: 'electronics' }
  }, { collection: 'products' });
  
  return results.results.map(r => r.document.id);
}
```

## Migration from Other Databases

```javascript
// Migrate from Pinecone
async function migrateFromPinecone() {
  // 1. Export from Pinecone
  const pineconeVectors = await exportFromPinecone();
  
  // 2. Create collection
  await pb.vectors.createCollection('migrated', {
    dimension: 1536,
    distance: 'cosine'
  });
  
  // 3. Batch insert
  const documents = pineconeVectors.map(v => ({
    id: v.id,
    vector: v.values,
    metadata: v.metadata
  }));
  
  await pb.vectors.batchInsert({
    documents,
    skipDuplicates: true
  }, { collection: 'migrated' });
}
```

## References

- [sqlite-vec Documentation](https://alexgarcia.xyz/sqlite-vec)
- [sqlite-vec with rqlite](https://alexgarcia.xyz/sqlite-vec/rqlite.html)
- [Vector Implementation Guide](../VECTOR_IMPLEMENTATION.md)
- [Vector Setup Guide](../VECTOR_SETUP_GUIDE.md)

