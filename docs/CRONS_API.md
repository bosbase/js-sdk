# Crons API - JavaScript SDK Documentation

## Overview

The Crons API provides endpoints for viewing and manually triggering scheduled cron jobs. All operations require superuser authentication and allow you to list registered cron jobs and execute them on-demand.

**Key Features:**
- List all registered cron jobs
- View cron job schedules (cron expressions)
- Manually trigger cron jobs
- Built-in system jobs for maintenance tasks

**Backend Endpoints:**
- `GET /api/crons` - List cron jobs
- `POST /api/crons/{jobId}` - Run cron job

**Note**: All Crons API operations require superuser authentication.

## Authentication

All Crons API operations require superuser authentication:

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Authenticate as superuser
await pb.collection('_superusers').authWithPassword('admin@example.com', 'password');
```

## List Cron Jobs

Returns a list of all registered cron jobs with their IDs and schedule expressions.

### Basic Usage

```javascript
// Get all cron jobs
const jobs = await pb.crons.getFullList();

console.log(jobs);
// [
//   { id: "__pbLogsCleanup__", expression: "0 */6 * * *" },
//   { id: "__pbDBOptimize__", expression: "0 0 * * *" },
//   { id: "__pbMFACleanup__", expression: "0 * * * *" },
//   { id: "__pbOTPCleanup__", expression: "0 * * * *" }
// ]
```

### Cron Job Structure

Each cron job contains:

```javascript
{
  id: string,        // Unique identifier for the job
  expression: string // Cron expression defining the schedule
}
```

### Built-in System Jobs

The following cron jobs are typically registered by default:

| Job ID | Expression | Description | Schedule |
|--------|-----------|-------------|----------|
| `__pbLogsCleanup__` | `0 */6 * * *` | Cleans up old log entries | Every 6 hours |
| `__pbDBOptimize__` | `0 0 * * *` | Optimizes database | Daily at midnight |
| `__pbMFACleanup__` | `0 * * * *` | Cleans up expired MFA records | Every hour |
| `__pbOTPCleanup__` | `0 * * * *` | Cleans up expired OTP codes | Every hour |

### Working with Cron Jobs

```javascript
// List all cron jobs
const jobs = await pb.crons.getFullList();

// Find a specific job
const logsCleanup = jobs.find(job => job.id === '__pbLogsCleanup__');

if (logsCleanup) {
  console.log(`Logs cleanup runs: ${logsCleanup.expression}`);
}

// Filter system jobs
const systemJobs = jobs.filter(job => job.id.startsWith('__pb'));

// Filter custom jobs
const customJobs = jobs.filter(job => !job.id.startsWith('__pb'));
```

## Run Cron Job

Manually trigger a cron job to execute immediately.

### Basic Usage

```javascript
// Run a specific cron job
await pb.crons.run('__pbLogsCleanup__');
```

### Use Cases

```javascript
// Trigger logs cleanup manually
async function cleanupLogsNow() {
  await pb.crons.run('__pbLogsCleanup__');
  console.log('Logs cleanup triggered');
}

// Trigger database optimization
async function optimizeDatabase() {
  await pb.crons.run('__pbDBOptimize__');
  console.log('Database optimization triggered');
}

// Trigger MFA cleanup
async function cleanupMFA() {
  await pb.crons.run('__pbMFACleanup__');
  console.log('MFA cleanup triggered');
}

// Trigger OTP cleanup
async function cleanupOTP() {
  await pb.crons.run('__pbOTPCleanup__');
  console.log('OTP cleanup triggered');
}
```

## Cron Expression Format

Cron expressions use the standard 5-field format:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 or 7 is Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Patterns

| Expression | Description |
|------------|-------------|
| `0 * * * *` | Every hour at minute 0 |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * *` | Daily at midnight |
| `0 0 * * 0` | Weekly on Sunday at midnight |
| `0 0 1 * *` | Monthly on the 1st at midnight |
| `*/30 * * * *` | Every 30 minutes |
| `0 9 * * 1-5` | Weekdays at 9 AM |

### Supported Macros

| Macro | Equivalent Expression | Description |
|-------|----------------------|-------------|
| `@yearly` or `@annually` | `0 0 1 1 *` | Once a year |
| `@monthly` | `0 0 1 * *` | Once a month |
| `@weekly` | `0 0 * * 0` | Once a week |
| `@daily` or `@midnight` | `0 0 * * *` | Once a day |
| `@hourly` | `0 * * * *` | Once an hour |

### Expression Examples

```javascript
// Every hour
"0 * * * *"

// Every 6 hours
"0 */6 * * *"

// Daily at midnight
"0 0 * * *"

// Every 30 minutes
"*/30 * * * *"

// Weekdays at 9 AM
"0 9 * * 1-5"

// First day of every month
"0 0 1 * *"

// Using macros
"@daily"   // Same as "0 0 * * *"
"@hourly"  // Same as "0 * * * *"
```

## Complete Examples

### Example 1: Cron Job Monitor

```javascript
class CronMonitor {
  constructor(pb) {
    this.pb = pb;
  }

  async listAllJobs() {
    const jobs = await this.pb.crons.getFullList();
    
    console.log(`Found ${jobs.length} cron jobs:`);
    jobs.forEach(job => {
      console.log(`  - ${job.id}: ${job.expression}`);
    });
    
    return jobs;
  }

  async runJob(jobId) {
    try {
      await this.pb.crons.run(jobId);
      console.log(`Successfully triggered: ${jobId}`);
      return true;
    } catch (error) {
      console.error(`Failed to run ${jobId}:`, error);
      return false;
    }
  }

  async runMaintenanceJobs() {
    const maintenanceJobs = [
      '__pbLogsCleanup__',
      '__pbDBOptimize__',
      '__pbMFACleanup__',
      '__pbOTPCleanup__',
    ];

    for (const jobId of maintenanceJobs) {
      console.log(`Running ${jobId}...`);
      await this.runJob(jobId);
      // Wait a bit between jobs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Usage
const monitor = new CronMonitor(pb);
await monitor.listAllJobs();
await monitor.runMaintenanceJobs();
```

### Example 2: Cron Job Health Check

```javascript
async function checkCronJobs() {
  try {
    const jobs = await pb.crons.getFullList();
    
    const expectedJobs = [
      '__pbLogsCleanup__',
      '__pbDBOptimize__',
      '__pbMFACleanup__',
      '__pbOTPCleanup__',
    ];
    
    const missingJobs = expectedJobs.filter(
      expectedId => !jobs.find(job => job.id === expectedId)
    );
    
    if (missingJobs.length > 0) {
      console.warn('Missing expected cron jobs:', missingJobs);
      return false;
    }
    
    console.log('All expected cron jobs are registered');
    return true;
  } catch (error) {
    console.error('Failed to check cron jobs:', error);
    return false;
  }
}
```

### Example 3: Manual Maintenance Script

```javascript
async function performMaintenance() {
  console.log('Starting maintenance tasks...');
  
  // Cleanup old logs
  console.log('1. Cleaning up old logs...');
  await pb.crons.run('__pbLogsCleanup__');
  
  // Cleanup expired MFA records
  console.log('2. Cleaning up expired MFA records...');
  await pb.crons.run('__pbMFACleanup__');
  
  // Cleanup expired OTP codes
  console.log('3. Cleaning up expired OTP codes...');
  await pb.crons.run('__pbOTPCleanup__');
  
  // Optimize database (run last as it may take longer)
  console.log('4. Optimizing database...');
  await pb.crons.run('__pbDBOptimize__');
  
  console.log('Maintenance tasks completed');
}
```

### Example 4: Cron Job Status Dashboard

```javascript
async function getCronStatus() {
  const jobs = await pb.crons.getFullList();
  
  const status = {
    total: jobs.length,
    system: jobs.filter(job => job.id.startsWith('__pb')).length,
    custom: jobs.filter(job => !job.id.startsWith('__pb')).length,
    jobs: jobs.map(job => ({
      id: job.id,
      expression: job.expression,
      type: job.id.startsWith('__pb') ? 'system' : 'custom',
    })),
  };
  
  return status;
}

// Usage
const status = await getCronStatus();
console.log(`Total: ${status.total}, System: ${status.system}, Custom: ${status.custom}`);
```

### Example 5: Scheduled Maintenance Trigger

```javascript
// Function to trigger maintenance jobs on a schedule
class ScheduledMaintenance {
  constructor(pb, intervalMinutes = 60) {
    this.pb = pb;
    this.intervalMinutes = intervalMinutes;
    this.intervalId = null;
  }

  start() {
    // Run immediately
    this.runMaintenance();
    
    // Then run on schedule
    this.intervalId = setInterval(() => {
      this.runMaintenance();
    }, this.intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runMaintenance() {
    try {
      console.log('Running scheduled maintenance...');
      
      // Run cleanup jobs
      await pb.crons.run('__pbLogsCleanup__');
      await pb.crons.run('__pbMFACleanup__');
      await pb.crons.run('__pbOTPCleanup__');
      
      console.log('Scheduled maintenance completed');
    } catch (error) {
      console.error('Maintenance failed:', error);
    }
  }
}

// Usage
const maintenance = new ScheduledMaintenance(pb, 60); // Every hour
maintenance.start();
```

### Example 6: Cron Job Testing

```javascript
async function testCronJob(jobId) {
  console.log(`Testing cron job: ${jobId}`);
  
  try {
    // Check if job exists
    const jobs = await pb.crons.getFullList();
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
      console.error(`Cron job ${jobId} not found`);
      return false;
    }
    
    console.log(`Job found with expression: ${job.expression}`);
    
    // Run the job
    console.log('Triggering job...');
    await pb.crons.run(jobId);
    
    console.log('Job triggered successfully');
    return true;
  } catch (error) {
    console.error(`Failed to test cron job:`, error);
    return false;
  }
}

// Test a specific job
await testCronJob('__pbLogsCleanup__');
```

## Error Handling

```javascript
try {
  const jobs = await pb.crons.getFullList();
} catch (error) {
  if (error.status === 401) {
    console.error('Not authenticated');
  } else if (error.status === 403) {
    console.error('Not a superuser');
  } else {
    console.error('Unexpected error:', error);
  }
}

try {
  await pb.crons.run('__pbLogsCleanup__');
} catch (error) {
  if (error.status === 401) {
    console.error('Not authenticated');
  } else if (error.status === 403) {
    console.error('Not a superuser');
  } else if (error.status === 404) {
    console.error('Cron job not found');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Check Job Existence**: Verify a cron job exists before trying to run it
2. **Error Handling**: Always handle errors when running cron jobs
3. **Rate Limiting**: Don't trigger cron jobs too frequently manually
4. **Monitoring**: Regularly check that expected cron jobs are registered
5. **Logging**: Log when cron jobs are manually triggered for auditing
6. **Testing**: Test cron jobs in development before running in production
7. **Documentation**: Document custom cron jobs and their purposes
8. **Scheduling**: Let the cron scheduler handle regular execution; use manual triggers sparingly

## Limitations

- **Superuser Only**: All operations require superuser authentication
- **Read-Only API**: The SDK API only allows listing and running jobs; adding/removing jobs must be done via backend hooks
- **Asynchronous Execution**: Running a cron job triggers it asynchronously; the API returns immediately
- **No Status**: The API doesn't provide execution status or history
- **System Jobs**: Built-in system jobs (prefixed with `__pb`) cannot be removed via the API

## Custom Cron Jobs

Custom cron jobs are typically registered through backend hooks (JavaScript VM plugins). The Crons API only allows you to:

- **View** all registered jobs (both system and custom)
- **Trigger** any registered job manually

To add or remove cron jobs, you need to use the backend hook system:

```javascript
// In a backend hook file (pb_hooks/main.js)
routerOnInit((e) => {
  // Add custom cron job
  cronAdd("myCustomJob", "0 */2 * * *", () => {
    console.log("Custom job runs every 2 hours");
    // Your custom logic here
  });
});
```

## Related Documentation

- [Collection API](./COLLECTION_API.md) - Collection management
- [Logs API](./LOGS_API.md) - Log viewing and analysis
- [Backups API](./BACKUPS_API.md) - Backup management (if available)
