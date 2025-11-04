# API Records - JavaScript SDK Documentation

## Overview

The Records API provides comprehensive CRUD (Create, Read, Update, Delete) operations for collection records, along with powerful search, filtering, and authentication capabilities.

**Key Features:**
- Paginated list and search with filtering and sorting
- Single record retrieval with expand support
- Create, update, and delete operations
- Batch operations for multiple records
- Authentication methods (password, OAuth2, OTP)
- Email verification and password reset
- Relation expansion up to 6 levels deep
- Field selection and excerpt modifiers

**Backend Endpoints:**
- `GET /api/collections/{collection}/records` - List records
- `GET /api/collections/{collection}/records/{id}` - View record
- `POST /api/collections/{collection}/records` - Create record
- `PATCH /api/collections/{collection}/records/{id}` - Update record
- `DELETE /api/collections/{collection}/records/{id}` - Delete record
- `POST /api/batch` - Batch operations

## CRUD Operations

### List/Search Records

Returns a paginated records list with support for sorting, filtering, and expansion.

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Basic list with pagination
const result = await pb.collection('posts').getList(1, 50);

console.log(result.page);        // 1
console.log(result.perPage);     // 50
console.log(result.totalItems);  // 150
console.log(result.totalPages);  // 3
console.log(result.items);       // Array of records
```

#### Advanced List with Filtering and Sorting

```javascript
// Filter and sort
const result = await pb.collection('posts').getList(1, 50, {
  filter: 'created >= "2022-01-01 00:00:00" && status = "published"',
  sort: '-created,title',  // DESC by created, ASC by title
  expand: 'author,categories',
});

// Filter with operators
const result2 = await pb.collection('posts').getList(1, 50, {
  filter: 'title ~ "javascript" && views > 100',
  sort: '-views',
});
```

#### Get Full List

Fetch all records at once (useful for small collections):

```javascript
// Get all records
const allPosts = await pb.collection('posts').getFullList({
  sort: '-created',
  filter: 'status = "published"',
});

// With batch size for large collections
const allPosts = await pb.collection('posts').getFullList(200, {
  sort: '-created',
});
```

#### Get First Matching Record

Get only the first record that matches a filter:

```javascript
const post = await pb.collection('posts').getFirstListItem(
  'slug = "my-post-slug"',
  {
    expand: 'author,categories.tags',
  }
);
```

### View Record

Retrieve a single record by ID:

```javascript
// Basic retrieval
const record = await pb.collection('posts').getOne('RECORD_ID');

// With expanded relations
const record = await pb.collection('posts').getOne('RECORD_ID', {
  expand: 'author,categories,tags',
});

// Nested expand
const record = await pb.collection('comments').getOne('COMMENT_ID', {
  expand: 'post.author,user',
});

// Field selection
const record = await pb.collection('posts').getOne('RECORD_ID', {
  fields: 'id,title,content,author.name',
});
```

### Create Record

Create a new record:

```javascript
// Simple create
const record = await pb.collection('posts').create({
  title: 'My First Post',
  content: 'Lorem ipsum...',
  status: 'draft',
});

// Create with relations
const record = await pb.collection('posts').create({
  title: 'My Post',
  author: 'AUTHOR_ID',           // Single relation
  categories: ['cat1', 'cat2'],  // Multiple relation
});

// Create with file upload (multipart/form-data)
const formData = new FormData();
formData.append('title', 'My Post');
formData.append('image', fileInput.files[0]);

const record = await pb.collection('posts').create(formData);

// Create with expand to get related data immediately
const record = await pb.collection('posts').create({
  title: 'My Post',
  author: 'AUTHOR_ID',
}, {
  expand: 'author',
});
```

### Update Record

Update an existing record:

```javascript
// Simple update
const record = await pb.collection('posts').update('RECORD_ID', {
  title: 'Updated Title',
  status: 'published',
});

// Update with relations
await pb.collection('posts').update('RECORD_ID', {
  'categories+': 'NEW_CATEGORY_ID',  // Append
  'tags-': 'OLD_TAG_ID',              // Remove
});

// Update with file upload
const formData = new FormData();
formData.append('title', 'Updated Title');
formData.append('image', newFile);

const record = await pb.collection('posts').update('RECORD_ID', formData);

// Update with expand
const record = await pb.collection('posts').update('RECORD_ID', {
  title: 'Updated',
}, {
  expand: 'author,categories',
});
```

### Delete Record

Delete a record:

```javascript
// Simple delete
await pb.collection('posts').delete('RECORD_ID');

// Note: Returns 204 No Content on success
// Throws error if record doesn't exist or permission denied
```

## Filter Syntax

The filter parameter supports a powerful query syntax:

### Comparison Operators

```javascript
// Equal
filter: 'status = "published"'

// Not equal
filter: 'status != "draft"'

// Greater than / Less than
filter: 'views > 100'
filter: 'created < "2023-01-01"'

// Greater/Less than or equal
filter: 'age >= 18'
filter: 'price <= 99.99'
```

### String Operators

```javascript
// Contains (like)
filter: 'title ~ "javascript"'
// Equivalent to: title LIKE "%javascript%"

// Not contains
filter: 'title !~ "deprecated"'

// Exact match (case-sensitive)
filter: 'email = "user@example.com"'
```

### Array Operators (for multiple relations/files)

```javascript
// Any of / At least one
filter: 'tags.id ?= "TAG_ID"'         // Any tag matches
filter: 'tags.name ?~ "important"'    // Any tag name contains "important"

// All must match
filter: 'tags.id = "TAG_ID" && tags.id = "TAG_ID2"'
```

### Logical Operators

```javascript
// AND
filter: 'status = "published" && views > 100'

// OR
filter: 'status = "published" || status = "featured"'

// Parentheses for grouping
filter: '(status = "published" || featured = true) && views > 50'
```

### Special Identifiers

```javascript
// Request context (only in API rules, not client filters)
// @request.auth.id, @request.query.*, etc.

// Collection joins
filter: '@collection.users.email = "test@example.com"'

// Record fields
filter: 'author.id = @request.auth.id'
```

### Comments

```javascript
// Single-line comments are supported
filter: 'status = "published" // Only published posts'
```

## Sorting

Sort records using the `sort` parameter:

```javascript
// Single field (ASC)
sort: 'created'

// Single field (DESC)
sort: '-created'

// Multiple fields
sort: '-created,title'  // DESC by created, then ASC by title

// Supported fields
sort: '@random'         // Random order
sort: '@rowid'          // Internal row ID
sort: 'id'              // Record ID
sort: 'fieldName'       // Any collection field

// Relation field sorting
sort: 'author.name'     // Sort by related author's name
```

## Field Selection

Control which fields are returned:

```javascript
// Specific fields
fields: 'id,title,content'

// All fields at level
fields: '*'

// Nested field selection
fields: '*,author.name,author.email'

// Excerpt modifier for text fields
fields: '*,content:excerpt(200,true)'
// Returns first 200 characters with ellipsis if truncated

// Combined
fields: '*,content:excerpt(200),author.name,author.email'
```

## Expanding Relations

Expand related records without additional API calls:

```javascript
// Single relation
expand: 'author'

// Multiple relations
expand: 'author,categories,tags'

// Nested relations (up to 6 levels)
expand: 'author.profile,categories.tags'

// Back-relations
expand: 'comments_via_post.user'
```

See [Relations Documentation](./RELATIONS.md) for detailed information.

## Pagination Options

```javascript
// Skip total count (faster queries)
const result = await pb.collection('posts').getList(1, 50, {
  skipTotal: true,  // totalItems and totalPages will be -1
  filter: 'status = "published"',
});

// Get Full List with batch processing
const allPosts = await pb.collection('posts').getFullList(200, {
  sort: '-created',
});
// Processes in batches of 200 to avoid memory issues
```

## Batch Operations

Execute multiple operations in a single transaction:

```javascript
// Create a batch
const batch = pb.createBatch();

// Add operations
batch.collection('posts').create({
  title: 'Post 1',
  author: 'AUTHOR_ID',
});

batch.collection('posts').create({
  title: 'Post 2',
  author: 'AUTHOR_ID',
});

batch.collection('tags').update('TAG_ID', {
  name: 'Updated Tag',
});

batch.collection('categories').delete('CAT_ID');

// Upsert (create or update based on id)
batch.collection('posts').upsert({
  id: 'EXISTING_ID',
  title: 'Updated Post',
});

// Send batch request
const results = await batch.send();

// Results is an array matching the order of operations
results.forEach((result, index) => {
  if (result.status >= 400) {
    console.error(`Operation ${index} failed:`, result.body);
  } else {
    console.log(`Operation ${index} succeeded:`, result.body);
  }
});
```

**Note**: Batch operations must be enabled in Dashboard > Settings > Application.

## Authentication Actions

### List Auth Methods

Get available authentication methods for a collection:

```javascript
const methods = await pb.collection('users').listAuthMethods();

console.log(methods.password.enabled);      // true/false
console.log(methods.oauth2.enabled);       // true/false
console.log(methods.oauth2.providers);     // Array of OAuth2 providers
console.log(methods.otp.enabled);          // true/false
console.log(methods.mfa.enabled);          // true/false
```

### Auth with Password

```javascript
const authData = await pb.collection('users').authWithPassword(
  'user@example.com',  // username or email
  'password123'
);

// Auth data is automatically stored in pb.authStore
console.log(pb.authStore.isValid);    // true
console.log(pb.authStore.token);      // JWT token
console.log(pb.authStore.record.id);  // User ID

// Access the returned data
console.log(authData.token);
console.log(authData.record);

// With expand
const authData = await pb.collection('users').authWithPassword(
  'user@example.com',
  'password123',
  {
    expand: 'profile',
  }
);
```

### Auth with OAuth2

```javascript
// Step 1: Get OAuth2 URL (usually done in UI)
const methods = await pb.collection('users').listAuthMethods();
const provider = methods.oauth2.providers.find(p => p.name === 'google');

// Redirect user to provider.authURL
window.location.href = provider.authURL;

// Step 2: After redirect, exchange code for token
const authData = await pb.collection('users').authWithOAuth2Code(
  'google',                    // Provider name
  'AUTHORIZATION_CODE',        // From redirect URL
  provider.codeVerifier,       // From step 1
  'https://yourapp.com/callback', // Redirect URL
  {                            // Optional data for new accounts
    name: 'John Doe',
  }
);
```

### Auth with OTP (One-Time Password)

```javascript
// Step 1: Request OTP
const otpRequest = await pb.collection('users').requestOTP('user@example.com');
// Returns: { otpId: "..." }

// Step 2: User enters OTP from email
// Step 3: Authenticate with OTP
const authData = await pb.collection('users').authWithOTP(
  otpRequest.otpId,
  '123456'  // OTP from email
);
```

### Auth Refresh

Refresh the current auth token and get updated user data:

```javascript
// Refresh auth (useful on page reload)
const authData = await pb.collection('users').authRefresh();

// Check if still valid
if (pb.authStore.isValid) {
  console.log('User is authenticated');
} else {
  console.log('Token expired or invalid');
}
```

### Email Verification

```javascript
// Request verification email
await pb.collection('users').requestVerification('user@example.com');

// Confirm verification (on verification page)
await pb.collection('users').confirmVerification('VERIFICATION_TOKEN');
```

### Password Reset

```javascript
// Request password reset email
await pb.collection('users').requestPasswordReset('user@example.com');

// Confirm password reset (on reset page)
// Note: This invalidates all previous auth tokens
await pb.collection('users').confirmPasswordReset(
  'RESET_TOKEN',
  'newpassword123',
  'newpassword123'  // Confirm
);
```

### Email Change

```javascript
// Must be authenticated first
await pb.collection('users').authWithPassword('user@example.com', 'password');

// Request email change
await pb.collection('users').requestEmailChange('newemail@example.com');

// Confirm email change (on confirmation page)
// Note: This invalidates all previous auth tokens
await pb.collection('users').confirmEmailChange(
  'EMAIL_CHANGE_TOKEN',
  'currentpassword'
);
```

### Impersonate (Superuser Only)

Generate a token to authenticate as another user:

```javascript
// Must be authenticated as superuser
await pb.admins.authWithPassword('admin@example.com', 'password');

// Impersonate a user
const impersonateClient = pb.collection('users').impersonate('USER_ID', 3600);
// Returns a new client instance with impersonated user's token

// Use the impersonated client
const posts = await impersonateClient.collection('posts').getFullList();

// Access the token
console.log(impersonateClient.authStore.token);
console.log(impersonateClient.authStore.record);
```

## Complete Examples

### Example 1: Blog Post Search with Filters

```javascript
async function searchPosts(query, categoryId, minViews) {
  let filter = `title ~ "${query}" || content ~ "${query}"`;
  
  if (categoryId) {
    filter += ` && categories.id ?= "${categoryId}"`;
  }
  
  if (minViews) {
    filter += ` && views >= ${minViews}`;
  }
  
  const result = await pb.collection('posts').getList(1, 20, {
    filter: filter,
    sort: '-created',
    expand: 'author,categories',
  });
  
  return result.items;
}
```

### Example 2: User Dashboard with Related Content

```javascript
async function getUserDashboard(userId) {
  // Get user's posts
  const posts = await pb.collection('posts').getList(1, 10, {
    filter: `author = "${userId}"`,
    sort: '-created',
    expand: 'categories',
  });
  
  // Get user's comments
  const comments = await pb.collection('comments').getList(1, 10, {
    filter: `user = "${userId}"`,
    sort: '-created',
    expand: 'post',
  });
  
  return {
    posts: posts.items,
    comments: comments.items,
  };
}
```

### Example 3: Advanced Filtering

```javascript
// Complex filter example
const result = await pb.collection('posts').getList(1, 50, {
  filter: `
    (status = "published" || featured = true) &&
    created >= "2023-01-01" &&
    (tags.id ?= "important" || categories.id = "news") &&
    views > 100 &&
    author.email != ""
  `,
  sort: '-views,created',
  expand: 'author.profile,tags,categories',
  fields: '*,content:excerpt(300),author.name,author.email',
});
```

### Example 4: Batch Create Posts

```javascript
async function createMultiplePosts(postsData) {
  const batch = pb.createBatch();
  
  postsData.forEach(postData => {
    batch.collection('posts').create(postData);
  });
  
  const results = await batch.send();
  
  // Check for failures
  const failures = results
    .map((result, index) => ({ index, result }))
    .filter(({ result }) => result.status >= 400);
  
  if (failures.length > 0) {
    console.error('Some posts failed to create:', failures);
  }
  
  return results.map(r => r.body);
}
```

### Example 5: Pagination Helper

```javascript
async function getAllRecordsPaginated(collectionName, options = {}) {
  const allRecords = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const result = await pb.collection(collectionName).getList(page, 500, {
      ...options,
      skipTotal: true,  // Skip count for performance
    });
    
    allRecords.push(...result.items);
    
    hasMore = result.items.length === 500;
    page++;
  }
  
  return allRecords;
}
```

### Example 6: OAuth2 Authentication Flow

```javascript
async function handleOAuth2Login(providerName) {
  // Get OAuth2 methods
  const methods = await pb.collection('users').listAuthMethods();
  const provider = methods.oauth2.providers.find(p => p.name === providerName);
  
  if (!provider) {
    throw new Error(`Provider ${providerName} not available`);
  }
  
  // Store code verifier for later
  sessionStorage.setItem('oauth2_code_verifier', provider.codeVerifier);
  sessionStorage.setItem('oauth2_provider', providerName);
  
  // Redirect to provider
  window.location.href = provider.authURL;
}

// After redirect callback
async function handleOAuth2Callback(code) {
  const codeVerifier = sessionStorage.getItem('oauth2_code_verifier');
  const provider = sessionStorage.getItem('oauth2_provider');
  const redirectUrl = window.location.origin + '/auth/callback';
  
  try {
    const authData = await pb.collection('users').authWithOAuth2Code(
      provider,
      code,
      codeVerifier,
      redirectUrl,
      {
        // Optional: data for new account creation
        name: 'User',
      }
    );
    
    // Success! User is now authenticated
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('OAuth2 authentication failed:', error);
  }
}
```

## Error Handling

```javascript
try {
  const record = await pb.collection('posts').create({
    title: 'My Post',
  });
} catch (error) {
  if (error.status === 400) {
    // Validation error
    console.error('Validation errors:', error.data);
  } else if (error.status === 403) {
    // Permission denied
    console.error('Access denied');
  } else if (error.status === 404) {
    // Not found
    console.error('Collection or record not found');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Use Pagination**: Always use pagination for large datasets
2. **Skip Total When Possible**: Use `skipTotal: true` for better performance when you don't need counts
3. **Batch Operations**: Use batch for multiple operations to reduce round trips
4. **Field Selection**: Only request fields you need to reduce payload size
5. **Expand Wisely**: Only expand relations you actually use
6. **Filter Before Sort**: Apply filters before sorting for better performance
7. **Cache Auth Tokens**: Auth tokens are automatically stored in `authStore`, no need to manually cache
8. **Handle Errors**: Always handle authentication and permission errors gracefully

## Related Documentation

- [Collections](./COLLECTIONS.md) - Collection configuration
- [Relations](./RELATIONS.md) - Working with relations
- [API Rules and Filters](./API_RULES_AND_FILTERS.md) - Filter syntax details
- [Authentication](./AUTHENTICATION.md) - Detailed authentication guide
- [Files](./FILES.md) - File uploads and handling
