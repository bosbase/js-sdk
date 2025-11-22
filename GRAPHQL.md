# GraphQL queries with the JS SDK

Use `pb.graphql.query()` to call `/api/graphql` with your current auth token. It returns `{ data, errors, extensions }`.

> Authentication: the GraphQL endpoint is **superuser-only**. Authenticate as a superuser before calling GraphQL, e.g. `await pb.collection("_superusers").authWithPassword(email, password);`.

## Single-table query

```js
const query = `
  query ActiveUsers($limit: Int!) {
    records(collection: "users", perPage: $limit, filter: "status = true") {
      items { id data }
    }
  }
`;

const { data, errors } = await pb.graphql.query(query, { limit: 5 });
```

## Multi-table join via expands

```js
const query = `
  query PostsWithAuthors {
    records(
      collection: "posts",
      expand: ["author", "author.profile"],
      sort: "-created"
    ) {
      items {
        id
        data  // expanded relations live under data.expand
      }
    }
  }
`;

const { data } = await pb.graphql.query(query);
```

## Conditional query with variables

```js
const query = `
  query FilteredOrders($minTotal: Float!, $state: String!) {
    records(
      collection: "orders",
      filter: "total >= $minTotal && status = $state",
      sort: "created"
    ) {
      items { id data }
    }
  }
`;

const variables = { minTotal: 100, state: "paid" };
const result = await pb.graphql.query(query, variables);
```

Use the `filter`, `sort`, `page`, `perPage`, and `expand` arguments to mirror REST list behavior while keeping query logic in GraphQL.

## Create a record

```js
const mutation = `
  mutation CreatePost($data: JSON!) {
    createRecord(collection: "posts", data: $data, expand: ["author"]) {
      id
      data
    }
  }
`;

const data = { title: "Hello", author: "USER_ID" };
const { data: result } = await pb.graphql.query(mutation, { data });
```

## Update a record

```js
const mutation = `
  mutation UpdatePost($id: ID!, $data: JSON!) {
    updateRecord(collection: "posts", id: $id, data: $data) {
      id
      data
    }
  }
`;

await pb.graphql.query(mutation, {
  id: "POST_ID",
  data: { title: "Updated title" },
});
```

## Delete a record

```js
const mutation = `
  mutation DeletePost($id: ID!) {
    deleteRecord(collection: "posts", id: $id)
  }
`;

await pb.graphql.query(mutation, { id: "POST_ID" });
```
