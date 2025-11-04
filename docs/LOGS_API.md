# Logs API - JavaScript SDK Documentation

## Overview

The Logs API provides endpoints for viewing and analyzing application logs. All operations require superuser authentication and allow you to query request logs, filter by various criteria, and get aggregated statistics.

**Key Features:**
- List and paginate logs
- View individual log entries
- Filter logs by status, URL, method, IP, etc.
- Sort logs by various fields
- Get hourly aggregated statistics
- Filter statistics by criteria

**Backend Endpoints:**
- `GET /api/logs` - List logs
- `GET /api/logs/{id}` - View log
- `GET /api/logs/stats` - Get statistics

**Note**: All Logs API operations require superuser authentication.

## Authentication

All Logs API operations require superuser authentication:

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Authenticate as superuser
await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
```

## List Logs

Returns a paginated list of logs with support for filtering and sorting.

### Basic Usage

```javascript
// Basic list
const result = await pb.logs.getList(1, 30);

console.log(result.page);        // 1
console.log(result.perPage);     // 30
console.log(result.totalItems);  // Total logs count
console.log(result.items);       // Array of log entries
```

### Log Entry Structure

Each log entry contains:

```javascript
{
  id: "ai5z3aoed6809au",
  created: "2024-10-27 09:28:19.524Z",
  level: 0,
  message: "GET /api/collections/posts/records",
  data: {
    auth: "_superusers",
    execTime: 2.392327,
    method: "GET",
    referer: "http://localhost:8090/_/",
    remoteIP: "127.0.0.1",
    status: 200,
    type: "request",
    url: "/api/collections/posts/records?page=1",
    userAgent: "Mozilla/5.0...",
    userIP: "127.0.0.1"
  }
}
```

### Filtering Logs

```javascript
// Filter by HTTP status code
const errorLogs = await pb.logs.getList(1, 50, {
  filter: 'data.status >= 400',
});

// Filter by method
const getLogs = await pb.logs.getList(1, 50, {
  filter: 'data.method = "GET"',
});

// Filter by URL pattern
const apiLogs = await pb.logs.getList(1, 50, {
  filter: 'data.url ~ "/api/"',
});

// Filter by IP address
const ipLogs = await pb.logs.getList(1, 50, {
  filter: 'data.remoteIP = "127.0.0.1"',
});

// Filter by execution time (slow requests)
const slowLogs = await pb.logs.getList(1, 50, {
  filter: 'data.execTime > 1.0',
});

// Filter by log level
const errorLevelLogs = await pb.logs.getList(1, 50, {
  filter: 'level > 0',
});

// Filter by date range
const recentLogs = await pb.logs.getList(1, 50, {
  filter: 'created >= "2024-10-27 00:00:00"',
});
```

### Complex Filters

```javascript
// Multiple conditions
const complexFilter = await pb.logs.getList(1, 50, {
  filter: 'data.status >= 400 && data.method = "POST" && data.execTime > 0.5',
});

// Exclude superuser requests
const userLogs = await pb.logs.getList(1, 50, {
  filter: 'data.auth != "_superusers"',
});

// Specific endpoint errors
const endpointErrors = await pb.logs.getList(1, 50, {
  filter: 'data.url ~ "/api/collections/posts/records" && data.status >= 400',
});

// Errors or slow requests
const problems = await pb.logs.getList(1, 50, {
  filter: 'data.status >= 400 || data.execTime > 2.0',
});
```

### Sorting Logs

```javascript
// Sort by creation date (newest first)
const recent = await pb.logs.getList(1, 50, {
  sort: '-created',
});

// Sort by execution time (slowest first)
const slowest = await pb.logs.getList(1, 50, {
  sort: '-data.execTime',
});

// Sort by status code
const byStatus = await pb.logs.getList(1, 50, {
  sort: 'data.status',
});

// Sort by rowid (most efficient)
const byRowId = await pb.logs.getList(1, 50, {
  sort: '-rowid',
});

// Multiple sort fields
const multiSort = await pb.logs.getList(1, 50, {
  sort: '-created,level',
});
```

### Get Full List

```javascript
// Get all logs (be careful with large datasets)
const allLogs = await pb.logs.getList(1, 1000, {
  filter: 'created >= "2024-10-27 00:00:00"',
  sort: '-created',
});
```

## View Log

Retrieve a single log entry by ID:

```javascript
// Get specific log
const log = await pb.logs.getOne('ai5z3aoed6809au');

console.log(log.message);
console.log(log.data.status);
console.log(log.data.execTime);
```

### Log Details

```javascript
async function analyzeLog(logId) {
  const log = await pb.logs.getOne(logId);
  
  console.log('Log ID:', log.id);
  console.log('Created:', log.created);
  console.log('Level:', log.level);
  console.log('Message:', log.message);
  
  if (log.data.type === 'request') {
    console.log('Method:', log.data.method);
    console.log('URL:', log.data.url);
    console.log('Status:', log.data.status);
    console.log('Execution Time:', log.data.execTime, 'ms');
    console.log('Remote IP:', log.data.remoteIP);
    console.log('User Agent:', log.data.userAgent);
    console.log('Auth Collection:', log.data.auth);
  }
}
```

## Logs Statistics

Get hourly aggregated statistics for logs:

### Basic Usage

```javascript
// Get all statistics
const stats = await pb.logs.getStats();

// Each stat entry contains:
// { total: 4, date: "2022-06-01 19:00:00.000" }
```

### Filtered Statistics

```javascript
// Statistics for errors only
const errorStats = await pb.logs.getStats({
  filter: 'data.status >= 400',
});

// Statistics for specific endpoint
const endpointStats = await pb.logs.getStats({
  filter: 'data.url ~ "/api/collections/posts/records"',
});

// Statistics for slow requests
const slowStats = await pb.logs.getStats({
  filter: 'data.execTime > 1.0',
});

// Statistics excluding superuser requests
const userStats = await pb.logs.getStats({
  filter: 'data.auth != "_superusers"',
});
```

### Visualizing Statistics

```javascript
async function displayLogChart() {
  const stats = await pb.logs.getStats({
    filter: 'created >= "2024-10-27 00:00:00"',
  });
  
  // Use with charting library (e.g., Chart.js)
  const chartData = stats.map(stat => ({
    x: new Date(stat.date),
    y: stat.total,
  }));
  
  // Render chart...
}
```

## Filter Syntax

Logs support filtering with a flexible syntax similar to records filtering.

### Supported Fields

**Direct Fields:**
- `id` - Log ID
- `created` - Creation timestamp
- `updated` - Update timestamp
- `level` - Log level (0 = info, higher = warnings/errors)
- `message` - Log message

**Data Fields (nested):**
- `data.status` - HTTP status code
- `data.method` - HTTP method (GET, POST, etc.)
- `data.url` - Request URL
- `data.execTime` - Execution time in seconds
- `data.remoteIP` - Remote IP address
- `data.userIP` - User IP address
- `data.userAgent` - User agent string
- `data.referer` - Referer header
- `data.auth` - Auth collection ID
- `data.type` - Log type (usually "request")

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equal | `data.status = 200` |
| `!=` | Not equal | `data.status != 200` |
| `>` | Greater than | `data.status > 400` |
| `>=` | Greater than or equal | `data.status >= 400` |
| `<` | Less than | `data.execTime < 0.5` |
| `<=` | Less than or equal | `data.execTime <= 1.0` |
| `~` | Contains/Like | `data.url ~ "/api/"` |
| `!~` | Not contains | `data.url !~ "/admin/"` |
| `?=` | Any equal | `data.method ?= "GET,POST"` |
| `?!=` | Any not equal | `data.method ?!= "DELETE"` |
| `?>` | Any greater | `data.status ?> "400,500"` |
| `?>=` | Any greater or equal | `data.status ?>= "400,500"` |
| `?<` | Any less | `data.execTime ?< "0.5,1.0"` |
| `?<=` | Any less or equal | `data.execTime ?<= "1.0,2.0"` |
| `?~` | Any contains | `data.url ?~ "/api/,/admin/"` |
| `?!~` | Any not contains | `data.url ?!~ "/test/,/debug/"` |

### Logical Operators

- `&&` - AND
- `||` - OR
- `()` - Grouping

### Filter Examples

```javascript
// Simple equality
filter: 'data.method = "GET"'

// Range filter
filter: 'data.status >= 400 && data.status < 500'

// Pattern matching
filter: 'data.url ~ "/api/collections/"'

// Complex logic
filter: '(data.status >= 400 || data.execTime > 2.0) && data.method = "POST"'

// Exclude patterns
filter: 'data.url !~ "/admin/" && data.auth != "_superusers"'

// Date range
filter: 'created >= "2024-10-27 00:00:00" && created <= "2024-10-28 00:00:00"'
```

## Sort Options

Supported sort fields:

- `@random` - Random order
- `rowid` - Row ID (most efficient, use negative for DESC)
- `id` - Log ID
- `created` - Creation date
- `updated` - Update date
- `level` - Log level
- `message` - Message text
- `data.*` - Any data field (e.g., `data.status`, `data.execTime`)

```javascript
// Sort examples
sort: '-created'              // Newest first
sort: 'data.execTime'         // Fastest first
sort: '-data.execTime'        // Slowest first
sort: '-rowid'                // Most efficient (newest)
sort: 'level,-created'        // By level, then newest
```

## Complete Examples

### Example 1: Error Monitoring Dashboard

```javascript
async function getErrorMetrics() {
  // Get error logs from last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateFilter = `created >= "${yesterday.toISOString().split('T')[0]} 00:00:00"`;
  
  // 4xx errors
  const clientErrors = await pb.logs.getList(1, 100, {
    filter: `${dateFilter} && data.status >= 400 && data.status < 500`,
    sort: '-created',
  });
  
  // 5xx errors
  const serverErrors = await pb.logs.getList(1, 100, {
    filter: `${dateFilter} && data.status >= 500`,
    sort: '-created',
  });
  
  // Get hourly statistics
  const errorStats = await pb.logs.getStats({
    filter: `${dateFilter} && data.status >= 400`,
  });
  
  return {
    clientErrors: clientErrors.items,
    serverErrors: serverErrors.items,
    stats: errorStats,
  };
}
```

### Example 2: Performance Analysis

```javascript
async function analyzePerformance() {
  // Get slow requests
  const slowRequests = await pb.logs.getList(1, 50, {
    filter: 'data.execTime > 1.0',
    sort: '-data.execTime',
  });
  
  // Analyze by endpoint
  const endpointStats = {};
  slowRequests.items.forEach(log => {
    const url = log.data.url.split('?')[0]; // Remove query params
    if (!endpointStats[url]) {
      endpointStats[url] = {
        count: 0,
        totalTime: 0,
        maxTime: 0,
      };
    }
    endpointStats[url].count++;
    endpointStats[url].totalTime += log.data.execTime;
    endpointStats[url].maxTime = Math.max(endpointStats[url].maxTime, log.data.execTime);
  });
  
  // Calculate averages
  Object.keys(endpointStats).forEach(url => {
    endpointStats[url].avgTime = endpointStats[url].totalTime / endpointStats[url].count;
  });
  
  return endpointStats;
}
```

### Example 3: Security Monitoring

```javascript
async function monitorSecurity() {
  // Failed authentication attempts
  const authFailures = await pb.logs.getList(1, 100, {
    filter: 'data.url ~ "/api/collections/" && data.url ~ "/auth-with-password" && data.status >= 400',
    sort: '-created',
  });
  
  // Suspicious IPs (multiple failed attempts)
  const ipCounts = {};
  authFailures.items.forEach(log => {
    const ip = log.data.remoteIP;
    ipCounts[ip] = (ipCounts[ip] || 0) + 1;
  });
  
  const suspiciousIPs = Object.entries(ipCounts)
    .filter(([ip, count]) => count >= 5)
    .map(([ip, count]) => ({ ip, attempts: count }));
  
  return {
    totalFailures: authFailures.totalItems,
    suspiciousIPs,
  };
}
```

### Example 4: API Usage Analytics

```javascript
async function getAPIUsage() {
  const stats = await pb.logs.getStats({
    filter: 'data.url ~ "/api/" && data.auth != "_superusers"',
  });
  
  // Group by method
  const methods = {};
  const recentLogs = await pb.logs.getList(1, 1000, {
    filter: 'data.url ~ "/api/" && data.auth != "_superusers"',
  });
  
  recentLogs.items.forEach(log => {
    const method = log.data.method;
    methods[method] = (methods[method] || 0) + 1;
  });
  
  return {
    hourlyStats: stats,
    methodBreakdown: methods,
    totalRequests: recentLogs.totalItems,
  };
}
```

### Example 5: Real-time Error Tracking

```javascript
async function trackErrorsInRealTime() {
  const lastCheck = new Date(Date.now() - 60000); // Last minute
  
  const newErrors = await pb.logs.getList(1, 100, {
    filter: `created >= "${lastCheck.toISOString()}" && data.status >= 400`,
    sort: '-created',
  });
  
  if (newErrors.items.length > 0) {
    console.warn(`Found ${newErrors.items.length} errors in the last minute:`);
    newErrors.items.forEach(log => {
      console.error(`[${log.data.status}] ${log.data.method} ${log.data.url}`);
    });
    
    // Send alerts, notifications, etc.
  }
  
  return newErrors.items;
}
```

### Example 6: Log Viewer Component

```javascript
class LogViewer {
  constructor(pb) {
    this.pb = pb;
    this.currentPage = 1;
    this.perPage = 50;
    this.filter = '';
    this.sort = '-created';
  }
  
  async loadLogs() {
    const options = {
      filter: this.filter,
      sort: this.sort,
    };
    
    return await this.pb.logs.getList(this.currentPage, this.perPage, options);
  }
  
  async searchLogs(searchTerm) {
    this.filter = `message ~ "${searchTerm}" || data.url ~ "${searchTerm}"`;
    this.currentPage = 1;
    return await this.loadLogs();
  }
  
  async filterByStatus(status) {
    this.filter = `data.status = ${status}`;
    this.currentPage = 1;
    return await this.loadLogs();
  }
  
  async getErrorRate() {
    const today = new Date().toISOString().split('T')[0];
    const stats = await this.pb.logs.getStats({
      filter: `created >= "${today} 00:00:00"`,
    });
    
    const errorStats = await this.pb.logs.getStats({
      filter: `created >= "${today} 00:00:00" && data.status >= 400`,
    });
    
    const total = stats.reduce((sum, s) => sum + s.total, 0);
    const errors = errorStats.reduce((sum, s) => sum + s.total, 0);
    
    return {
      total,
      errors,
      rate: total > 0 ? (errors / total) * 100 : 0,
    };
  }
}
```

## Error Handling

```javascript
try {
  const logs = await pb.logs.getList(1, 50, {
    filter: 'data.status >= 400',
  });
} catch (error) {
  if (error.status === 401) {
    console.error('Not authenticated');
  } else if (error.status === 403) {
    console.error('Not a superuser');
  } else if (error.status === 400) {
    console.error('Invalid filter:', error.data);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Use Filters**: Always use filters to narrow down results, especially for large log datasets
2. **Paginate**: Use pagination instead of fetching all logs at once
3. **Efficient Sorting**: Use `-rowid` for default sorting (most efficient)
4. **Filter Statistics**: Always filter statistics for meaningful insights
5. **Monitor Errors**: Regularly check for 4xx/5xx errors
6. **Performance Tracking**: Monitor execution times for slow endpoints
7. **Security Auditing**: Track authentication failures and suspicious activity
8. **Archive Old Logs**: Consider deleting or archiving old logs to maintain performance

## Limitations

- **Superuser Only**: All operations require superuser authentication
- **Data Fields**: Only fields in the `data` object are filterable
- **Statistics**: Statistics are aggregated hourly
- **Performance**: Large log datasets may be slow to query
- **Storage**: Logs accumulate over time and may need periodic cleanup

## Log Levels

- **0**: Info (normal requests)
- **> 0**: Warnings/Errors (non-200 status codes, exceptions, etc.)

Higher values typically indicate more severe issues.

## Related Documentation

- [Authentication](./AUTHENTICATION.md) - User authentication
- [API Records](./API_RECORDS.md) - Record operations
- [Collection API](./COLLECTION_API.md) - Collection management
