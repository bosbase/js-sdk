# Authentication - JavaScript SDK Documentation

## Overview

Authentication in BosBase is stateless and token-based. A client is considered authenticated as long as it sends a valid `Authorization: YOUR_AUTH_TOKEN` header with requests.

**Key Points:**
- **No sessions**: BosBase APIs are fully stateless (tokens are not stored in the database)
- **No logout endpoint**: To "logout", simply clear the token from your local state (`pb.authStore.clear()`)
- **Token generation**: Auth tokens are generated through auth collection Web APIs or programmatically
- **Admin users**: `_superusers` collection works like regular auth collections but with full access (API rules are ignored)
- **OAuth2 limitation**: OAuth2 is not supported for `_superusers` collection

## Authentication Methods

BosBase supports multiple authentication methods that can be configured individually for each auth collection:

1. **Password Authentication** - Email/username + password
2. **OTP Authentication** - One-time password via email
3. **OAuth2 Authentication** - Google, GitHub, Microsoft, etc.
4. **Multi-factor Authentication (MFA)** - Requires 2 different auth methods

## Authentication Store

The SDK maintains an `authStore` that automatically manages the authentication state:

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://localhost:8090');

// Check authentication status
console.log(pb.authStore.isValid);      // true/false
console.log(pb.authStore.token);        // current auth token
console.log(pb.authStore.record);       // authenticated user record
console.log(pb.authStore.model);        // same as record (legacy)

// Clear authentication (logout)
pb.authStore.clear();
\`\`\`

## Password Authentication

Authenticate using email/username and password. The identity field can be configured in the collection options (default is email).

**Backend Endpoint:** \`POST /api/collections/{collection}/auth-with-password\`

### Basic Usage

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://localhost:8090');

// Authenticate with email and password
const authData = await pb.collection('users').authWithPassword(
  'test@example.com',
  'password123'
);

// Auth data is automatically stored in pb.authStore
console.log(pb.authStore.isValid);  // true
console.log(pb.authStore.token);    // JWT token
console.log(pb.authStore.record.id); // user record ID
\`\`\`

### Response Format

\`\`\`javascript
{
  token: "eyJhbGciOiJIUzI1NiJ9...",
  record: {
    id: "record_id",
    email: "test@example.com",
    // ... other user fields
  }
}
\`\`\`

### Error Handling with MFA

\`\`\`javascript
try {
  await pb.collection('users').authWithPassword('test@example.com', 'pass123');
} catch (err) {
  // Check for MFA requirement
  if (err.response?.mfaId) {
    const mfaId = err.response.mfaId;
    // Handle MFA flow (see Multi-factor Authentication section)
  } else {
    console.error('Authentication failed:', err);
  }
}
\`\`\`

## OTP Authentication

One-time password authentication via email.

**Backend Endpoints:**
- \`POST /api/collections/{collection}/request-otp\` - Request OTP
- \`POST /api/collections/{collection}/auth-with-otp\` - Authenticate with OTP

### Request OTP

\`\`\`javascript
// Send OTP to user's email
const result = await pb.collection('users').requestOTP('test@example.com');
console.log(result.otpId);  // OTP ID to use in authWithOTP
\`\`\`

### Authenticate with OTP

\`\`\`javascript
// Step 1: Request OTP
const result = await pb.collection('users').requestOTP('test@example.com');

// Step 2: User enters OTP from email
const authData = await pb.collection('users').authWithOTP(
  result.otpId,
  '123456'  // OTP code from email
);
\`\`\`

## OAuth2 Authentication

**Backend Endpoint:** \`POST /api/collections/{collection}/auth-with-oauth2\`

### All-in-One Method (Recommended)

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('https://bosbase.io');

// Opens popup window with OAuth2 provider page
const authData = await pb.collection('users').authWithOAuth2({
  provider: 'google'
});

console.log(pb.authStore.token);
console.log(pb.authStore.record);
\`\`\`

### Manual Code Exchange

\`\`\`javascript
// Get auth methods
const authMethods = await pb.collection('users').listAuthMethods();
const provider = authMethods.oauth2.providers.find(p => p.name === 'google');

// Exchange code for token (after OAuth2 redirect)
const authData = await pb.collection('users').authWithOAuth2Code(
  provider.name,
  code,
  provider.codeVerifier,
  redirectUrl
);
\`\`\`

## Multi-Factor Authentication (MFA)

Requires 2 different auth methods.

\`\`\`javascript
let mfaId;

try {
  // First auth method (password)
  await pb.collection('users').authWithPassword('test@example.com', 'pass123');
} catch (err) {
  if (err.response?.mfaId) {
    mfaId = err.response.mfaId;
    
    // Second auth method (OTP)
    const otpResult = await pb.collection('users').requestOTP('test@example.com');
    await pb.collection('users').authWithOTP(
      otpResult.otpId,
      '123456',
      { mfaId: mfaId }
    );
  }
}
\`\`\`

## User Impersonation

Superusers can impersonate other users.

**Backend Endpoint:** \`POST /api/collections/{collection}/impersonate/{id}\`

\`\`\`javascript
// Authenticate as superuser
await pb.admins.authWithPassword('admin@example.com', 'adminpass');

// Impersonate a user
const impersonateClient = await pb.collection('users').impersonate(
  'USER_RECORD_ID',
  3600  // Optional: token duration in seconds
);

// Use impersonate client
const data = await impersonateClient.collection('posts').getFullList();
\`\`\`

## Auth Token Verification

Verify token by calling \`authRefresh()\`.

**Backend Endpoint:** \`POST /api/collections/{collection}/auth-refresh\`

\`\`\`javascript
try {
  const authData = await pb.collection('users').authRefresh();
  console.log('Token is valid');
} catch (err) {
  console.error('Token verification failed:', err);
  pb.authStore.clear();
}
\`\`\`

## List Available Auth Methods

**Backend Endpoint:** \`GET /api/collections/{collection}/auth-methods\`

\`\`\`javascript
const authMethods = await pb.collection('users').listAuthMethods();
console.log(authMethods.password.enabled);
console.log(authMethods.oauth2.providers);
console.log(authMethods.mfa.enabled);
\`\`\`

## Complete Examples

See the full documentation for detailed examples of:
- Full authentication flow
- OAuth2 integration
- Token management
- Admin impersonation
- Error handling

## Related Documentation

- [Collections](./COLLECTIONS.md)
- [API Rules](./API_RULES_AND_FILTERS.md)

## Detailed Examples

### Example 1: Complete Authentication Flow with Error Handling

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://localhost:8090');

async function authenticateUser(email, password) {
  try {
    // Try password authentication
    const authData = await pb.collection('users').authWithPassword(email, password);
    
    console.log('Successfully authenticated:', authData.record.email);
    return authData;
    
  } catch (err) {
    // Check if MFA is required
    if (err.status === 401 && err.response?.mfaId) {
      console.log('MFA required, proceeding with second factor...');
      return await handleMFA(email, err.response.mfaId);
    }
    
    // Handle other errors
    if (err.status === 400) {
      throw new Error('Invalid credentials');
    } else if (err.status === 403) {
      throw new Error('Password authentication is not enabled for this collection');
    } else {
      throw err;
    }
  }
}

async function handleMFA(email, mfaId) {
  // Request OTP for second factor
  const otpResult = await pb.collection('users').requestOTP(email);
  
  // In a real app, show a modal/form for the user to enter OTP
  // For this example, we'll simulate getting the OTP
  const userEnteredOTP = await getUserOTPInput(); // Your UI function
  
  try {
    // Authenticate with OTP and MFA ID
    const authData = await pb.collection('users').authWithOTP(
      otpResult.otpId,
      userEnteredOTP,
      { mfaId: mfaId }
    );
    
    console.log('MFA authentication successful');
    return authData;
  } catch (err) {
    if (err.status === 429) {
      throw new Error('Too many OTP attempts, please request a new OTP');
    }
    throw new Error('Invalid OTP code');
  }
}

// Usage
authenticateUser('user@example.com', 'password123')
  .then(() => {
    console.log('User is authenticated:', pb.authStore.record);
  })
  .catch(err => {
    console.error('Authentication failed:', err.message);
  });
\`\`\`

### Example 2: OAuth2 Integration with Popup

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('https://your-domain.com');

// Setup OAuth2 login button
document.getElementById('google-login').addEventListener('click', async () => {
  try {
    // Check available providers first
    const authMethods = await pb.collection('users').listAuthMethods();
    
    if (!authMethods.oauth2?.enabled) {
      alert('OAuth2 is not enabled for this collection');
      return;
    }
    
    const googleProvider = authMethods.oauth2.providers.find(p => p.name === 'google');
    if (!googleProvider) {
      alert('Google OAuth2 is not configured');
      return;
    }
    
    // Authenticate with Google (opens popup)
    const authData = await pb.collection('users').authWithOAuth2({
      provider: 'google'
    });
    
    // Check if this is a new user
    if (authData.meta?.isNew) {
      console.log('Welcome new user!', authData.record);
      // Redirect to onboarding
      window.location.href = '/onboarding';
    } else {
      console.log('Welcome back!', authData.record);
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
    
  } catch (err) {
    if (err.status === 403) {
      alert('OAuth2 authentication is not enabled');
    } else {
      console.error('OAuth2 authentication failed:', err);
      alert('Login failed. Please try again.');
    }
  }
});
\`\`\`

### Example 3: Token Management and Refresh

> **BosBase note:** Calls to \`pb.collection("users").authWithPassword()\` now return static, non-expiring tokens. Environment variables can no longer shorten their lifetime, so the refresh logic below is only required for custom auth collections, impersonation flows, or any token you mint manually.

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://localhost:8090');

// Check if user is already authenticated
function checkAuth() {
  if (pb.authStore.isValid) {
    console.log('User is authenticated:', pb.authStore.record.email);
    
    // Verify token is still valid and refresh if needed
    return pb.collection('users').authRefresh()
      .then(() => {
        console.log('Token refreshed successfully');
        return true;
      })
      .catch(err => {
        console.log('Token expired or invalid, clearing auth');
        pb.authStore.clear();
        return false;
      });
  }
  return Promise.resolve(false);
}

// Auto-refresh token before expiration
async function setupAutoRefresh() {
  if (!pb.authStore.isValid) return;
  
  // Calculate time until token expiration (JWT tokens have exp claim)
  const token = pb.authStore.token;
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiresAt = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  
  // Refresh 5 minutes before expiration
  const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);
  
  setTimeout(async () => {
    try {
      await pb.collection('users').authRefresh();
      console.log('Token auto-refreshed');
      setupAutoRefresh(); // Schedule next refresh
    } catch (err) {
      console.error('Auto-refresh failed:', err);
      pb.authStore.clear();
    }
  }, refreshTime);
}

// Usage
checkAuth().then(isAuthenticated => {
  if (!isAuthenticated) {
    // Redirect to login
    window.location.href = '/login';
  } else {
    setupAutoRefresh();
  }
});
\`\`\`

### Example 4: Admin Impersonation for Support

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('http://localhost:8090');

async function impersonateUserForSupport(userId) {
  // Authenticate as admin
  await pb.admins.authWithPassword('admin@example.com', 'adminpassword');
  
  // Impersonate the user (1 hour token)
  const userClient = await pb.collection('users').impersonate(userId, 3600);
  
  console.log('Impersonating user:', userClient.authStore.record.email);
  
  // Use the impersonated client to test user experience
  const userRecords = await userClient.collection('posts').getFullList();
  console.log('User can see', userRecords.length, 'posts');
  
  // Check what the user sees
  const userView = await userClient.collection('posts').getList(1, 10, {
    filter: 'published = true'
  });
  
  return {
    canAccess: userView.items.length,
    totalPosts: userRecords.length
  };
}

// Usage in support dashboard
impersonateUserForSupport('user_record_id')
  .then(result => {
    console.log('User access check:', result);
  })
  .catch(err => {
    console.error('Impersonation failed:', err);
  });
\`\`\`

### Example 5: API Key Generation for Server-to-Server

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('https://api.example.com');

async function generateAPIKey(adminEmail, adminPassword) {
  // Authenticate as admin
  await pb.admins.authWithPassword(adminEmail, adminPassword);
  
  // Get superuser ID
  const adminRecord = pb.authStore.record;
  
  // Generate impersonation token (1 year duration for long-lived API key)
  const apiClient = await pb.admins.impersonate(adminRecord.id, 31536000);
  
  const apiKey = {
    token: apiClient.authStore.token,
    expiresAt: new Date(Date.now() + 31536000 * 1000).toISOString(),
    generatedAt: new Date().toISOString()
  };
  
  // Store API key securely (e.g., in environment variables, secret manager)
  console.log('API Key generated (store securely):', apiKey.token.substring(0, 20) + '...');
  
  return apiKey;
}

// Usage in server environment
generateAPIKey('admin@example.com', 'securepassword')
  .then(apiKey => {
    // Store in your server configuration
    process.env.BOSBASE_API_KEY = apiKey.token;
  })
  .catch(err => {
    console.error('Failed to generate API key:', err);
  });

// Using the API key in another service
const serviceClient = new BosBase('https://api.example.com');
serviceClient.authStore.save(process.env.BOSBASE_API_KEY, {
  id: 'superuser_id',
  email: 'admin@example.com'
});

// Make authenticated requests
const data = await serviceClient.collection('records').getFullList();
\`\`\`

### Example 6: OAuth2 Manual Flow (Advanced)

\`\`\`javascript
import BosBase from 'bosbase';

const pb = new BosBase('https://your-domain.com');

// Step 1: Get available OAuth2 providers
async function getOAuth2Providers() {
  const authMethods = await pb.collection('users').listAuthMethods();
  return authMethods.oauth2?.providers || [];
}

// Step 2: Initiate OAuth2 flow
async function initiateOAuth2Login(providerName) {
  const providers = await getOAuth2Providers();
  const provider = providers.find(p => p.name === providerName);
  
  if (!provider) {
    throw new Error(`Provider ${providerName} not available`);
  }
  
  // Store provider info for verification
  sessionStorage.setItem('oauth2_provider', JSON.stringify(provider));
  
  // Redirect to provider's auth URL
  const redirectUrl = window.location.origin + '/oauth2-callback';
  window.location.href = provider.authURL + '?redirect_url=' + encodeURIComponent(redirectUrl);
}

// Step 3: Handle OAuth2 callback
async function handleOAuth2Callback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');
  
  if (error) {
    console.error('OAuth2 error:', error);
    return;
  }
  
  if (!code || !state) {
    console.error('Missing OAuth2 parameters');
    return;
  }
  
  // Retrieve stored provider info
  const providerStr = sessionStorage.getItem('oauth2_provider');
  if (!providerStr) {
    console.error('Provider info not found');
    return;
  }
  
  const provider = JSON.parse(providerStr);
  
  // Verify state parameter
  if (provider.state !== state) {
    console.error('State parameter mismatch - possible CSRF attack');
    return;
  }
  
  // Exchange code for token
  const redirectUrl = window.location.origin + '/oauth2-callback';
  
  try {
    const authData = await pb.collection('users').authWithOAuth2Code(
      provider.name,
      code,
      provider.codeVerifier,
      redirectUrl,
      {
        // Optional: additional data for new users
        emailVisibility: false
      }
    );
    
    console.log('OAuth2 authentication successful:', authData.record);
    
    // Clear stored provider info
    sessionStorage.removeItem('oauth2_provider');
    
    // Redirect to app
    window.location.href = '/dashboard';
    
  } catch (err) {
    console.error('OAuth2 code exchange failed:', err);
    alert('Authentication failed. Please try again.');
  }
}

// Usage: Call handleOAuth2Callback() on the callback page
// if (window.location.pathname === '/oauth2-callback') {
//   handleOAuth2Callback();
// }
\`\`\`

## Best Practices

1. **Secure Token Storage**: Never expose tokens in client-side code or logs
2. **Token Refresh**: Implement automatic token refresh before expiration
3. **Error Handling**: Always handle MFA requirements and token expiration
4. **OAuth2 Security**: Always validate the `state` parameter in OAuth2 callbacks
5. **API Keys**: Use impersonation tokens for server-to-server communication only
6. **Superuser Tokens**: Never expose superuser impersonation tokens in client code
7. **OTP Security**: Use OTP with MFA for security-critical applications
8. **Rate Limiting**: Be aware of rate limits on authentication endpoints

## Troubleshooting

### Token Expired
If you get 401 errors, check if the token has expired:
\`\`\`javascript
try {
  await pb.collection('users').authRefresh();
} catch (err) {
  // Token expired, require re-authentication
  pb.authStore.clear();
  // Redirect to login
}
\`\`\`

### MFA Required
If authentication returns 401 with mfaId:
\`\`\`javascript
if (err.status === 401 && err.response?.mfaId) {
  // Proceed with second authentication factor
}
\`\`\`

### OAuth2 Popup Blocked
Ensure OAuth2 is triggered from a user interaction (click event), not from async code:
\`\`\`javascript
// Good - direct click handler
button.addEventListener('click', () => {
  pb.collection('users').authWithOAuth2({ provider: 'google' });
});

// Bad - async in click handler (may be blocked in Safari)
button.addEventListener('click', async () => {
  await someAsyncFunction();
  pb.collection('users').authWithOAuth2({ provider: 'google' });
});
\`\`\`
