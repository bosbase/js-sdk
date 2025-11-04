# File API - JavaScript SDK Documentation

## Overview

The File API provides endpoints for downloading and accessing files stored in collection records. It supports thumbnail generation for images, protected file access with tokens, and force download options.

**Key Features:**
- Download files from collection records
- Generate thumbnails for images (crop, fit, resize)
- Protected file access with short-lived tokens
- Force download option for any file type
- Automatic content-type detection
- Support for Range requests and caching

**Backend Endpoints:**
- `GET /api/files/{collection}/{recordId}/{filename}` - Download/fetch file
- `POST /api/files/token` - Generate protected file token

## Download / Fetch File

Downloads a single file resource from a record.

### Basic Usage

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Get a record with a file field
const record = await pb.collection('posts').getOne('RECORD_ID');

// Get the file URL
const fileUrl = pb.files.getURL(record, record.image);

// Use in HTML
const img = document.createElement('img');
img.src = fileUrl;
document.body.appendChild(img);
```

### File URL Structure

The file URL follows this pattern:
```
/api/files/{collectionIdOrName}/{recordId}/{filename}
```

Example:
```
http://127.0.0.1:8090/api/files/posts/abc123/photo_xyz789.jpg
```

### Using in HTML

```html
<!-- Direct image display -->
<img src="http://127.0.0.1:8090/api/files/posts/abc123/photo_xyz789.jpg" alt="Photo" />

<!-- Download link -->
<a href="http://127.0.0.1:8090/api/files/posts/abc123/document.pdf" download>Download PDF</a>

<!-- Video player -->
<video src="http://127.0.0.1:8090/api/files/posts/abc123/video.mp4" controls></video>
```

## Thumbnails

Generate thumbnails for image files on-the-fly.

### Thumbnail Formats

The following thumbnail formats are supported:

| Format | Example | Description |
|--------|---------|-------------|
| `WxH` | `100x300` | Crop to WxH viewbox (from center) |
| `WxHt` | `100x300t` | Crop to WxH viewbox (from top) |
| `WxHb` | `100x300b` | Crop to WxH viewbox (from bottom) |
| `WxHf` | `100x300f` | Fit inside WxH viewbox (without cropping) |
| `0xH` | `0x300` | Resize to H height preserving aspect ratio |
| `Wx0` | `100x0` | Resize to W width preserving aspect ratio |

### Using Thumbnails

```javascript
// Get thumbnail URL
const thumbUrl = pb.files.getURL(record, record.image, {
  thumb: '100x100'
});

// Different thumbnail sizes
const smallThumb = pb.files.getURL(record, record.image, {
  thumb: '50x50'
});

const mediumThumb = pb.files.getURL(record, record.image, {
  thumb: '200x200'
});

const largeThumb = pb.files.getURL(record, record.image, {
  thumb: '500x500'
});

// Fit thumbnail (no cropping)
const fitThumb = pb.files.getURL(record, record.image, {
  thumb: '200x200f'
});

// Resize to specific width
const widthThumb = pb.files.getURL(record, record.image, {
  thumb: '300x0'
});

// Resize to specific height
const heightThumb = pb.files.getURL(record, record.image, {
  thumb: '0x200'
});
```

### Thumbnail Examples in HTML

```html
<!-- Small thumbnail -->
<img src="http://127.0.0.1:8090/api/files/posts/abc123/photo.jpg?thumb=100x100" alt="Thumbnail" />

<!-- Medium thumbnail with fit -->
<img src="http://127.0.0.1:8090/api/files/posts/abc123/photo.jpg?thumb=300x300f" alt="Photo" />

<!-- Responsive thumbnail -->
<img 
  src="http://127.0.0.1:8090/api/files/posts/abc123/photo.jpg?thumb=400x400" 
  srcset="
    http://127.0.0.1:8090/api/files/posts/abc123/photo.jpg?thumb=200x200 200w,
    http://127.0.0.1:8090/api/files/posts/abc123/photo.jpg?thumb=400x400 400w,
    http://127.0.0.1:8090/api/files/posts/abc123/photo.jpg?thumb=800x800 800w
  "
  sizes="(max-width: 600px) 200px, (max-width: 1200px) 400px, 800px"
  alt="Responsive image"
/>
```

### Thumbnail Behavior

- **Image Files Only**: Thumbnails are only generated for image files (PNG, JPG, JPEG, GIF, WEBP)
- **Non-Image Files**: For non-image files, the thumb parameter is ignored and the original file is returned
- **Caching**: Thumbnails are cached and reused if already generated
- **Fallback**: If thumbnail generation fails, the original file is returned
- **Field Configuration**: Thumb sizes must be defined in the file field's `thumbs` option or use default `100x100`

## Protected Files

Protected files require a special token for access, even if you're authenticated.

### Getting a File Token

```javascript
// Must be authenticated first
await pb.collection('users').authWithPassword('user@example.com', 'password');

// Get file token
const token = await pb.files.getToken();

console.log(token); // Short-lived JWT token
```

### Using Protected File Token

```javascript
// Get protected file URL with token
const protectedFileUrl = pb.files.getURL(record, record.document, {
  token: token
});

// Access the file
fetch(protectedFileUrl)
  .then(response => response.blob())
  .then(blob => {
    // Use the file
    const url = URL.createObjectURL(blob);
    window.open(url);
  });
```

### Protected File Example

```javascript
async function displayProtectedImage(recordId) {
  // Authenticate
  await pb.collection('users').authWithPassword('user@example.com', 'password');
  
  // Get record
  const record = await pb.collection('documents').getOne(recordId);
  
  // Get file token
  const token = await pb.files.getToken();
  
  // Get protected file URL
  const imageUrl = pb.files.getURL(record, record.thumbnail, {
    token: token,
    thumb: '300x300'
  });
  
  // Display image
  const img = document.createElement('img');
  img.src = imageUrl;
  document.body.appendChild(img);
}
```

### Token Lifetime

- File tokens are short-lived (typically expires after a few minutes)
- Tokens are associated with the authenticated user/superuser
- Generate a new token if the previous one expires

## Force Download

Force files to download instead of being displayed in the browser.

```javascript
// Force download
const downloadUrl = pb.files.getURL(record, record.document, {
  download: true
});

// Create download link
const link = document.createElement('a');
link.href = downloadUrl;
link.download = record.document;
document.body.appendChild(link);
link.click();
```

### Download Parameter Values

```javascript
// These all force download:
pb.files.getURL(record, filename, { download: true });
pb.files.getURL(record, filename, { download: 1 });
pb.files.getURL(record, filename, { download: '1' });
pb.files.getURL(record, filename, { download: 't' });
pb.files.getURL(record, filename, { download: 'true' });

// These allow inline display (default):
pb.files.getURL(record, filename, { download: false });
pb.files.getURL(record, filename); // No download parameter
```

## Complete Examples

### Example 1: Image Gallery

```javascript
async function displayImageGallery(recordId) {
  const record = await pb.collection('posts').getOne(recordId);
  
  const images = Array.isArray(record.images) ? record.images : [record.image];
  
  const gallery = document.getElementById('gallery');
  
  images.forEach(filename => {
    // Thumbnail for gallery
    const thumbUrl = pb.files.getURL(record, filename, {
      thumb: '200x200'
    });
    
    // Full image URL
    const fullUrl = pb.files.getURL(record, filename);
    
    const img = document.createElement('img');
    img.src = thumbUrl;
    img.addEventListener('click', () => {
      // Show full image in lightbox
      showLightbox(fullUrl);
    });
    
    gallery.appendChild(img);
  });
}
```

### Example 2: File Download Handler

```javascript
async function downloadFile(recordId, filename) {
  const record = await pb.collection('documents').getOne(recordId);
  
  // Get download URL
  const downloadUrl = pb.files.getURL(record, filename, {
    download: true
  });
  
  // Trigger download
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

### Example 3: Protected File Viewer

```javascript
async function viewProtectedFile(recordId) {
  // Authenticate
  if (!pb.authStore.isValid) {
    await pb.collection('users').authWithPassword('user@example.com', 'password');
  }
  
  // Get record
  const record = await pb.collection('private_docs').getOne(recordId);
  
  // Get token
  let token;
  try {
    token = await pb.files.getToken();
  } catch (error) {
    console.error('Failed to get file token:', error);
    return;
  }
  
  // Get file URL
  const fileUrl = pb.files.getURL(record, record.file, {
    token: token
  });
  
  // Display based on file type
  const ext = record.file.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    // Display image
    const img = document.createElement('img');
    img.src = fileUrl;
    document.body.appendChild(img);
  } else if (['pdf'].includes(ext)) {
    // Display PDF
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    document.body.appendChild(iframe);
  } else {
    // Download other files
    downloadFile(recordId, record.file);
  }
}
```

### Example 4: Responsive Image Component (React)

```javascript
import React from 'react';
import { useRecord } from './hooks';

function ResponsiveImage({ recordId, fieldName }) {
  const record = useRecord('posts', recordId);
  
  if (!record || !record[fieldName]) {
    return <div>Loading...</div>;
  }
  
  const baseUrl = pb.files.getURL(record, record[fieldName]);
  const thumbUrl = pb.files.getURL(record, record[fieldName], {
    thumb: '400x400'
  });
  
  return (
    <picture>
      <source 
        media="(max-width: 600px)" 
        srcSet={pb.files.getURL(record, record[fieldName], { thumb: '300x300' })} 
      />
      <source 
        media="(max-width: 1200px)" 
        srcSet={thumbUrl} 
      />
      <img 
        src={baseUrl} 
        alt={record.title}
        loading="lazy"
      />
    </picture>
  );
}
```

### Example 5: Multiple Files with Thumbnails

```javascript
async function displayFileList(recordId) {
  const record = await pb.collection('attachments').getOne(recordId);
  
  const files = Array.isArray(record.files) ? record.files : [];
  
  const container = document.getElementById('file-list');
  
  files.forEach(filename => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    // Check if it's an image
    const ext = filename.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    
    if (isImage) {
      // Show thumbnail
      const thumbUrl = pb.files.getURL(record, filename, {
        thumb: '100x100'
      });
      
      const img = document.createElement('img');
      img.src = thumbUrl;
      img.className = 'file-thumb';
      fileItem.appendChild(img);
    } else {
      // Show file icon
      const icon = document.createElement('i');
      icon.className = 'file-icon';
      fileItem.appendChild(icon);
    }
    
    // File name and download link
    const link = document.createElement('a');
    link.href = pb.files.getURL(record, filename, { download: true });
    link.textContent = filename;
    link.download = filename;
    fileItem.appendChild(link);
    
    container.appendChild(fileItem);
  });
}
```

### Example 6: Image Upload Preview with Thumbnail

```javascript
function previewUploadedImage(record, filename) {
  // Get thumbnail for preview
  const previewUrl = pb.files.getURL(record, filename, {
    thumb: '200x200f'  // Fit to 200x200 without cropping
  });
  
  // Create preview element
  const preview = document.createElement('div');
  preview.className = 'upload-preview';
  
  const img = document.createElement('img');
  img.src = previewUrl;
  img.alt = 'Preview';
  
  const fullUrl = pb.files.getURL(record, filename);
  img.addEventListener('click', () => {
    window.open(fullUrl, '_blank');
  });
  
  preview.appendChild(img);
  document.getElementById('previews').appendChild(preview);
}
```

## Error Handling

```javascript
try {
  const fileUrl = pb.files.getURL(record, record.image);
  
  // Verify URL is valid
  if (!fileUrl) {
    throw new Error('Invalid file URL');
  }
  
  // Load image
  const img = new Image();
  img.onerror = () => {
    console.error('Failed to load image');
  };
  img.onload = () => {
    console.log('Image loaded successfully');
  };
  img.src = fileUrl;
  
} catch (error) {
  console.error('File access error:', error);
}
```

### Protected File Token Error Handling

```javascript
async function getProtectedFileUrl(record, filename) {
  try {
    // Get token
    const token = await pb.files.getToken();
    
    // Get file URL
    return pb.files.getURL(record, filename, { token });
    
  } catch (error) {
    if (error.status === 401) {
      console.error('Not authenticated');
      // Redirect to login
    } else if (error.status === 403) {
      console.error('No permission to access file');
    } else {
      console.error('Failed to get file token:', error);
    }
    return null;
  }
}
```

## Best Practices

1. **Use Thumbnails for Lists**: Use thumbnails when displaying images in lists/grids to reduce bandwidth
2. **Lazy Loading**: Use `loading="lazy"` for images below the fold
3. **Cache Tokens**: Store file tokens and reuse them until they expire
4. **Error Handling**: Always handle file loading errors gracefully
5. **Content-Type**: Let the server handle content-type detection automatically
6. **Range Requests**: The API supports Range requests for efficient video/audio streaming
7. **Caching**: Files are cached with a 30-day cache-control header
8. **Security**: Always use tokens for protected files, never expose them in client-side code

## Thumbnail Size Guidelines

| Use Case | Recommended Size |
|----------|-----------------|
| Profile picture | `100x100` or `150x150` |
| List thumbnails | `200x200` or `300x300` |
| Card images | `400x400` or `500x500` |
| Gallery previews | `300x300f` (fit) or `400x400f` |
| Hero images | Use original or `800x800f` |
| Avatar | `50x50` or `75x75` |

## Limitations

- **Thumbnails**: Only work for image files (PNG, JPG, JPEG, GIF, WEBP)
- **Protected Files**: Require authentication to get tokens
- **Token Expiry**: File tokens expire after a short period (typically minutes)
- **File Size**: Large files may take time to generate thumbnails on first request
- **Thumb Sizes**: Must match sizes defined in field configuration or use default `100x100`

## Related Documentation

- [Files Upload and Handling](./FILES.md) - Uploading and managing files
- [API Records](./API_RECORDS.md) - Working with records
- [Collections](./COLLECTIONS.md) - Collection configuration
