# Files Upload and Handling - JavaScript SDK Documentation

## Overview

BosBase allows you to upload and manage files through file fields in your collections. Files are stored with sanitized names and a random suffix for security (e.g., `test_52iwbgds7l.png`).

**Key Features:**
- Upload multiple files per field
- Maximum file size: ~8GB (2^53-1 bytes)
- Automatic filename sanitization and random suffix
- Image thumbnails support
- Protected files with token-based access
- File modifiers for append/prepend/delete operations

**Backend Endpoints:**
- `POST /api/files/token` - Get file access token for protected files
- `GET /api/files/{collection}/{recordId}/{filename}` - Download file

## File Field Configuration

Before uploading files, you must add a file field to your collection:

```javascript
const collection = await pb.collections.getOne('example');

collection.fields.push({
  name: 'documents',
  type: 'file',
  maxSelect: 5,        // Maximum number of files (1 for single file)
  maxSize: 5242880,    // 5MB in bytes (optional, default: 5MB)
  mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  thumbs: ['100x100', '300x300'],  // Thumbnail sizes for images
  protected: false     // Require token for access
});

await pb.collections.update('example', { fields: collection.fields });
```

## Uploading Files

### Basic Upload with Create

When creating a new record, you can upload files directly:

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://localhost:8090');

// Method 1: Using File/Blob objects
const createdRecord = await pb.collection('example').create({
  title: 'Hello world!',
  'documents': [
    new File(['content 1...'], 'file1.txt'),
    new File(['content 2...'], 'file2.txt'),
  ]
});

// Method 2: Using FormData (for HTML file inputs)
const formData = new FormData();
formData.append('title', 'Hello world!');

// Handle file input
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', function() {
  for (let file of fileInput.files) {
    formData.append('documents', file);
  }
});

const createdRecord = await pb.collection('example').create(formData);
```

### Upload with Update

```javascript
// Update record and upload new files
const updatedRecord = await pb.collection('example').update('RECORD_ID', {
  title: 'Updated title',
  'documents': [
    new File(['content 3...'], 'file3.txt'),
  ]
});
```

### Append Files (Using + Modifier)

For multiple file fields, use the `+` modifier to append files:

```javascript
// Append files to existing ones
await pb.collection('example').update('RECORD_ID', {
  'documents+': new File(['content 4...'], 'file4.txt')
});

// Or prepend files (files will appear first)
await pb.collection('example').update('RECORD_ID', {
  '+documents': new File(['content 0...'], 'file0.txt')
});
```

### Upload Multiple Files with Modifiers

```javascript
const formData = new FormData();
formData.append('title', 'Updated');

// Append multiple files
for (let file of selectedFiles) {
  formData.append('documents+', file);
}

await pb.collection('example').update('RECORD_ID', formData);
```

## Deleting Files

### Delete All Files

```javascript
// Delete all files in a field (set to empty array)
await pb.collection('example').update('RECORD_ID', {
  'documents': []
});
```

### Delete Specific Files (Using - Modifier)

```javascript
// Delete individual files by filename
await pb.collection('example').update('RECORD_ID', {
  'documents-': ['file1.pdf', 'file2.txt']
});
```

### Delete with FormData

```javascript
const formData = new FormData();
formData.append('documents', '');  // Empty string for all files
// OR
formData.append('documents-', 'file1.pdf');
formData.append('documents-', 'file2.txt');

await pb.collection('example').update('RECORD_ID', formData);
```

## File URLs

### Get File URL

Each uploaded file can be accessed via its URL:

```
http://localhost:8090/api/files/COLLECTION_ID_OR_NAME/RECORD_ID/FILENAME
```

**Using SDK:**

```javascript
const record = await pb.collection('example').getOne('RECORD_ID');

// Single file field (returns string)
const filename = record.documents;
const url = pb.files.getURL(record, filename);

// Multiple file field (returns array)
const firstFile = record.documents[0];
const url = pb.files.getURL(record, firstFile);
```

### Image Thumbnails

If your file field has thumbnail sizes configured, you can request thumbnails:

```javascript
const record = await pb.collection('example').getOne('RECORD_ID');
const filename = record.avatar;  // Image file

// Get thumbnail with specific size
const thumbUrl = pb.files.getURL(record, filename, {
  thumb: '100x300'  // Width x Height
});
```

**Thumbnail Formats:**

- `WxH` (e.g., `100x300`) - Crop to WxH viewbox from center
- `WxHt` (e.g., `100x300t`) - Crop to WxH viewbox from top
- `WxHb` (e.g., `100x300b`) - Crop to WxH viewbox from bottom
- `WxHf` (e.g., `100x300f`) - Fit inside WxH viewbox (no cropping)
- `0xH` (e.g., `0x300`) - Resize to H height, preserve aspect ratio
- `Wx0` (e.g., `100x0`) - Resize to W width, preserve aspect ratio

**Supported Image Formats:**
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif` - first frame only)
- WebP (`.webp` - stored as PNG)

**Example:**

```javascript
const record = await pb.collection('products').getOne('PRODUCT_ID');
const image = record.image;

// Different thumbnail sizes
const thumbSmall = pb.files.getURL(record, image, { thumb: '100x100' });
const thumbMedium = pb.files.getURL(record, image, { thumb: '300x300f' });
const thumbLarge = pb.files.getURL(record, image, { thumb: '800x600' });
const thumbHeight = pb.files.getURL(record, image, { thumb: '0x400' });
const thumbWidth = pb.files.getURL(record, image, { thumb: '600x0' });
```

### Force Download

To force browser download instead of preview:

```javascript
const url = pb.files.getURL(record, filename, {
  download: 1  // Force download
});
```

## Protected Files

By default, all files are publicly accessible if you know the full URL. For sensitive files, you can mark the field as "Protected" in the collection settings.

### Setting Up Protected Files

```javascript
const collection = await pb.collections.getOne('example');

const fileField = collection.fields.find(f => f.name === 'documents');
if (fileField) {
  fileField.protected = true;
  await pb.collections.update('example', { fields: collection.fields });
}
```

### Accessing Protected Files

Protected files require authentication and a file token:

```javascript
// Step 1: Authenticate
await pb.collection('users').authWithPassword('user@example.com', 'password123');

// Step 2: Get file token (valid for ~2 minutes)
const fileToken = await pb.files.getToken();

// Step 3: Get protected file URL with token
const record = await pb.collection('example').getOne('RECORD_ID');
const url = pb.files.getURL(record, record.privateDocument, {
  token: fileToken
});

// Use the URL
const img = document.createElement('img');
img.src = url;
```

**Important:**
- File tokens are short-lived (~2 minutes)
- Only authenticated users satisfying the collection's `viewRule` can access protected files
- Tokens must be regenerated when they expire

### Complete Protected File Example

```javascript
async function loadProtectedImage(recordId, filename) {
  try {
    // Check if authenticated
    if (!pb.authStore.isValid) {
      throw new Error('Not authenticated');
    }

    // Get fresh token
    const token = await pb.files.getToken();

    // Get file URL
    const record = await pb.collection('example').getOne(recordId);
    const url = pb.files.getURL(record, filename, { token });

    return url;
  } catch (err) {
    if (err.status === 404) {
      console.error('File not found or access denied');
    } else if (err.status === 401) {
      console.error('Authentication required');
      pb.authStore.clear();
    }
    throw err;
  }
}
```

## Complete Examples

### Example 1: Image Upload with Thumbnails

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://localhost:8090');
await pb.admins.authWithPassword('admin@example.com', 'password');

// Create collection with image field and thumbnails
const collection = await pb.collections.createBase('products', {
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'image',
      type: 'file',
      maxSelect: 1,
      mimeTypes: ['image/jpeg', 'image/png'],
      thumbs: ['100x100', '300x300', '800x600f']  // Thumbnail sizes
    }
  ]
});

// Upload product with image
const product = await pb.collection('products').create({
  name: 'My Product',
  image: new File([imageBlob], 'product.jpg')
});

// Display thumbnail in UI
const thumbnailUrl = pb.files.getURL(product, product.image, {
  thumb: '300x300'
});

const img = document.createElement('img');
img.src = thumbnailUrl;
document.body.appendChild(img);
```

### Example 2: Multiple File Upload with Progress

```javascript
const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('progress');

fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  
  const formData = new FormData();
  formData.append('title', 'Document Set');

  // Add all files
  files.forEach(file => {
    formData.append('documents', file);
  });

  try {
    // Note: Progress tracking requires XMLHttpRequest or fetch API with ReadableStream
    const record = await pb.collection('example').create(formData);
    
    console.log('Uploaded files:', record.documents);
    progressBar.value = 100;
  } catch (err) {
    console.error('Upload failed:', err);
  }
});
```

### Example 3: File Management UI

```javascript
class FileManager {
  constructor(collectionId, recordId) {
    this.collectionId = collectionId;
    this.recordId = recordId;
    this.record = null;
  }

  async load() {
    this.record = await pb.collection(this.collectionId).getOne(this.recordId);
    this.render();
  }

  render() {
    const container = document.getElementById('files-list');
    container.innerHTML = '';

    const files = Array.isArray(this.record.documents) 
      ? this.record.documents 
      : [this.record.documents].filter(Boolean);

    files.forEach(filename => {
      const fileItem = this.createFileItem(filename);
      container.appendChild(fileItem);
    });
  }

  createFileItem(filename) {
    const div = document.createElement('div');
    div.className = 'file-item';

    const url = pb.files.getURL(this.record, filename);
    const link = document.createElement('a');
    link.href = url;
    link.textContent = filename;
    link.target = '_blank';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => this.deleteFile(filename);

    div.appendChild(link);
    div.appendChild(deleteBtn);
    return div;
  }

  async deleteFile(filename) {
    await pb.collection(this.collectionId).update(this.recordId, {
      'documents-': [filename]
    });
    await this.load();  // Reload
  }

  async addFiles(files) {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('documents+', file);
    });

    await pb.collection(this.collectionId).update(this.recordId, formData);
    await this.load();  // Reload
  }
}

// Usage
const manager = new FileManager('example', 'RECORD_ID');
await manager.load();
```

### Example 4: Protected Document Viewer

```javascript
async function viewProtectedDocument(recordId, filename) {
  // Authenticate if needed
  if (!pb.authStore.isValid) {
    await pb.collection('users').authWithPassword('user@example.com', 'pass');
  }

  // Get token
  let token;
  try {
    token = await pb.files.getToken();
  } catch (err) {
    console.error('Failed to get file token:', err);
    return null;
  }

  // Get record and file URL
  const record = await pb.collection('documents').getOne(recordId);
  const url = pb.files.getURL(record, filename, { token });

  // Open in new tab or iframe
  window.open(url, '_blank');
  return url;
}
```

### Example 5: Image Gallery with Thumbnails

```javascript
async function displayImageGallery(recordId) {
  const record = await pb.collection('gallery').getOne(recordId);
  const images = record.images;  // Array of filenames

  const gallery = document.getElementById('gallery');
  
  images.forEach(filename => {
    // Thumbnail for grid view
    const thumbUrl = pb.files.getURL(record, filename, {
      thumb: '200x200f'  // Fit inside 200x200
    });

    // Full size for lightbox
    const fullUrl = pb.files.getURL(record, filename, {
      thumb: '1200x800f'  // Larger size
    });

    const item = document.createElement('div');
    item.className = 'gallery-item';
    
    const thumb = document.createElement('img');
    thumb.src = thumbUrl;
    thumb.onclick = () => openLightbox(fullUrl);
    
    item.appendChild(thumb);
    gallery.appendChild(item);
  });
}
```

## File Field Modifiers

### Summary

- **No modifier** - Replace all files: `documents: [file1, file2]`
- **`+` suffix** - Append files: `documents+: file3`
- **`+` prefix** - Prepend files: `+documents: file0`
- **`-` suffix** - Delete files: `documents-: ['file1.pdf']`

## Best Practices

1. **File Size Limits**: Always validate file sizes on the client before upload
2. **MIME Types**: Configure allowed MIME types in collection field settings
3. **Thumbnails**: Pre-generate common thumbnail sizes for better performance
4. **Protected Files**: Use protected files for sensitive documents (ID cards, contracts)
5. **Token Refresh**: Refresh file tokens before they expire for protected files
6. **Error Handling**: Handle 404 errors for missing files and 401 for protected file access
7. **Filename Sanitization**: Files are automatically sanitized, but validate on client side too

## Error Handling

```javascript
try {
  const record = await pb.collection('example').create({
    title: 'Test',
    documents: [new File(['content'], 'test.txt')]
  });
} catch (err) {
  if (err.status === 413) {
    console.error('File too large');
  } else if (err.status === 400) {
    console.error('Invalid file type or field validation failed');
  } else if (err.status === 403) {
    console.error('Insufficient permissions');
  } else {
    console.error('Upload failed:', err);
  }
}
```

## Storage Options

By default, BosBase stores files in `pb_data/storage` on the local filesystem. For production, you can configure S3-compatible storage (AWS S3, MinIO, Wasabi, DigitalOcean Spaces, etc.) from:
**Dashboard > Settings > Files storage**

This is configured server-side and doesn't require SDK changes.

## Related Documentation

- [Collections](./COLLECTIONS.md) - Collection and field configuration
- [Authentication](./AUTHENTICATION.md) - Required for protected files
