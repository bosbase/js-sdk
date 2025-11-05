# Schema Query API - JavaScript SDK Documentation

## Overview

The Schema Query API provides lightweight interfaces to retrieve collection field information without fetching full collection definitions. This is particularly useful for AI systems that need to understand the structure of collections and the overall system architecture.

**Key Features:**
- Get schema for a single collection by name or ID
- Get schemas for all collections in the system
- Lightweight response with only essential field information
- Support for all collection types (base, auth, view)
- Fast and efficient queries

**Backend Endpoints:**
- `GET /api/collections/{collection}/schema` - Get single collection schema
- `GET /api/collections/schemas` - Get all collection schemas

**Note**: All Schema Query API operations require superuser authentication.

## Authentication

All Schema Query API operations require superuser authentication:

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Authenticate as superuser
await pb.admins.authWithPassword('admin@example.com', 'password');
// OR
await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
```

## Type Definitions

### CollectionFieldSchemaInfo

Simplified field information returned by schema queries:

```typescript
interface CollectionFieldSchemaInfo {
    name: string;        // Field name
    type: string;        // Field type (e.g., "text", "number", "email", "relation")
    required?: boolean;  // Whether the field is required
    system?: boolean;    // Whether the field is a system field
    hidden?: boolean;    // Whether the field is hidden
}
```

### CollectionSchemaInfo

Schema information for a single collection:

```typescript
interface CollectionSchemaInfo {
    name: string;                        // Collection name
    type: string;                        // Collection type ("base", "auth", "view")
    fields: Array<CollectionFieldSchemaInfo>;  // Array of field information
}
```

## Get Single Collection Schema

Retrieves the schema (fields and types) for a single collection by name or ID.

### Method Signature

```typescript
getSchema(collectionIdOrName: string, options?: CommonOptions): Promise<CollectionSchemaInfo>
```

### Basic Usage

```javascript
// Get schema for a collection by name
const schema = await pb.collections.getSchema('demo1');

console.log(schema.name);    // "demo1"
console.log(schema.type);    // "base"
console.log(schema.fields);  // Array of field information

// Iterate through fields
schema.fields.forEach(field => {
    console.log(`${field.name}: ${field.type}${field.required ? ' (required)' : ''}`);
});
```

### Using Collection ID

```javascript
// Get schema for a collection by ID
const schema = await pb.collections.getSchema('_pbc_base_123');

console.log(schema.name);  // "demo1"
```

### Handling Different Collection Types

```javascript
// Base collection
const baseSchema = await pb.collections.getSchema('demo1');
console.log(baseSchema.type);  // "base"

// Auth collection
const authSchema = await pb.collections.getSchema('users');
console.log(authSchema.type);  // "auth"

// View collection
const viewSchema = await pb.collections.getSchema('view1');
console.log(viewSchema.type);  // "view"
```

### Error Handling

```javascript
try {
    const schema = await pb.collections.getSchema('nonexistent');
} catch (error) {
    if (error.status === 404) {
        console.log('Collection not found');
    } else {
        console.error('Error:', error);
    }
}
```

## Get All Collection Schemas

Retrieves the schema (fields and types) for all collections in the system.

### Method Signature

```typescript
getAllSchemas(options?: CommonOptions): Promise<{ collections: Array<CollectionSchemaInfo> }>
```

### Basic Usage

```javascript
// Get schemas for all collections
const result = await pb.collections.getAllSchemas();

console.log(result.collections);  // Array of all collection schemas

// Iterate through all collections
result.collections.forEach(collection => {
    console.log(`Collection: ${collection.name} (${collection.type})`);
    console.log(`Fields: ${collection.fields.length}`);
    
    // List all fields
    collection.fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type}`);
    });
});
```

### Filtering Collections by Type

```javascript
const result = await pb.collections.getAllSchemas();

// Filter to only base collections
const baseCollections = result.collections.filter(c => c.type === 'base');

// Filter to only auth collections
const authCollections = result.collections.filter(c => c.type === 'auth');

// Filter to only view collections
const viewCollections = result.collections.filter(c => c.type === 'view');
```

### Building a Field Index

```javascript
// Build a map of all field names and types across all collections
const result = await pb.collections.getAllSchemas();

const fieldIndex = new Map();

result.collections.forEach(collection => {
    collection.fields.forEach(field => {
        const key = `${collection.name}.${field.name}`;
        fieldIndex.set(key, {
            collection: collection.name,
            collectionType: collection.type,
            fieldName: field.name,
            fieldType: field.type,
            required: field.required || false,
            system: field.system || false,
            hidden: field.hidden || false,
        });
    });
});

// Use the index
console.log(fieldIndex.get('demo1.title'));  // Field information
```

## Complete Examples

### Example 1: AI System Understanding Collection Structure

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');
await pb.admins.authWithPassword('admin@example.com', 'password');

// Get all collection schemas for system understanding
const result = await pb.collections.getAllSchemas();

// Create a comprehensive system overview
const systemOverview = result.collections.map(collection => ({
    name: collection.name,
    type: collection.type,
    fields: collection.fields.map(field => ({
        name: field.name,
        type: field.type,
        required: field.required || false,
    })),
}));

console.log('System Collections Overview:');
systemOverview.forEach(collection => {
    console.log(`\n${collection.name} (${collection.type}):`);
    collection.fields.forEach(field => {
        console.log(`  ${field.name}: ${field.type}${field.required ? ' [required]' : ''}`);
    });
});
```

### Example 2: Validating Field Existence Before Query

```javascript
// Check if a field exists before querying
async function checkFieldExists(collectionName, fieldName) {
    try {
        const schema = await pb.collections.getSchema(collectionName);
        return schema.fields.some(field => field.name === fieldName);
    } catch (error) {
        return false;
    }
}

// Usage
const hasTitleField = await checkFieldExists('demo1', 'title');
if (hasTitleField) {
    // Safe to query the field
    const records = await pb.collection('demo1').getList(1, 20, {
        fields: 'id,title',
    });
}
```

### Example 3: Dynamic Form Generation

```javascript
// Generate form fields based on collection schema
async function generateFormFields(collectionName) {
    const schema = await pb.collections.getSchema(collectionName);
    
    return schema.fields
        .filter(field => !field.system && !field.hidden)  // Exclude system/hidden fields
        .map(field => ({
            name: field.name,
            type: field.type,
            required: field.required || false,
            label: field.name.charAt(0).toUpperCase() + field.name.slice(1),
        }));
}

// Usage
const formFields = await generateFormFields('demo1');
console.log('Form Fields:', formFields);
// Output: [
//   { name: 'title', type: 'text', required: true, label: 'Title' },
//   { name: 'description', type: 'text', required: false, label: 'Description' },
//   ...
// ]
```

### Example 4: Schema Comparison

```javascript
// Compare schemas between two collections
async function compareSchemas(collection1, collection2) {
    const [schema1, schema2] = await Promise.all([
        pb.collections.getSchema(collection1),
        pb.collections.getSchema(collection2),
    ]);
    
    const fields1 = new Set(schema1.fields.map(f => f.name));
    const fields2 = new Set(schema2.fields.map(f => f.name));
    
    return {
        common: [...fields1].filter(f => fields2.has(f)),
        onlyIn1: [...fields1].filter(f => !fields2.has(f)),
        onlyIn2: [...fields2].filter(f => !fields1.has(f)),
    };
}

// Usage
const comparison = await compareSchemas('demo1', 'demo2');
console.log('Common fields:', comparison.common);
console.log('Only in demo1:', comparison.onlyIn1);
console.log('Only in demo2:', comparison.onlyIn2);
```

### Example 5: Building TypeScript Type Definitions

```javascript
// Generate TypeScript interface from collection schema
async function generateTypeScriptInterface(collectionName) {
    const schema = await pb.collections.getSchema(collectionName);
    
    const fieldDefinitions = schema.fields.map(field => {
        let tsType = 'string';
        
        switch (field.type) {
            case 'number':
                tsType = 'number';
                break;
            case 'bool':
                tsType = 'boolean';
                break;
            case 'date':
            case 'autodate':
                tsType = 'Date | string';
                break;
            case 'json':
                tsType = 'any';
                break;
            case 'file':
                tsType = 'string | string[]';
                break;
            case 'select':
                tsType = 'string | string[]';
                break;
            case 'relation':
                tsType = 'string | string[]';
                break;
            default:
                tsType = 'string';
        }
        
        return `  ${field.name}${field.required ? '' : '?'}: ${tsType};`;
    }).join('\n');
    
    return `interface ${schema.name.charAt(0).toUpperCase() + schema.name.slice(1)} {\n${fieldDefinitions}\n}`;
}

// Usage
const tsInterface = await generateTypeScriptInterface('demo1');
console.log(tsInterface);
```

## Response Structure

### Single Collection Schema Response

```json
{
  "name": "demo1",
  "type": "base",
  "fields": [
    {
      "name": "id",
      "type": "text",
      "required": true,
      "system": true,
      "hidden": false
    },
    {
      "name": "title",
      "type": "text",
      "required": true,
      "system": false,
      "hidden": false
    },
    {
      "name": "description",
      "type": "text",
      "required": false,
      "system": false,
      "hidden": false
    }
  ]
}
```

### All Collections Schemas Response

```json
{
  "collections": [
    {
      "name": "demo1",
      "type": "base",
      "fields": [...]
    },
    {
      "name": "users",
      "type": "auth",
      "fields": [...]
    },
    {
      "name": "view1",
      "type": "view",
      "fields": [...]
    }
  ]
}
```

## Use Cases

### 1. AI System Design
AI systems can query all collection schemas to understand the overall database structure and design queries or operations accordingly.

### 2. Code Generation
Generate client-side code, TypeScript types, or form components based on collection schemas.

### 3. Documentation Generation
Automatically generate API documentation or data dictionaries from collection schemas.

### 4. Schema Validation
Validate queries or operations before execution by checking field existence and types.

### 5. Migration Planning
Compare schemas between environments or versions to plan migrations.

### 6. Dynamic UI Generation
Create dynamic forms, tables, or interfaces based on collection field definitions.

## Performance Considerations

- **Lightweight**: Schema queries return only essential field information, not full collection definitions
- **Efficient**: Much faster than fetching full collection objects
- **Cached**: Results can be cached for better performance
- **Batch**: Use `getAllSchemas()` to get all schemas in a single request

## Error Handling

```javascript
try {
    const schema = await pb.collections.getSchema('demo1');
} catch (error) {
    switch (error.status) {
        case 401:
            console.error('Authentication required');
            break;
        case 403:
            console.error('Superuser access required');
            break;
        case 404:
            console.error('Collection not found');
            break;
        default:
            console.error('Unexpected error:', error);
    }
}
```

## Best Practices

1. **Cache Results**: Schema information rarely changes, so cache results when appropriate
2. **Error Handling**: Always handle 404 errors for non-existent collections
3. **Filter System Fields**: When building UI, filter out system and hidden fields
4. **Batch Queries**: Use `getAllSchemas()` when you need multiple collection schemas
5. **Type Safety**: Use TypeScript types for better type safety and IDE support

## Related Documentation

- [Collection API](./COLLECTION_API.md) - Full collection management API
- [Records API](./API_RECORDS.md) - Record CRUD operations
