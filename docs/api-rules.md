# API Rules Documentation

API Rules are collection access controls and data filters that determine who can perform actions on your collections and what data they can access.

## Overview

Each collection has 5 standard API rules, corresponding to specific API actions:

- **`listRule`** - Controls read/list access
- **`viewRule`** - Controls read/view access  
- **`createRule`** - Controls create access
- **`updateRule`** - Controls update access
- **`deleteRule`** - Controls delete access

Auth collections have two additional rules:

- **`manageRule`** - Admin-like permissions for managing auth records
- **`authRule`** - Additional constraints applied during authentication

## Rule Values

Each rule can be set to one of three values:

### 1. `null` (Locked)
Only authorized superusers can perform the action.

```typescript
await client.collections.setListRule("products", null);
```

### 2. `""` (Empty String - Public)
Anyone (superusers, authorized users, and guests) can perform the action.

```typescript
await client.collections.setListRule("products", "");
```

### 3. Non-empty String (Filter Expression)
Only users satisfying the filter expression can perform the action.

```typescript
await client.collections.setListRule("products", "@request.auth.id != \"\"");
```

## Default Permissions

When you create a base collection without specifying rules, BosBase applies opinionated defaults:

- `listRule` and `viewRule` default to an empty string (`""`), so guests and authenticated users can query records.
- `createRule` defaults to `@request.auth.id != ""`, restricting writes to authenticated users or superusers.
- `updateRule` and `deleteRule` default to `@request.auth.id != "" && createdBy = @request.auth.id`, which limits mutations to the record creator (superusers still bypass rules).

Every base collection now includes hidden system fields named `createdBy` and `updatedBy`. BosBase automatically sets `createdBy` when a record is inserted and refreshes `updatedBy` on each authenticated write; anonymous inserts or updates leave the values empty so only superusers can mutate those records later. View collections inherit the public read defaults, and system collections such as `users`, `_superusers`, `_authOrigins`, `_externalAuths`, `_mfas`, and `_otps` keep their custom API rules.

## Setting Rules

### Individual Rules

Set individual rules using dedicated methods:

```typescript
// Set list rule
await client.collections.setListRule(
    "products",
    "@request.auth.id != \"\""
);

// Set view rule
await client.collections.setViewRule(
    "products",
    "@request.auth.id != \"\""
);

// Set create rule
await client.collections.setCreateRule(
    "products",
    "@request.auth.id != \"\""
);

// Set update rule
await client.collections.setUpdateRule(
    "products",
    "@request.auth.id != \"\" && author.id ?= @request.auth.id"
);

// Set delete rule
await client.collections.setDeleteRule(
    "products",
    null  // Only superusers
);
```

### Bulk Rule Updates

Set multiple rules at once:

```typescript
await client.collections.setRules("products", {
    listRule: "@request.auth.id != \"\"",
    viewRule: "@request.auth.id != \"\"",
    createRule: "@request.auth.id != \"\"",
    updateRule: "@request.auth.id != \"\" && author.id ?= @request.auth.id",
    deleteRule: null,  // Only superusers
});
```

### Getting Rules

Retrieve all rules for a collection:

```typescript
const rules = await client.collections.getRules("products");
console.log(rules.listRule);
console.log(rules.viewRule);
```

## Filter Syntax

Rules use the same filter syntax as API queries. The syntax follows: `OPERAND OPERATOR OPERAND`

### Operators

- `=` - Equal
- `!=` - NOT equal
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `~` - Like/Contains (auto-wraps string in `%` for wildcard)
- `!~` - NOT Like/Contains
- `?=` - Any/At least one of Equal
- `?!=` - Any/At least one of NOT equal
- `?>` - Any/At least one of Greater than
- `?>=` - Any/At least one of Greater than or equal
- `?<` - Any/At least one of Less than
- `?<=` - Any/At least one of Less than or equal
- `?~` - Any/At least one of Like/Contains
- `?!~` - Any/At least one of NOT Like/Contains

### Logical Operators

- `&&` - AND
- `||` - OR
- `(...)` - Grouping parentheses

### Field Access

#### Collection Schema Fields

Access fields from your collection schema:

```typescript
// Filter by status field
"status = \"active\""

// Access nested relation fields
"author.status != \"banned\""

// Access relation IDs
"author.id ?= @request.auth.id"
```

#### Request Context (`@request.*`)

Access current request data:

```typescript
// Authentication state
"@request.auth.id != \"\""  // User is authenticated
"@request.auth.id = \"\""  // User is guest

// Request context
"@request.context != \"oauth2\""  // Not an OAuth2 request

// HTTP method
"@request.method = \"GET\""

// Request headers (normalized: lowercase, "-" replaced with "_")
"@request.headers.x_token = \"test\""

// Query parameters
"@request.query.page = \"1\""

// Body parameters
"@request.body.title != \"\""
```

#### Other Collections (`@collection.*`)

Target other collections that share common field values:

```typescript
// Check if user has access in related collection
"@collection.permissions.user ?= @request.auth.id && @collection.permissions.resource = id"
```

You can use aliases for multiple joins of the same collection:

```typescript
"@request.auth.id != \"\" && @collection.courseRegistrations.user ?= id && @collection.courseRegistrations:auth.user ?= @request.auth.id"
```

### Field Modifiers

#### `:isset` Modifier

Check if a request field was submitted:

```typescript
// Prevent changing role field
"@request.body.role:isset = false"
```

#### `:length` Modifier

Check the number of items in an array field:

```typescript
// At least 2 items in select field
"@request.body.tags:length > 1"

// Check existing relation field length
"someRelationField:length = 2"
```

#### `:each` Modifier

Apply condition to each item in a multiple field:

```typescript
// All select options contain "create"
"@request.body.someSelectField:each ~ \"create\""

// All fields have "pb_" prefix
"someSelectField:each ~ \"pb_%\""
```

#### `:lower` Modifier

Perform case-insensitive string comparisons:

```typescript
// Case-insensitive title check
"@request.body.title:lower = \"test\""

// Case-insensitive existing field match
"title:lower ~ \"test\""
```

### DateTime Macros

All macros are UTC-based:

```typescript
// Current datetime
"@now"

// Date components
"@second"    // 0-59
"@minute"    // 0-59
"@hour"      // 0-23
"@weekday"   // 0-6
"@day"       // Day number
"@month"     // Month number
"@year"      // Year number

// Relative dates
"@yesterday"
"@tomorrow"
"@todayStart"  // Beginning of current day
"@todayEnd"    // End of current day
"@monthStart"  // Beginning of current month
"@monthEnd"    // End of current month
"@yearStart"   // Beginning of current year
"@yearEnd"     // End of current year
```

Example:

```typescript
"@request.body.publicDate >= @now"
"created >= @todayStart && created <= @todayEnd"
```

### Functions

#### `geoDistance(lonA, latA, lonB, latB)`

Calculate Haversine distance between two geographic points in kilometres:

```typescript
// Offices within 25km
"geoDistance(address.lon, address.lat, 23.32, 42.69) < 25"
```

## Common Examples

### Allow Only Registered Users

```typescript
await client.collections.setListRule(
    "products",
    "@request.auth.id != \"\""
);
```

### Filter by Status

```typescript
await client.collections.setListRule(
    "products",
    "status = \"active\""
);
```

### Combine Conditions

```typescript
await client.collections.setListRule(
    "products",
    "@request.auth.id != \"\" && (status = \"active\" || status = \"pending\")"
);
```

### Filter by Relation

```typescript
// Only show records where user is the author
await client.collections.setListRule(
    "posts",
    "@request.auth.id != \"\" && author.id ?= @request.auth.id"
);

// Only show records where user is in allowed_users relation
await client.collections.setListRule(
    "documents",
    "@request.auth.id != \"\" && allowed_users.id ?= @request.auth.id"
);
```

### Public Access with Filter

```typescript
// Allow anyone, but only show active items
await client.collections.setListRule(
    "products",
    "status = \"active\""
);

// Allow anyone, filter by title prefix
await client.collections.setListRule(
    "articles",
    "title ~ \"Lorem%\""
);
```

### Owner-Based Update/Delete

```typescript
// Users can only update/delete their own records
await client.collections.setUpdateRule(
    "posts",
    "@request.auth.id != \"\" && author.id = @request.auth.id"
);

await client.collections.setDeleteRule(
    "posts",
    "@request.auth.id != \"\" && author.id = @request.auth.id"
);
```

### Prevent Field Modification

```typescript
// Prevent changing role field
await client.collections.setUpdateRule(
    "users",
    "@request.auth.id != \"\" && @request.body.role:isset = false"
);
```

### Date-Based Rules

```typescript
// Only show future events
await client.collections.setListRule(
    "events",
    "startDate >= @now"
);

// Only show items created today
await client.collections.setListRule(
    "posts",
    "created >= @todayStart && created <= @todayEnd"
);
```

### Array Field Validation

```typescript
// Require at least one tag
await client.collections.setCreateRule(
    "posts",
    "@request.body.tags:length > 0"
);

// Require all tags to start with "pb_"
await client.collections.setCreateRule(
    "posts",
    "@request.body.tags:each ~ \"pb_%\""
);
```

### Geographic Distance

```typescript
// Only show offices within 25km of location
await client.collections.setListRule(
    "offices",
    "geoDistance(address.lon, address.lat, 23.32, 42.69) < 25"
);
```

## Auth Collection Rules

### Auth Rule

Controls who can authenticate:

```typescript
// Only verified users can authenticate
await client.collections.setAuthRule(
    "users",
    "verified = true"
);

// Allow all users to authenticate
await client.collections.setAuthRule(
    "users",
    ""  // Empty string = allow all
);

// Disable authentication (only superusers can auth)
await client.collections.setAuthRule(
    "users",
    null  // null = disabled
);
```

### Manage Rule

Gives admin-like permissions for managing auth records:

```typescript
// Allow users to manage other users' records if they have permission
await client.collections.setManageRule(
    "users",
    "@collection.user_permissions.user ?= @request.auth.id && @collection.user_permissions.target ?= id"
);

// Allow specific role to manage all users
await client.collections.setManageRule(
    "users",
    "@request.auth.role = \"admin\""
);
```

## Best Practices

1. **Start with locked rules** (null) for security, then gradually open access as needed
2. **Use relation checks** for owner-based access patterns
3. **Combine multiple conditions** using `&&` and `||` for complex scenarios
4. **Test rules thoroughly** before deploying to production
5. **Document your rules** in code comments explaining the business logic
6. **Use empty string (`""`)** only when you truly want public access
7. **Leverage modifiers** (`:isset`, `:length`, `:each`) for validation

## Error Responses

API Rules also act as data filters. When a request doesn't satisfy a rule:

- **listRule** - Returns `200` with empty items (filters out records)
- **createRule** - Returns `400` Bad Request
- **viewRule** - Returns `404` Not Found
- **updateRule** - Returns `404` Not Found
- **deleteRule** - Returns `404` Not Found
- **All rules** - Return `403` Forbidden if locked (null) and user is not superuser

## Notes

- **Superusers bypass all rules** - Rules are ignored when the action is performed by an authorized superuser
- **Rules are evaluated server-side** - Client-side validation is not enough
- **Comments are supported** - Use `//` for single-line comments in rules
- **System fields protection** - Some fields may be protected regardless of rules
