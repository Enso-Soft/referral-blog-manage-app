# Publish API

Blog post CRUD API.

## Base URL

```
{{BASE_URL}}/api/publish
```

## Authentication

All requests require the `X-API-Key` header.

```
X-API-Key: YOUR_API_KEY
```

---

## POST /api/publish

Create a new blog post.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |
| `Content-Type` | Yes | `application/json` |

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Post title |
| `content` | string | Yes | HTML content |
| `keywords` | string[] | No | Keywords array |
| `status` | string | No | `"draft"` (default) or `"published"` |
| `products` | object[] | No | Associated products array |
| `metadata` | object | No | Additional metadata |

**products array element:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Product name |
| `affiliateLink` | string | Yes | Affiliate link |
| `price` | number | No | Price |
| `brand` | string | No | Brand |

### Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "title": "Post Title",
    "status": "draft",
    "createdAt": "2025-01-15T12:00:00.000Z"
  },
  "message": "Blog post created successfully."
}
```

### Example

```bash
curl -X POST {{BASE_URL}}/api/publish \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Post Title",
    "content": "<p>HTML content</p>",
    "keywords": ["keyword1", "keyword2"],
    "status": "draft",
    "products": [
      {"name": "Product Name", "affiliateLink": "https://link.coupang.com/...", "price": 10000}
    ]
  }'
```

---

## GET /api/publish

Retrieve posts (single or list).

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | No | Post ID (single post with content) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `status` | string | No | Filter: `"draft"` or `"published"` |

### Response (Single)

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "title": "Post Title",
    "content": "<p>HTML content</p>",
    "keywords": ["keyword1", "keyword2"],
    "products": [],
    "status": "draft",
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:00.000Z",
    "metadata": {}
  }
}
```

### Response (List)

```json
{
  "success": true,
  "data": [
    {
      "id": "abc123xyz",
      "title": "Post Title",
      "status": "draft",
      "keywords": ["keyword1"],
      "createdAt": "2025-01-15T12:00:00.000Z",
      "updatedAt": "2025-01-15T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "count": 1
  }
}
```

### Example

```bash
# Single post (includes content)
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/publish?id=abc123xyz"

# List posts
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/publish?page=1&limit=10"

# Filter by status
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/publish?status=published"
```

---

## PATCH /api/publish

Update a post.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |
| `Content-Type` | Yes | `application/json` |

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Post ID |
| `title` | string | No | Post title |
| `content` | string | No | HTML content |
| `keywords` | string[] | No | Keywords array |
| `status` | string | No | `"draft"` or `"published"` |
| `products` | object[] | No | Associated products array |

### Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "title": "Updated Title",
    "content": "<p>Updated content</p>",
    "keywords": [],
    "products": [],
    "status": "published",
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T13:00:00.000Z"
  },
  "message": "Post updated successfully."
}
```

### Example

```bash
curl -X PATCH {{BASE_URL}}/api/publish \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123xyz",
    "title": "Updated Title",
    "status": "published"
  }'
```

---

## DELETE /api/publish

Delete a post.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Post ID to delete |

### Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz"
  },
  "message": "Post deleted successfully."
}
```

### Example

```bash
curl -X DELETE -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/publish?id=abc123xyz"
```

---

## Error Response

All APIs return errors in this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

**HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad request (missing required fields, etc.) |
| 401 | Authentication failed (missing/invalid API key) |
| 403 | Forbidden (accessing another user's resource) |
| 404 | Resource not found |
| 500 | Server error |
