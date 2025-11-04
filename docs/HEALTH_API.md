# Health API - JavaScript SDK Documentation

## Overview

The Health API provides a simple endpoint to check the health status of the server. It returns basic health information and, when authenticated as a superuser, provides additional diagnostic information about the server state.

**Key Features:**
- No authentication required for basic health check
- Superuser authentication provides additional diagnostic data
- Lightweight endpoint for monitoring and health checks
- Supports both GET and HEAD methods

**Backend Endpoints:**
- `GET /api/health` - Check health status
- `HEAD /api/health` - Check health status (HEAD method)

**Note**: The health endpoint is publicly accessible, but superuser authentication provides additional information.

## Authentication

Basic health checks do not require authentication:

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Basic health check (no auth required)
const health = await pb.health.check();
```

For additional diagnostic information, authenticate as a superuser:

```javascript
// Authenticate as superuser for extended health data
await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
const health = await pb.health.check();
```

## Health Check Response Structure

### Basic Response (Guest/Regular User)

```javascript
{
  code: 200,
  message: "API is healthy.",
  data: {}
}
```

### Superuser Response

```javascript
{
  code: 200,
  message: "API is healthy.",
  data: {
    canBackup: boolean,           // Whether backup operations are allowed
    realIP: string,               // Real IP address of the client
    requireS3: boolean,           // Whether S3 storage is required
    possibleProxyHeader: string   // Detected proxy header (if behind reverse proxy)
  }
}
```

## Check Health Status

Returns the health status of the API server.

### Basic Usage

```javascript
// Simple health check
const health = await pb.health.check();

console.log(health.message); // "API is healthy."
console.log(health.code);    // 200
```

### With Superuser Authentication

```javascript
// Authenticate as superuser first
await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');

// Get extended health information
const health = await pb.health.check();

console.log(health.data.canBackup);           // true/false
console.log(health.data.realIP);              // "192.168.1.100"
console.log(health.data.requireS3);           // false
console.log(health.data.possibleProxyHeader); // "" or header name
```

## Response Fields

### Common Fields (All Users)

| Field | Type | Description |
|-------|------|-------------|
| `code` | number | HTTP status code (always 200 for healthy server) |
| `message` | string | Health status message ("API is healthy.") |
| `data` | object | Health data (empty for non-superusers, populated for superusers) |

### Superuser-Only Fields (in `data`)

| Field | Type | Description |
|-------|------|-------------|
| `canBackup` | boolean | `true` if backup/restore operations can be performed, `false` if a backup/restore is currently in progress |
| `realIP` | string | The real IP address of the client (useful when behind proxies) |
| `requireS3` | boolean | `true` if S3 storage is required (local fallback disabled), `false` otherwise |
| `possibleProxyHeader` | string | Detected proxy header name (e.g., "X-Forwarded-For", "CF-Connecting-IP") if the server appears to be behind a reverse proxy, empty string otherwise |

## Use Cases

### 1. Basic Health Monitoring

```javascript
async function checkServerHealth() {
  try {
    const health = await pb.health.check();
    
    if (health.code === 200 && health.message === "API is healthy.") {
      console.log('✓ Server is healthy');
      return true;
    } else {
      console.log('✗ Server health check failed');
      return false;
    }
  } catch (error) {
    console.error('✗ Health check error:', error);
    return false;
  }
}

// Use in monitoring
setInterval(async () => {
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    // Alert or take action
    console.warn('Server health check failed!');
  }
}, 60000); // Check every minute
```

### 2. Backup Readiness Check

```javascript
async function canPerformBackup() {
  try {
    // Authenticate as superuser
    await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
    
    const health = await pb.health.check();
    
    if (health.data?.canBackup === false) {
      console.log('⚠️ Backup operation is currently in progress');
      return false;
    }
    
    console.log('✓ Backup operations are allowed');
    return true;
  } catch (error) {
    console.error('Failed to check backup readiness:', error);
    return false;
  }
}

// Use before creating backups
if (await canPerformBackup()) {
  await pb.backups.create('backup.zip');
}
```

### 3. Monitoring Dashboard

```javascript
class HealthMonitor {
  constructor(pb) {
    this.pb = pb;
    this.isSuperuser = false;
  }

  async authenticateAsSuperuser(email, password) {
    try {
      await this.pb.collection('_superusers').authWithPassword(email, password);
      this.isSuperuser = true;
      return true;
    } catch (error) {
      console.error('Superuser authentication failed:', error);
      return false;
    }
  }

  async getHealthStatus() {
    try {
      const health = await this.pb.health.check();
      
      const status = {
        healthy: health.code === 200,
        message: health.message,
        timestamp: new Date().toISOString(),
      };
      
      if (this.isSuperuser && health.data) {
        status.diagnostics = {
          canBackup: health.data.canBackup ?? null,
          realIP: health.data.realIP ?? null,
          requireS3: health.data.requireS3 ?? null,
          behindProxy: health.data.possibleProxyHeader ? true : false,
          proxyHeader: health.data.possibleProxyHeader || null,
        };
      }
      
      return status;
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async startMonitoring(intervalMs = 60000) {
    this.intervalId = setInterval(async () => {
      const status = await this.getHealthStatus();
      console.log('Health Status:', status);
      
      if (!status.healthy) {
        // Trigger alerts or actions
        this.onHealthIssue(status);
      }
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onHealthIssue(status) {
    console.error('Health issue detected:', status);
    // Implement alerting logic here
  }
}

// Usage
const monitor = new HealthMonitor(pb);
await monitor.authenticateAsSuperuser('admin@example.com', 'password');
await monitor.startMonitoring(30000); // Check every 30 seconds
```

### 4. Load Balancer Health Check

```javascript
// Simple health check for load balancers
async function simpleHealthCheck() {
  try {
    const health = await pb.health.check();
    return health.code === 200;
  } catch (error) {
    return false;
  }
}

// Use in Express.js route for load balancer
app.get('/health', async (req, res) => {
  const isHealthy = await simpleHealthCheck();
  if (isHealthy) {
    res.status(200).json({ status: 'healthy' });
  } else {
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

### 5. Proxy Detection

```javascript
async function checkProxySetup() {
  await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
  
  const health = await pb.health.check();
  const proxyHeader = health.data?.possibleProxyHeader;
  
  if (proxyHeader) {
    console.log(`⚠️ Server appears to be behind a reverse proxy`);
    console.log(`   Detected proxy header: ${proxyHeader}`);
    console.log(`   Real IP: ${health.data.realIP}`);
    
    // Provide guidance on trusted proxy configuration
    console.log(`   Ensure TrustedProxy settings are configured correctly in admin panel`);
  } else {
    console.log('✓ No reverse proxy detected (or properly configured)');
  }
  
  return {
    behindProxy: !!proxyHeader,
    proxyHeader: proxyHeader || null,
    realIP: health.data?.realIP || null,
  };
}
```

### 6. Pre-Flight Checks

```javascript
async function preFlightCheck() {
  const checks = {
    serverHealthy: false,
    canBackup: false,
    storageConfigured: false,
    issues: [],
  };
  
  try {
    // Basic health check
    const health = await pb.health.check();
    checks.serverHealthy = health.code === 200;
    
    if (!checks.serverHealthy) {
      checks.issues.push('Server health check failed');
      return checks;
    }
    
    // Authenticate as superuser for extended checks
    try {
      await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
      
      const detailedHealth = await pb.health.check();
      
      checks.canBackup = detailedHealth.data?.canBackup === true;
      checks.storageConfigured = !detailedHealth.data?.requireS3 || 
                                  detailedHealth.data?.requireS3 === false;
      
      if (!checks.canBackup) {
        checks.issues.push('Backup operations are currently unavailable');
      }
      
      if (detailedHealth.data?.requireS3) {
        checks.issues.push('S3 storage is required but may not be configured');
      }
    } catch (authError) {
      checks.issues.push('Superuser authentication failed - limited diagnostics available');
    }
  } catch (error) {
    checks.issues.push(`Health check error: ${error.message}`);
  }
  
  return checks;
}

// Use before critical operations
const checks = await preFlightCheck();
if (checks.issues.length > 0) {
  console.warn('Pre-flight check issues:', checks.issues);
  // Handle issues before proceeding
}
```

### 7. Automated Backup Scheduler

```javascript
class BackupScheduler {
  constructor(pb) {
    this.pb = pb;
  }

  async waitForBackupAvailability(maxWaitMs = 300000) {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds
    
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const health = await this.pb.health.check();
        
        if (health.data?.canBackup === true) {
          return true;
        }
        
        console.log('Backup in progress, waiting...');
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error('Health check failed:', error);
        return false;
      }
    }
    
    console.error('Timeout waiting for backup availability');
    return false;
  }

  async scheduleBackup(backupName) {
    // Wait for backup operations to be available
    const isAvailable = await this.waitForBackupAvailability();
    
    if (!isAvailable) {
      throw new Error('Backup operations are not available');
    }
    
    // Create the backup
    await this.pb.backups.create(backupName);
    console.log(`Backup "${backupName}" created`);
  }
}

// Usage
const scheduler = new BackupScheduler(pb);
await scheduler.scheduleBackup('scheduled_backup.zip');
```

## Error Handling

```javascript
async function safeHealthCheck() {
  try {
    const health = await pb.health.check();
    return {
      success: true,
      data: health,
    };
  } catch (error) {
    // Network errors, server down, etc.
    return {
      success: false,
      error: error.message,
      code: error.status || 0,
    };
  }
}

// Handle different error scenarios
const result = await safeHealthCheck();
if (!result.success) {
  if (result.code === 0) {
    console.error('Network error or server unreachable');
  } else {
    console.error(`Server returned error: ${result.code}`);
  }
}
```

## Best Practices

1. **Monitoring**: Use health checks for regular monitoring (e.g., every 30-60 seconds)
2. **Load Balancers**: Configure load balancers to use the health endpoint for health checks
3. **Pre-flight Checks**: Check `canBackup` before initiating backup operations
4. **Error Handling**: Always handle errors gracefully as the server may be down
5. **Rate Limiting**: Don't poll the health endpoint too frequently (avoid spamming)
6. **Caching**: Consider caching health check results for a few seconds to reduce load
7. **Logging**: Log health check results for troubleshooting and monitoring
8. **Alerting**: Set up alerts for consecutive health check failures
9. **Superuser Auth**: Only authenticate as superuser when you need diagnostic information
10. **Proxy Configuration**: Use `possibleProxyHeader` to detect and configure reverse proxy settings

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Server is healthy |
| Network Error | Server is unreachable or down |

## Limitations

- **No Detailed Metrics**: The health endpoint does not provide detailed performance metrics
- **Basic Status Only**: Returns basic status, not detailed system information
- **Superuser Required**: Extended diagnostics require superuser authentication
- **No Historical Data**: Only returns current status, no historical health data

## Head Method Support

The health endpoint also supports the HEAD method for lightweight checks:

```javascript
// Using HEAD method (if supported by your HTTP client)
const response = await fetch('http://127.0.0.1:8090/api/health', {
  method: 'HEAD',
});

if (response.ok) {
  console.log('Server is healthy');
}
```

## Related Documentation

- [Backups API](./BACKUPS_API.md) - Using `canBackup` to check backup readiness
- [Authentication](./AUTHENTICATION.md) - Superuser authentication
- [Settings API](./SETTINGS_API.md) - Configuring trusted proxy settings
