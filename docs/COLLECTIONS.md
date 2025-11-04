# Collections - JavaScript SDK Documentation

## Overview

**Collections** represent your application data. Under the hood they are backed by plain SQLite tables that are generated automatically with the collection **name** and **fields** (columns).

A single entry of a collection is called a **record** (a single row in the SQL table).

## Collection Types

### Base Collection

Default collection type for storing any application data.

```javascript
import BosBase from 'bosbase';
const pb = new BosBase('http://localhost:8090');
await pb.admins.authWithPassword('admin@example.com', 'password');

const collection = await pb.collections.createBase('articles', {
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'text' }
  ]
});
```

### View Collection

Read-only collection populated from a SQL SELECT statement.

```javascript
const view = await pb.collections.createView('post_stats', 
  `SELECT posts.id, posts.name, count(comments.id) as totalComments 
   FROM posts LEFT JOIN comments on comments.postId = posts.id 
   GROUP BY posts.id`
);
```

### Auth Collection

Base collection with authentication fields (email, password, etc.).

```javascript
const users = await pb.collections.createAuth('users', {
  fields: [{ name: 'name', type: 'text', required: true }]
});
```

## Collections API

### List Collections

```javascript
const result = await pb.collections.getList(1, 50);
const all = await pb.collections.getFullList();
```

### Get Collection

```javascript
const collection = await pb.collections.getOne('articles');
```

### Create Collection

```javascript
// Using scaffolds
const base = await pb.collections.createBase('articles');
const auth = await pb.collections.createAuth('users');
const view = await pb.collections.createView('stats', 'SELECT * FROM posts');

// Manual
const collection = await pb.collections.create({
  type: 'base',
  name: 'articles',
  fields: [{ name: 'title', type: 'text', required: true }]
});
```

### Update Collection

```javascript
await pb.collections.update('articles', { listRule: 'published = true' });
```

### Delete Collection

```javascript
await pb.collections.delete('articles');
```

## Records API

### List Records

```javascript
const result = await pb.collection('articles').getList(1, 20, {
  filter: 'published = true',
  sort: '-created',
  expand: 'author'
});
```

### Get Record

```javascript
const record = await pb.collection('articles').getOne('RECORD_ID', {
  expand: 'author,category'
});
```

### Create Record

```javascript
const record = await pb.collection('articles').create({
  title: 'My Article',
  'views+': 1  // Field modifier
});
```

### Update Record

```javascript
await pb.collection('articles').update('RECORD_ID', {
  title: 'Updated',
  'views+': 1,
  'tags+': 'new-tag'
});
```

### Delete Record

```javascript
await pb.collection('articles').delete('RECORD_ID');
```

## Field Types

### BoolField

```javascript
{ name: 'published', type: 'bool', required: true }
await pb.collection('articles').create({ published: true });
```

### NumberField

```javascript
{ name: 'views', type: 'number', min: 0 }
await pb.collection('articles').update('ID', { 'views+': 1 });
```

### TextField

```javascript
{ name: 'title', type: 'text', required: true, min: 6, max: 100 }
await pb.collection('articles').create({ 'slug:autogenerate': 'article-' });
```

### EmailField

```javascript
{ name: 'email', type: 'email', required: true }
```

### URLField

```javascript
{ name: 'website', type: 'url' }
```

### EditorField

```javascript
{ name: 'content', type: 'editor', required: true }
await pb.collection('articles').create({ content: '<p>HTML content</p>' });
```

### DateField

```javascript
{ name: 'published_at', type: 'date' }
await pb.collection('articles').create({ 
  published_at: '2024-11-10 18:45:27.123Z' 
});
```

### AutodateField

```javascript
{ name: 'created', type: 'autodate' }
// Value auto-set by backend
```

### SelectField

```javascript
// Single select
{ name: 'status', type: 'select', options: { values: ['draft', 'published'] }, maxSelect: 1 }
await pb.collection('articles').create({ status: 'published' });

// Multiple select
{ name: 'tags', type: 'select', options: { values: ['tech', 'design'] }, maxSelect: 5 }
await pb.collection('articles').update('ID', { 'tags+': 'marketing' });
```

### FileField

```javascript
// Single file
{ name: 'cover', type: 'file', maxSelect: 1, mimeTypes: ['image/jpeg'] }
const formData = new FormData();
formData.append('cover', fileInput.files[0]);
await pb.collection('articles').create(formData);
```

### RelationField

```javascript
{ name: 'author', type: 'relation', options: { collectionId: 'users' }, maxSelect: 1 }
await pb.collection('articles').create({ author: 'USER_ID' });
const record = await pb.collection('articles').getOne('ID', { expand: 'author' });
```

### JSONField

```javascript
{ name: 'metadata', type: 'json' }
await pb.collection('articles').create({ 
  metadata: { seo: { title: 'SEO Title' } } 
});
```

### GeoPointField

```javascript
{ name: 'location', type: 'geoPoint' }
await pb.collection('places').create({ 
  location: { lon: 139.6917, lat: 35.6586 } 
});
```

## Complete Example

```javascript
import BosBase from 'bosbase';
const pb = new BosBase('http://localhost:8090');
await pb.admins.authWithPassword('admin@example.com', 'password');

// Create collections
const users = await pb.collections.createAuth('users');
const articles = await pb.collections.createBase('articles', {
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'author', type: 'relation', options: { collectionId: users.id }, maxSelect: 1 }
  ]
});

// Create and authenticate user
const user = await pb.collection('users').create({
  email: 'user@example.com',
  password: 'password123',
  passwordConfirm: 'password123'
});
await pb.collection('users').authWithPassword('user@example.com', 'password123');

// Create article
const article = await pb.collection('articles').create({
  title: 'My Article',
  author: user.id
});

// Subscribe to changes
await pb.collection('articles').subscribe('*', (e) => {
  console.log(e.action, e.record);
});
```
