# Realtime API - JavaScript SDK Documentation

## Overview

The Realtime API enables real-time updates for collection records using **Server-Sent Events (SSE)**. It allows you to subscribe to changes in collections or specific records and receive instant notifications when records are created, updated, or deleted.

**Key Features:**
- Real-time notifications for record changes
- Collection-level and record-level subscriptions
- Automatic connection management and reconnection
- Authorization support
- Subscription options (expand, custom headers, query params)
- Event-driven architecture

**Backend Endpoints:**
- `GET /api/realtime` - Establish SSE connection
- `POST /api/realtime` - Set subscriptions

## How It Works

1. **Connection**: The SDK establishes an SSE connection to `/api/realtime`
2. **Client ID**: Server sends `PB_CONNECT` event with a unique `clientId`
3. **Subscriptions**: Client submits subscription topics via POST request
4. **Events**: Server sends events when matching records change
5. **Reconnection**: SDK automatically reconnects on connection loss

## Basic Usage

### Subscribe to Collection Changes

Subscribe to all changes in a collection:

```javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://127.0.0.1:8090');

// Subscribe to all changes in the 'posts' collection
const unsubscribe = await pb.collection('posts').subscribe('*', function (e) {
  console.log('Action:', e.action);  // 'create', 'update', or 'delete'
  console.log('Record:', e.record);  // The record data
});

// Later, unsubscribe
await unsubscribe();
```

### Subscribe to Specific Record

Subscribe to changes for a single record:

```javascript
// Subscribe to changes for a specific post
await pb.collection('posts').subscribe('RECORD_ID', function (e) {
  console.log('Record changed:', e.record);
  console.log('Action:', e.action);
});
```

### Multiple Subscriptions

You can subscribe multiple times to the same or different topics:

```javascript
// Subscribe to multiple records
const unsubscribe1 = await pb.collection('posts').subscribe('RECORD_ID_1', handleChange);
const unsubscribe2 = await pb.collection('posts').subscribe('RECORD_ID_2', handleChange);
const unsubscribe3 = await pb.collection('posts').subscribe('*', handleAllChanges);

function handleChange(e) {
  console.log('Change event:', e);
}

function handleAllChanges(e) {
  console.log('Collection-wide change:', e);
}

// Unsubscribe individually
await unsubscribe1();
await unsubscribe2();
await unsubscribe3();
```

## Event Structure

Each event received contains:

```javascript
{
  action: 'create' | 'update' | 'delete',  // Action type
  record: {                                 // Record data
    id: 'RECORD_ID',
    collectionId: 'COLLECTION_ID',
    collectionName: 'collection_name',
    created: '2023-01-01 00:00:00.000Z',
    updated: '2023-01-01 00:00:00.000Z',
    // ... other fields
  }
}
```

### PB_CONNECT Event

When the connection is established, you receive a `PB_CONNECT` event:

```javascript
await pb.realtime.subscribe('PB_CONNECT', function (e) {
  console.log('Connected! Client ID:', e.clientId);
  // e.clientId - unique client identifier
});
```

## Subscription Topics

### Collection-Level Subscription

Subscribe to all changes in a collection:

```javascript
// Wildcard subscription - all records in collection
await pb.collection('posts').subscribe('*', handler);
```

**Access Control**: Uses the collection's `ListRule` to determine if the subscriber has access to receive events.

### Record-Level Subscription

Subscribe to changes for a specific record:

```javascript
// Specific record subscription
await pb.collection('posts').subscribe('RECORD_ID', handler);
```

**Access Control**: Uses the collection's `ViewRule` to determine if the subscriber has access to receive events.

## Subscription Options

You can pass additional options when subscribing:

```javascript
await pb.collection('posts').subscribe('*', handler, {
  // Query parameters (for API rule filtering)
  query: {
    'filter': 'status = "published"',
    'expand': 'author',
  },
  // Custom headers
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

### Expand Relations

Expand relations in the event data:

```javascript
await pb.collection('posts').subscribe('RECORD_ID', function (e) {
  console.log(e.record.expand.author);  // Author relation expanded
}, {
  query: {
    expand: 'author,categories',
  },
});
```

### Filter with Query Parameters

Use query parameters for API rule filtering:

```javascript
await pb.collection('posts').subscribe('*', handler, {
  query: {
    filter: 'status = "published"',
  },
});
```

## Unsubscribing

### Unsubscribe from Specific Topic

```javascript
// Remove all subscriptions for a specific record
await pb.collection('posts').unsubscribe('RECORD_ID');

// Remove all wildcard subscriptions for the collection
await pb.collection('posts').unsubscribe('*');
```

### Unsubscribe from All

```javascript
// Unsubscribe from all subscriptions in the collection
await pb.collection('posts').unsubscribe();

// Or unsubscribe from everything
await pb.realtime.unsubscribe();
```

### Unsubscribe Using Returned Function

```javascript
const unsubscribe = await pb.collection('posts').subscribe('*', handler);

// Later...
await unsubscribe();  // Removes this specific subscription
```

## Connection Management

### Connection Status

Check if the realtime connection is established:

```javascript
if (pb.realtime.isConnected) {
  console.log('Realtime connected');
} else {
  console.log('Realtime disconnected');
}
```

### Disconnect Handler

Handle disconnection events:

```javascript
pb.realtime.onDisconnect = function (activeSubscriptions) {
  if (activeSubscriptions.length > 0) {
    console.log('Connection lost, but subscriptions remain:', activeSubscriptions);
    // Connection will automatically reconnect
  } else {
    console.log('Intentionally disconnected (no active subscriptions)');
  }
};
```

### Automatic Reconnection

The SDK automatically:
- Reconnects when the connection is lost
- Resubmits all active subscriptions
- Handles network interruptions gracefully
- Closes connection after 5 minutes of inactivity (server-side timeout)

## Authorization

### Authenticated Subscriptions

Subscriptions respect authentication. If you're authenticated, events are filtered based on your permissions:

```javascript
// Authenticate first
await pb.collection('users').authWithPassword('user@example.com', 'password');

// Now subscribe - events will respect your permissions
await pb.collection('posts').subscribe('*', handler);
```

### Authorization Rules

- **Collection-level (`*`)**: Uses `ListRule` to determine access
- **Record-level**: Uses `ViewRule` to determine access
- **Superusers**: Can receive all events (if rules allow)
- **Guests**: Only receive events they have permission to see

### Auth State Changes

When authentication state changes, you may need to resubscribe:

```javascript
// After login/logout, resubscribe to update permissions
await pb.collection('users').authWithPassword('user@example.com', 'password');

// Re-subscribe to update auth state in realtime connection
await pb.collection('posts').subscribe('*', handler);
```

## Advanced Examples

### Example 1: Real-time Chat

```javascript
// Subscribe to messages in a chat room
async function setupChatRoom(roomId) {
  const unsubscribe = await pb.collection('messages').subscribe('*', function (e) {
    // Filter for this room only
    if (e.record.roomId === roomId) {
      if (e.action === 'create') {
        displayMessage(e.record);
      } else if (e.action === 'delete') {
        removeMessage(e.record.id);
      }
    }
  }, {
    query: {
      filter: `roomId = "${roomId}"`,
    },
  });
  
  return unsubscribe;
}

// Usage
const unsubscribeChat = await setupChatRoom('ROOM_ID');

// Cleanup
await unsubscribeChat();
```

### Example 2: Real-time Dashboard

```javascript
// Subscribe to multiple collections
async function setupDashboard() {
  // Posts updates
  await pb.collection('posts').subscribe('*', function (e) {
    if (e.action === 'create') {
      addPostToFeed(e.record);
    } else if (e.action === 'update') {
      updatePostInFeed(e.record);
    }
  }, {
    query: {
      filter: 'status = "published"',
      expand: 'author',
    },
  });

  // Comments updates
  await pb.collection('comments').subscribe('*', function (e) {
    updateCommentsCount(e.record.postId);
  }, {
    query: {
      expand: 'user',
    },
  });
}

setupDashboard();
```

### Example 3: User Activity Tracking

```javascript
// Track changes to a user's own records
async function trackUserActivity(userId) {
  await pb.collection('posts').subscribe('*', function (e) {
    // Only track changes to user's own posts
    if (e.record.author === userId) {
      console.log(`Your post ${e.action}:`, e.record.title);
      
      if (e.action === 'update') {
        showNotification('Post updated');
      }
    }
  }, {
    query: {
      filter: `author = "${userId}"`,
    },
  });
}

await trackUserActivity(pb.authStore.record.id);
```

### Example 4: Real-time Collaboration

```javascript
// Track when a document is being edited
async function trackDocumentEdits(documentId) {
  await pb.collection('documents').subscribe(documentId, function (e) {
    if (e.action === 'update') {
      const lastEditor = e.record.lastEditor;
      const updatedAt = e.record.updated;
      
      // Show who last edited the document
      showEditorIndicator(lastEditor, updatedAt);
    }
  }, {
    query: {
      expand: 'lastEditor',
    },
  });
}
```

### Example 5: Connection Monitoring

```javascript
// Monitor connection state
pb.realtime.onDisconnect = function (activeSubscriptions) {
  if (activeSubscriptions.length > 0) {
    console.warn('Connection lost, attempting to reconnect...');
    showConnectionStatus('Reconnecting...');
  }
};

// Monitor connection establishment
await pb.realtime.subscribe('PB_CONNECT', function (e) {
  console.log('Connected to realtime:', e.clientId);
  showConnectionStatus('Connected');
});
```

### Example 6: Conditional Subscriptions

```javascript
// Subscribe conditionally based on user state
async function setupConditionalSubscriptions() {
  if (pb.authStore.isValid) {
    // Authenticated user - subscribe to private posts
    await pb.collection('posts').subscribe('*', handler, {
      query: {
        filter: '@request.auth.id != ""',
      },
    });
  } else {
    // Guest user - subscribe only to public posts
    await pb.collection('posts').subscribe('*', handler, {
      query: {
        filter: 'public = true',
      },
    });
  }
}
```

### Example 7: Cleanup on Component Unmount (React/Vue)

```javascript
// React example
import { useEffect, useRef } from 'react';

function useRealtimeSubscription(collectionName, topic, handler) {
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    pb.collection(collectionName).subscribe(topic, async (e) => {
      if (mounted) {
        handler(e);
      }
    }).then(unsubscribe => {
      unsubscribeRef.current = unsubscribe;
    });

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, topic]);
}

// Usage
function PostsList() {
  useRealtimeSubscription('posts', '*', (e) => {
    console.log('Post changed:', e);
  });

  return <div>Posts...</div>;
}
```

## Error Handling

```javascript
try {
  await pb.collection('posts').subscribe('*', handler);
} catch (error) {
  if (error.status === 403) {
    console.error('Permission denied');
  } else if (error.status === 404) {
    console.error('Collection not found');
  } else {
    console.error('Subscription error:', error);
  }
}
```

## Best Practices

1. **Unsubscribe When Done**: Always unsubscribe when components unmount or subscriptions are no longer needed
2. **Handle Disconnections**: Implement `onDisconnect` handler for better UX
3. **Filter Server-Side**: Use query parameters to filter events server-side when possible
4. **Limit Subscriptions**: Don't subscribe to more collections than necessary
5. **Use Record-Level When Possible**: Prefer record-level subscriptions over collection-level when you only need specific records
6. **Monitor Connection**: Track connection state for debugging and user feedback
7. **Handle Errors**: Wrap subscriptions in try-catch blocks
8. **Respect Permissions**: Understand that events respect API rules and permissions

## Limitations

- **Maximum Subscriptions**: Up to 1000 subscriptions per client
- **Topic Length**: Maximum 2500 characters per topic
- **Idle Timeout**: Connection closes after 5 minutes of inactivity
- **Network Dependency**: Requires stable network connection
- **Browser Support**: SSE requires modern browsers (not available in IE)

## Troubleshooting

### Connection Not Establishing

```javascript
// Check connection status
console.log('Connected:', pb.realtime.isConnected);

// Manually trigger connection
await pb.collection('posts').subscribe('*', handler);
```

### Events Not Received

1. Check API rules - you may not have permission
2. Verify subscription is active
3. Check network connectivity
4. Review server logs for errors

### Memory Leaks

Always unsubscribe:

```javascript
// Good
const unsubscribe = await pb.collection('posts').subscribe('*', handler);
// ... later
await unsubscribe();

// Bad - no cleanup
await pb.collection('posts').subscribe('*', handler);
// Never unsubscribed - memory leak!
```

## Related Documentation

- [API Records](./API_RECORDS.md) - CRUD operations
- [Collections](./COLLECTIONS.md) - Collection configuration
- [API Rules and Filters](./API_RULES_AND_FILTERS.md) - Understanding API rules
