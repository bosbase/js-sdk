# Collection API - JavaScript SDK Documentation

## Overview

The Collection API provides endpoints for managing collections (Base, Auth, and View types). All operations require superuser authentication and allow you to create, read, update, and delete collections along with their schemas and configurations.

**Key Features:**
- List and search collections
- View collection details
- Create collections (base, auth, view)
- Update collection schemas and rules
- Delete collections
- Truncate collections (delete all records)
- Import collections in bulk
- Get collection scaffolds (templates)

**Backend Endpoints:**
- `GET /api/collections` - List collections
- `GET /api/collections/{collection}` - View collection
- `POST /api/collections` - Create collection
- `PATCH /api/collections/{collection}` - Update collection
- `DELETE /api/collections/{collection}` - Delete collection
- `DELETE /api/collections/{collection}/truncate` - Truncate collection
- `PUT /api/collections/import` - Import collections
- `GET /api/collections/meta/scaffolds` - Get scaffolds

**Note**: All Collection API operations require superuser authentication.

## Authentication

All Collection API operations require superuser authentication:

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Authenticate as superuser
await pb.admins.authWithPassword('admin@example.com', 'password');
// OR
await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
```

## List Collections

Returns a paginated list of collections with support for filtering and sorting.

```javascript
// Basic list
const result = await pb.collections.getList(1, 30);

console.log(result.page);        // 1
console.log(result.perPage);     // 30
console.log(result.totalItems);  // Total collections count
console.log(result.items);       // Array of collections
```

### Advanced Filtering and Sorting

```javascript
// Filter by type
const authCollections = await pb.collections.getList(1, 100, {
  filter: 'type = "auth"',
});

// Filter by name pattern
const matchingCollections = await pb.collections.getList(1, 100, {
  filter: 'name ~ "user"',
});

// Sort by creation date
const sortedCollections = await pb.collections.getList(1, 100, {
  sort: '-created',
});

// Complex filter
const filtered = await pb.collections.getList(1, 100, {
  filter: 'type = "base" && system = false && created >= "2023-01-01"',
  sort: 'name',
});
```

### Get Full List

```javascript
// Get all collections at once
const allCollections = await pb.collections.getFullList({
  sort: 'name',
  filter: 'system = false',
});
```

### Get First Matching Collection

```javascript
// Get first auth collection
const authCollection = await pb.collections.getFirstListItem('type = "auth"');
```

## View Collection

Retrieve a single collection by ID or name:

```javascript
// By name
const collection = await pb.collections.getOne('posts');

// By ID
const collection = await pb.collections.getOne('_pbc_2287844090');

// With field selection
const collection = await pb.collections.getOne('posts', {
  fields: 'id,name,type,fields.name,fields.type',
});
```

## Create Collection

Create a new collection with schema fields and configuration.

**Note**: If the `created` and `updated` fields are not specified during collection initialization, BosBase will automatically create them. These system fields are added to all collections by default and track when records are created and last modified. You don't need to include them in your field definitions.

### Create Base Collection

```javascript
const baseCollection = await pb.collections.create({
  name: 'posts',
  type: 'base',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      min: 10,
      max: 255,
    },
    {
      name: 'content',
      type: 'editor',
      required: false,
    },
    {
      name: 'published',
      type: 'bool',
      required: false,
    },
    {
      name: 'author',
      type: 'relation',
      required: true,
      collectionId: '_pbc_users_auth_',
      maxSelect: 1,
    },
  ],
  listRule: '@request.auth.id != ""',
  viewRule: '@request.auth.id != "" || published = true',
  createRule: '@request.auth.id != ""',
  updateRule: 'author = @request.auth.id',
  deleteRule: 'author = @request.auth.id',
});
```

### Create Auth Collection

```javascript
const authCollection = await pb.collections.create({
  name: 'users',
  type: 'auth',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: false,
    },
    {
      name: 'avatar',
      type: 'file',
      required: false,
      maxSelect: 1,
      maxSize: 2097152, // 2MB
      mimeTypes: ['image/jpeg', 'image/png'],
    },
  ],
  listRule: null,
  viewRule: '@request.auth.id = id',
  createRule: null,
  updateRule: '@request.auth.id = id',
  deleteRule: '@request.auth.id = id',
  manageRule: null,
  authRule: 'verified = true', // Only verified users can authenticate
  passwordAuth: {
    enabled: true,
    identityFields: ['email', 'username'],
  },
  authToken: {
    duration: 604800, // 7 days
  },
  oauth2: {
    enabled: true,
    providers: [
      {
        name: 'google',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        authURL: 'https://accounts.google.com/o/oauth2/auth',
        tokenURL: 'https://oauth2.googleapis.com/token',
        userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo',
        displayName: 'Google',
      },
    ],
  },
});
```

### Create View Collection

```javascript
const viewCollection = await pb.collections.create({
  name: 'published_posts',
  type: 'view',
  listRule: '@request.auth.id != ""',
  viewRule: '@request.auth.id != ""',
  viewQuery: `
    SELECT 
      p.id,
      p.title,
      p.content,
      p.created,
      u.name as author_name,
      u.email as author_email
    FROM posts p
    LEFT JOIN users u ON p.author = u.id
    WHERE p.published = true
  `,
});
```

### Create from Scaffold

Use predefined scaffolds as a starting point:

```javascript
// Get available scaffolds
const scaffolds = await pb.collections.getScaffolds();

// Create base collection from scaffold
const baseCollection = await pb.collections.createBase('my_posts', {
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
  ],
});

// Create auth collection from scaffold
const authCollection = await pb.collections.createAuth('my_users', {
  passwordAuth: {
    enabled: true,
    identityFields: ['email'],
  },
});

// Create view collection from scaffold
const viewCollection = await pb.collections.createView('my_view', 'SELECT id, title FROM posts', {
  listRule: '@request.auth.id != ""',
});
```

### Accessing Collection ID After Creation

When a collection is successfully created, the returned `CollectionModel` object includes the `id` property, which contains the unique identifier assigned by the backend. You can access it immediately after creation:

```javascript
// Create a collection and access its ID
const collection = await pb.collections.create({
  name: 'posts',
  type: 'base',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
  ],
});

// Access the collection ID
console.log(collection.id); // e.g., "_pbc_2287844090"

// Use the ID for subsequent operations
await pb.collections.update(collection.id, {
  listRule: '@request.auth.id != ""',
});

// Store the ID for later use
const collectionId = collection.id;
localStorage.setItem('postsCollectionId', collectionId);
```

**Example: Creating multiple collections and storing their IDs**

```javascript
async function setupCollections() {
  // Create posts collection
  const posts = await pb.collections.create({
    name: 'posts',
    type: 'base',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'editor' },
    ],
  });

  // Create categories collection
  const categories = await pb.collections.create({
    name: 'categories',
    type: 'base',
    fields: [
      { name: 'name', type: 'text', required: true },
    ],
  });

  // Access IDs immediately after creation
  console.log('Posts collection ID:', posts.id);
  console.log('Categories collection ID:', categories.id);

  // Use IDs to create relations
  const postsWithRelation = await pb.collections.getOne(posts.id);
  postsWithRelation.fields.push({
    name: 'category',
    type: 'relation',
    collectionId: categories.id,
    maxSelect: 1,
  });
  await pb.collections.update(posts.id, postsWithRelation);

  return {
    postsId: posts.id,
    categoriesId: categories.id,
  };
}
```

**Note**: The `id` property is automatically generated by the backend and is available immediately after successful creation. You don't need to make a separate API call to retrieve it.

## Update Collection

Update an existing collection's schema, fields, or rules:

```javascript
// Update collection name and rules
const updated = await pb.collections.update('posts', {
  name: 'articles',
  listRule: '@request.auth.id != "" || status = "public"',
  viewRule: '@request.auth.id != "" || status = "public"',
});

// Add new field
const collection = await pb.collections.getOne('posts');
collection.fields.push({
  name: 'tags',
  type: 'select',
  options: {
    values: ['tech', 'science', 'art'],
  },
});
await pb.collections.update('posts', collection);

// Update field configuration
const collection = await pb.collections.getOne('posts');
const titleField = collection.fields.find(f => f.name === 'title');
if (titleField) {
  titleField.max = 200;
}
await pb.collections.update('posts', collection);
```

### Updating Auth Collection Options

```javascript
// Update OAuth2 configuration
const collection = await pb.collections.getOne('users');
collection.oauth2.enabled = true;
collection.oauth2.providers = [
  {
    name: 'github',
    clientId: 'NEW_CLIENT_ID',
    clientSecret: 'NEW_CLIENT_SECRET',
    displayName: 'GitHub',
  },
];

await pb.collections.update('users', collection);

// Update token duration
collection.authToken.duration = 2592000; // 30 days
await pb.collections.update('users', collection);
```

## Delete Collection

Delete a collection (including all records and files):

```javascript
// Delete by name
await pb.collections.delete('old_collection');

// Delete by ID
await pb.collections.delete('_pbc_2287844090');

// Using deleteCollection method (alias)
await pb.collections.deleteCollection('old_collection');
```

**Warning**: This operation is destructive and will:
- Delete the collection schema
- Delete all records in the collection
- Delete all associated files
- Remove all indexes

**Note**: Collections referenced by other collections cannot be deleted.

## Truncate Collection

Delete all records in a collection while keeping the collection schema:

```javascript
// Truncate collection (delete all records)
await pb.collections.truncate('posts');

// This will:
// - Delete all records in the collection
// - Delete all associated files
// - Delete cascade-enabled relations
// - Keep the collection schema intact
```

**Warning**: This operation is destructive and cannot be undone. It's useful for:
- Clearing test data
- Resetting collections
- Bulk data removal

**Note**: View collections cannot be truncated.

## Import Collections

Bulk import multiple collections at once:

```javascript
const collectionsToImport = [
  {
    name: 'posts',
    type: 'base',
    fields: [
      {
        name: 'title',
        type: 'text',
        required: true,
      },
      {
        name: 'content',
        type: 'editor',
      },
    ],
    listRule: '@request.auth.id != ""',
  },
  {
    name: 'categories',
    type: 'base',
    fields: [
      {
        name: 'name',
        type: 'text',
        required: true,
      },
    ],
  },
];

// Import without deleting existing collections
await pb.collections.import(collectionsToImport, false);

// Import and delete collections not in the import list
await pb.collections.import(collectionsToImport, true);
```

### Import Options

- **`deleteMissing: false`** (default): Only create/update collections in the import list
- **`deleteMissing: true`**: Delete all collections not present in the import list

**Warning**: Using `deleteMissing: true` will permanently delete collections and all their data.

## Get Scaffolds

Get collection templates for creating new collections:

```javascript
const scaffolds = await pb.collections.getScaffolds();

// Available scaffold types
console.log(scaffolds.base);   // Base collection template
console.log(scaffolds.auth);   // Auth collection template
console.log(scaffolds.view);   // View collection template

// Use scaffold as starting point
const baseTemplate = scaffolds.base;
const newCollection = {
  ...baseTemplate,
  name: 'my_collection',
  fields: [
    ...baseTemplate.fields,
    {
      name: 'custom_field',
      type: 'text',
    },
  ],
};

await pb.collections.create(newCollection);
```

## Filter Syntax

Collections support filtering with the same syntax as records:

### Supported Fields

- `id` - Collection ID
- `created` - Creation date
- `updated` - Last update date
- `name` - Collection name
- `type` - Collection type (`base`, `auth`, `view`)
- `system` - System collection flag (boolean)

### Filter Examples

```javascript
// Filter by type
filter: 'type = "auth"'

// Filter by name pattern
filter: 'name ~ "user"'

// Filter non-system collections
filter: 'system = false'

// Multiple conditions
filter: 'type = "base" && system = false && created >= "2023-01-01"'

// Complex filter
filter: '(type = "auth" || type = "base") && name !~ "test"'
```

## Sort Options

Supported sort fields:

- `@random` - Random order
- `id` - Collection ID
- `created` - Creation date
- `updated` - Last update date
- `name` - Collection name
- `type` - Collection type
- `system` - System flag

```javascript
// Sort examples
sort: 'name'           // ASC by name
sort: '-created'       // DESC by creation date
sort: 'type,-created'  // ASC by type, then DESC by created
```

## Complete Examples

### Example 1: Setup Blog Collections

```javascript
async function setupBlog() {
  // Create posts collection
  const posts = await pb.collections.create({
    name: 'posts',
    type: 'base',
    fields: [
      {
        name: 'title',
        type: 'text',
        required: true,
        min: 10,
        max: 255,
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        options: {
          pattern: '^[a-z0-9-]+$',
        },
      },
      {
        name: 'content',
        type: 'editor',
        required: true,
      },
      {
        name: 'featured_image',
        type: 'file',
        maxSelect: 1,
        maxSize: 5242880, // 5MB
        mimeTypes: ['image/jpeg', 'image/png'],
      },
      {
        name: 'published',
        type: 'bool',
        required: false,
      },
      {
        name: 'author',
        type: 'relation',
        collectionId: '_pbc_users_auth_',
        maxSelect: 1,
      },
      {
        name: 'categories',
        type: 'relation',
        collectionId: 'categories',
        maxSelect: 5,
      },
    ],
    listRule: '@request.auth.id != "" || published = true',
    viewRule: '@request.auth.id != "" || published = true',
    createRule: '@request.auth.id != ""',
    updateRule: 'author = @request.auth.id',
    deleteRule: 'author = @request.auth.id',
  });

  // Create categories collection
  const categories = await pb.collections.create({
    name: 'categories',
    type: 'base',
    fields: [
      {
        name: 'name',
        type: 'text',
        required: true,
        unique: true,
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        type: 'text',
        required: false,
      },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
  });

  // Access collection IDs immediately after creation
  console.log('Posts collection ID:', posts.id);
  console.log('Categories collection ID:', categories.id);

  // Update posts collection to use the categories collection ID
  const postsUpdated = await pb.collections.getOne(posts.id);
  const categoryField = postsUpdated.fields.find(f => f.name === 'categories');
  if (categoryField) {
    categoryField.collectionId = categories.id;
    await pb.collections.update(posts.id, postsUpdated);
  }

  console.log('Blog setup complete!');
  return {
    postsId: posts.id,
    categoriesId: categories.id,
  };
}
```

### Example 2: Migrate Collections

```javascript
async function migrateCollections() {
  // Export existing collections
  const existingCollections = await pb.collections.getFullList();
  
  // Modify collections
  const modifiedCollections = existingCollections.map(collection => {
    if (collection.name === 'posts') {
      // Add new field
      collection.fields.push({
        name: 'views',
        type: 'number',
        required: false,
        options: {
          min: 0,
        },
      });
      
      // Update rules
      collection.updateRule = '@request.auth.id != "" || published = true';
    }
    return collection;
  });
  
  // Import modified collections
  await pb.collections.import(modifiedCollections, false);
}
```

### Example 3: Clone Collection

```javascript
async function cloneCollection(sourceName, targetName) {
  // Get source collection
  const source = await pb.collections.getOne(sourceName);
  
  // Create new collection based on source
  const clone = {
    ...source,
    id: undefined, // Let it auto-generate
    name: targetName,
    created: undefined,
    updated: undefined,
    system: false,
  };
  
  // Remove system fields
  clone.fields = clone.fields.filter(f => !f.system);
  
  // Create cloned collection
  return await pb.collections.create(clone);
}
```

### Example 4: Backup and Restore

```javascript
async function backupCollections() {
  // Get all collections
  const collections = await pb.collections.getFullList();
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync(
    'collections_backup.json',
    JSON.stringify(collections, null, 2)
  );
  
  console.log(`Backed up ${collections.length} collections`);
}

async function restoreCollections() {
  // Load from file
  const fs = require('fs');
  const collections = JSON.parse(
    fs.readFileSync('collections_backup.json', 'utf8')
  );
  
  // Restore
  await pb.collections.import(collections, false);
  
  console.log(`Restored ${collections.length} collections`);
}
```

### Example 5: Validate Collection Configuration

```javascript
async function validateCollection(name) {
  try {
    const collection = await pb.collections.getOne(name);
    
    // Check required fields
    const hasRequiredFields = collection.fields.some(f => f.required);
    if (!hasRequiredFields) {
      console.warn('Collection has no required fields');
    }
    
    // Check API rules
    if (collection.type === 'base' && !collection.listRule) {
      console.warn('Base collection has no listRule (superuser only)');
    }
    
    // Check indexes
    if (collection.indexes.length === 0) {
      console.warn('Collection has no indexes');
    }
    
    return true;
  } catch (error) {
    console.error('Validation failed:', error);
    return false;
  }
}
```

## Error Handling

```javascript
try {
  await pb.collections.create({
    name: 'test',
    type: 'base',
    fields: [],
  });
} catch (error) {
  if (error.status === 401) {
    console.error('Not authenticated');
  } else if (error.status === 403) {
    console.error('Not a superuser');
  } else if (error.status === 400) {
    console.error('Validation error:', error.data);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Always Authenticate**: Ensure you're authenticated as a superuser before making requests
2. **Backup Before Import**: Always backup existing collections before using `import` with `deleteMissing: true`
3. **Validate Schema**: Validate collection schemas before creating/updating
4. **Use Scaffolds**: Use scaffolds as starting points for consistency
5. **Test Rules**: Test API rules thoroughly before deploying to production
6. **Index Important Fields**: Add indexes for frequently queried fields
7. **Document Schemas**: Keep documentation of your collection schemas
8. **Version Control**: Store collection schemas in version control for migration tracking

## Limitations

- **Superuser Only**: All operations require superuser authentication
- **System Collections**: System collections cannot be deleted or renamed
- **View Collections**: Cannot be truncated (they don't store records)
- **Relations**: Collections referenced by others cannot be deleted
- **Field Modifications**: Some field type changes may require data migration

## Related Documentation

- [Collections Guide](./COLLECTIONS.md) - Working with collections and records
- [API Records](./API_RECORDS.md) - Record CRUD operations
- [API Rules and Filters](./API_RULES_AND_FILTERS.md) - Understanding API rules
