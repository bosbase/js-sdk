# Backups API - JavaScript SDK Documentation

## Overview

The Backups API provides endpoints for managing application data backups. You can create backups, upload existing backup files, download backups, delete backups, and restore the application from a backup.

**Key Features:**
- List all available backup files
- Create new backups with custom names or auto-generated names
- Upload existing backup ZIP files
- Download backup files (requires file token)
- Delete backup files
- Restore the application from a backup (restarts the app)

**Backend Endpoints:**
- `GET /api/backups` - List backups
- `POST /api/backups` - Create backup
- `POST /api/backups/upload` - Upload backup
- `GET /api/backups/{key}` - Download backup
- `DELETE /api/backups/{key}` - Delete backup
- `POST /api/backups/{key}/restore` - Restore backup

**Note**: All Backups API operations require superuser authentication (except download which requires a superuser file token).

## Authentication

All Backups API operations require superuser authentication:

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Authenticate as superuser
await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
```

**Downloading backups** requires a superuser file token (obtained via `pb.files.getToken()`), but does not require the Authorization header.

## Backup File Structure

Each backup file contains:
- `key`: The filename/key of the backup file (string)
- `size`: File size in bytes (number)
- `modified`: ISO 8601 timestamp of when the backup was last modified (string)

```javascript
interface BackupFileInfo {
  key: string;
  size: number;
  modified: string;
}
```

## List Backups

Returns a list of all available backup files with their metadata.

### Basic Usage

```javascript
// Get all backups
const backups = await pb.backups.getFullList();

console.log(backups);
// [
//   {
//     key: "pb_backup_20230519162514.zip",
//     modified: "2023-05-19T16:25:57.542Z",
//     size: 251316185
//   },
//   {
//     key: "pb_backup_20230518162514.zip",
//     modified: "2023-05-18T16:25:57.542Z",
//     size: 251314010
//   }
// ]
```

### Working with Backup Lists

```javascript
// Sort backups by modification date (newest first)
const backups = await pb.backups.getFullList();
backups.sort((a, b) => new Date(b.modified) - new Date(a.modified));

// Find the most recent backup
const mostRecent = backups[0];

// Filter backups by size (larger than 100MB)
const largeBackups = backups.filter(backup => backup.size > 100 * 1024 * 1024);

// Get total storage used by backups
const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
console.log(`Total backup storage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
```

## Create Backup

Creates a new backup of the application data. The backup process is asynchronous and may take some time depending on the size of your data.

### Basic Usage

```javascript
// Create backup with custom name
await pb.backups.create('my_backup_2024.zip');

// Create backup with auto-generated name (pass empty string or let backend generate)
await pb.backups.create('');
```

### Backup Name Format

Backup names must follow the format: `[a-z0-9_-].zip`
- Only lowercase letters, numbers, underscores, and hyphens
- Must end with `.zip`
- Maximum length: 150 characters
- Must be unique (no existing backup with the same name)

### Examples

```javascript
// Create a named backup
async function createNamedBackup(name) {
  try {
    await pb.backups.create(name);
    console.log(`Backup "${name}" creation initiated`);
  } catch (error) {
    if (error.status === 400) {
      console.error('Invalid backup name or backup already exists');
    } else {
      console.error('Failed to create backup:', error);
    }
  }
}

// Create backup with timestamp
function createTimestampedBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = `backup_${timestamp}.zip`;
  return pb.backups.create(name);
}
```

### Important Notes

- **Asynchronous Process**: Backup creation happens in the background. The API returns immediately (204 No Content).
- **Concurrent Operations**: Only one backup or restore operation can run at a time. If another operation is in progress, you'll receive a 400 error.
- **Storage**: Backups are stored in the configured backup filesystem (local or S3).
- **S3 Consistency**: For S3 storage, the backup file may not be immediately available after creation due to eventual consistency.

## Upload Backup

Uploads an existing backup ZIP file to the server. This is useful for restoring backups created elsewhere or for importing backups.

### Basic Usage

```javascript
// Upload from a File object
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

if (file) {
  await pb.backups.upload({ file: file });
}

// Upload from a Blob
const blob = new Blob([/* your backup data */], { type: 'application/zip' });
await pb.backups.upload({ file: blob });

// Upload using FormData
const formData = new FormData();
formData.append('file', file);
await pb.backups.upload(formData);
```

### File Requirements

- **MIME Type**: Must be `application/zip`
- **Format**: Must be a valid ZIP archive
- **Name**: Must be unique (no existing backup with the same name)
- **Validation**: The file will be validated before upload

### Examples

```javascript
// Upload backup from file input
async function uploadBackupFromInput() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      await pb.backups.upload({ file: file });
      console.log('Backup uploaded successfully');
    } catch (error) {
      if (error.status === 400) {
        console.error('Invalid file or file already exists');
      } else {
        console.error('Upload failed:', error);
      }
    }
  };
  
  input.click();
}

// Upload backup from fetch (e.g., downloading from another server)
async function uploadBackupFromURL(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  
  // Create a File object with the original filename
  const filename = url.split('/').pop() || 'backup.zip';
  const file = new File([blob], filename, { type: 'application/zip' });
  
  await pb.backups.upload({ file: file });
}
```

## Download Backup

Downloads a backup file. Requires a superuser file token for authentication.

### Basic Usage

```javascript
// Get file token
const token = await pb.files.getToken();

// Build download URL
const url = pb.backups.getDownloadURL(token, 'pb_backup_20230519162514.zip');

// Download the file
const link = document.createElement('a');
link.href = url;
link.download = 'pb_backup_20230519162514.zip';
link.click();

// Or use fetch for more control
const response = await fetch(url);
const blob = await response.blob();
// Process the blob...
```

### Download URL Structure

The download URL format is:
```
/api/backups/{key}?token={fileToken}
```

### Examples

```javascript
// Download backup function
async function downloadBackup(backupKey) {
  try {
    // Get file token (valid for short period)
    const token = await pb.files.getToken();
    
    // Build download URL
    const url = pb.backups.getDownloadURL(token, backupKey);
    
    // Trigger download
    window.open(url, '_blank');
    
    // Or download programmatically
    const a = document.createElement('a');
    a.href = url;
    a.download = backupKey;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('Failed to download backup:', error);
  }
}

// Download and save backup with custom name
async function downloadBackupAs(backupKey, saveAs) {
  const token = await pb.files.getToken();
  const url = pb.backups.getDownloadURL(token, backupKey);
  
  const response = await fetch(url);
  const blob = await response.blob();
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = saveAs;
  link.click();
  
  URL.revokeObjectURL(link.href);
}
```

## Delete Backup

Deletes a backup file from the server.

### Basic Usage

```javascript
await pb.backups.delete('pb_backup_20230519162514.zip');
```

### Important Notes

- **Active Backups**: Cannot delete a backup that is currently being created or restored
- **No Undo**: Deletion is permanent
- **File System**: The file will be removed from the backup filesystem

### Examples

```javascript
// Delete backup with confirmation
async function deleteBackupWithConfirmation(backupKey) {
  if (confirm(`Are you sure you want to delete ${backupKey}?`)) {
    try {
      await pb.backups.delete(backupKey);
      console.log('Backup deleted successfully');
    } catch (error) {
      if (error.status === 400) {
        console.error('Backup is currently in use and cannot be deleted');
      } else if (error.status === 404) {
        console.error('Backup not found');
      } else {
        console.error('Failed to delete backup:', error);
      }
    }
  }
}

// Delete old backups (older than 30 days)
async function deleteOldBackups() {
  const backups = await pb.backups.getFullList();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const oldBackups = backups.filter(backup => {
    const modified = new Date(backup.modified);
    return modified < thirtyDaysAgo;
  });
  
  for (const backup of oldBackups) {
    try {
      await pb.backups.delete(backup.key);
      console.log(`Deleted old backup: ${backup.key}`);
    } catch (error) {
      console.error(`Failed to delete ${backup.key}:`, error);
    }
  }
}
```

## Restore Backup

Restores the application from a backup file. **This operation will restart the application**.

### Basic Usage

```javascript
await pb.backups.restore('pb_backup_20230519162514.zip');
```

### Important Warnings

⚠️ **CRITICAL**: Restoring a backup will:
1. Replace all current application data with data from the backup
2. **Restart the application process**
3. Any unsaved changes will be lost
4. The application will be unavailable during the restore process

### Prerequisites

- **Disk Space**: Recommended to have at least **2x the backup size** in free disk space
- **UNIX Systems**: Restore is primarily supported on UNIX-based systems (Linux, macOS)
- **No Concurrent Operations**: Cannot restore if another backup or restore is in progress
- **Backup Existence**: The backup file must exist on the server

### Restore Process

The restore process performs the following steps:
1. Downloads the backup file to a temporary location
2. Extracts the backup to a temporary directory
3. Moves current `pb_data` content to a temporary location (to be deleted on next app start)
4. Moves extracted backup content to `pb_data`
5. Restarts the application

### Examples

```javascript
// Restore backup with confirmation
async function restoreBackupWithConfirmation(backupKey) {
  const confirmed = confirm(
    `⚠️ WARNING: This will replace all current data with data from ${backupKey} and restart the application.\n\n` +
    `Are you absolutely sure you want to continue?`
  );
  
  if (!confirmed) return;
  
  try {
    await pb.backups.restore(backupKey);
    console.log('Restore initiated. Application will restart...');
    
    // Optionally wait and reload the page
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    if (error.status === 400) {
      if (error.message.includes('another backup/restore')) {
        console.error('Another backup or restore operation is in progress');
      } else {
        console.error('Invalid or missing backup file');
      }
    } else {
      console.error('Failed to restore backup:', error);
    }
  }
}
```

## Complete Examples

### Example 1: Backup Manager Class

```javascript
class BackupManager {
  constructor(pb) {
    this.pb = pb;
  }

  async list() {
    const backups = await this.pb.backups.getFullList();
    return backups.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  async create(name = null) {
    if (!name) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      name = `backup_${timestamp}.zip`;
    }
    await this.pb.backups.create(name);
    return name;
  }

  async download(key) {
    const token = await this.pb.files.getToken();
    return this.pb.backups.getDownloadURL(token, key);
  }

  async delete(key) {
    await this.pb.backups.delete(key);
  }

  async restore(key, confirmMessage = null) {
    if (confirmMessage && !confirm(confirmMessage)) {
      return false;
    }
    await this.pb.backups.restore(key);
    return true;
  }

  async cleanup(daysOld = 30) {
    const backups = await this.list();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    
    const toDelete = backups.filter(b => new Date(b.modified) < cutoff);
    
    for (const backup of toDelete) {
      try {
        await this.delete(backup.key);
        console.log(`Deleted: ${backup.key}`);
      } catch (error) {
        console.error(`Failed to delete ${backup.key}:`, error);
      }
    }
    
    return toDelete.length;
  }
}

// Usage
const manager = new BackupManager(pb);
const backups = await manager.list();
await manager.create('weekly_backup.zip');
```

### Example 2: Automated Backup Strategy

```javascript
class AutomatedBackup {
  constructor(pb, strategy = 'daily') {
    this.pb = pb;
    this.strategy = strategy; // 'daily', 'weekly', 'monthly'
    this.maxBackups = 7; // Keep last 7 backups
  }

  async createScheduledBackup() {
    try {
      const name = this.generateBackupName();
      await this.pb.backups.create(name);
      console.log(`Created backup: ${name}`);
      
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Backup creation failed:', error);
    }
  }

  generateBackupName() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (this.strategy === 'daily') {
      return `daily_${dateStr}.zip`;
    } else if (this.strategy === 'weekly') {
      const week = Math.ceil(now.getDate() / 7);
      return `weekly_${now.getFullYear()}_W${week}.zip`;
    } else {
      return `monthly_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}.zip`;
    }
  }

  async cleanupOldBackups() {
    const backups = await this.pb.backups.getFullList();
    const sorted = backups.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    
    if (sorted.length > this.maxBackups) {
      const toDelete = sorted.slice(this.maxBackups);
      for (const backup of toDelete) {
        try {
          await this.pb.backups.delete(backup.key);
          console.log(`Cleaned up old backup: ${backup.key}`);
        } catch (error) {
          console.error(`Failed to delete ${backup.key}:`, error);
        }
      }
    }
  }
}

// Setup daily automated backups
const autoBackup = new AutomatedBackup(pb, 'daily');

// Run backup (could be called from a cron job or scheduler)
setInterval(() => {
  autoBackup.createScheduledBackup();
}, 24 * 60 * 60 * 1000); // Every 24 hours
```

### Example 3: Backup Migration Tool

```javascript
class BackupMigrator {
  constructor(sourcePb, targetPb) {
    this.sourcePb = sourcePb;
    this.targetPb = targetPb;
  }

  async migrateBackup(backupKey) {
    console.log(`Migrating backup: ${backupKey}`);
    
    // Step 1: Download from source
    console.log('Downloading from source...');
    const sourceToken = await this.sourcePb.files.getToken();
    const downloadUrl = this.sourcePb.backups.getDownloadURL(sourceToken, backupKey);
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    
    // Step 2: Create file object
    const file = new File([blob], backupKey, { type: 'application/zip' });
    
    // Step 3: Upload to target
    console.log('Uploading to target...');
    await this.targetPb.backups.upload({ file: file });
    
    console.log('Migration completed');
  }

  async migrateAllBackups() {
    const backups = await this.sourcePb.backups.getFullList();
    
    for (const backup of backups) {
      try {
        await this.migrateBackup(backup.key);
        console.log(`✓ Migrated: ${backup.key}`);
      } catch (error) {
        console.error(`✗ Failed to migrate ${backup.key}:`, error);
      }
    }
  }
}

// Usage
const migrator = new BackupMigrator(sourcePb, targetPb);
await migrator.migrateAllBackups();
```

### Example 4: Backup Health Check

```javascript
async function checkBackupHealth() {
  const backups = await pb.backups.getFullList();
  
  if (backups.length === 0) {
    console.warn('⚠️ No backups found!');
    return false;
  }
  
  // Check for recent backup (within last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentBackups = backups.filter(b => new Date(b.modified) > sevenDaysAgo);
  
  if (recentBackups.length === 0) {
    console.warn('⚠️ No backups found in the last 7 days');
  } else {
    console.log(`✓ Found ${recentBackups.length} recent backup(s)`);
  }
  
  // Check total storage
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  console.log(`Total backup storage: ${totalSizeMB} MB`);
  
  // Check largest backup
  const largest = backups.reduce((max, b) => b.size > max.size ? b : max, backups[0]);
  console.log(`Largest backup: ${largest.key} (${(largest.size / 1024 / 1024).toFixed(2)} MB)`);
  
  return true;
}
```

## Error Handling

```javascript
// Handle common backup errors
async function handleBackupError(operation, ...args) {
  try {
    await pb.backups[operation](...args);
  } catch (error) {
    switch (error.status) {
      case 400:
        if (error.message.includes('another backup/restore')) {
          console.error('Another backup or restore operation is in progress');
        } else if (error.message.includes('already exists')) {
          console.error('Backup with this name already exists');
        } else {
          console.error('Invalid request:', error.message);
        }
        break;
      
      case 401:
        console.error('Not authenticated');
        break;
      
      case 403:
        console.error('Not a superuser');
        break;
      
      case 404:
        console.error('Backup not found');
        break;
      
      default:
        console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

## Best Practices

1. **Regular Backups**: Create backups regularly (daily, weekly, or based on your needs)
2. **Naming Convention**: Use clear, consistent naming (e.g., `backup_YYYY-MM-DD.zip`)
3. **Backup Rotation**: Implement cleanup to remove old backups and prevent storage issues
4. **Test Restores**: Periodically test restoring backups to ensure they work
5. **Off-site Storage**: Download and store backups in a separate location
6. **Pre-Restore Backup**: Always create a backup before restoring (if possible)
7. **Monitor Storage**: Monitor backup storage usage to prevent disk space issues
8. **Documentation**: Document your backup and restore procedures
9. **Automation**: Use cron jobs or schedulers for automated backups
10. **Verification**: Verify backup integrity after creation/download

## Limitations

- **Superuser Only**: All operations require superuser authentication
- **Concurrent Operations**: Only one backup or restore can run at a time
- **Restore Restart**: Restoring a backup restarts the application
- **UNIX Systems**: Restore primarily works on UNIX-based systems
- **Disk Space**: Restore requires significant free disk space (2x backup size recommended)
- **S3 Consistency**: S3 backups may not be immediately available after creation
- **Active Backups**: Cannot delete backups that are currently being created or restored

## Related Documentation

- [File API](./FILE_API.md) - File handling and tokens
- [Crons API](./CRONS_API.md) - Automated backup scheduling
- [Collection API](./COLLECTION_API.md) - Collection management
