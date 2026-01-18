# Products API

Product CRUD API.

## Base URL

```
{{BASE_URL}}/api/products
```

## Authentication

All requests require the `X-API-Key` header.

```
X-API-Key: YOUR_API_KEY
```

---

## POST /api/products

Create a new product.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |
| `Content-Type` | Yes | `application/json` |

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Product name |
| `affiliateLink` | string | Yes | Affiliate link |
| `price` | number | No | Price |
| `images` | string[] | No | Image URL array |
| `category1` | string | No | Level 1 category |
| `category2` | string | No | Level 2 category |
| `category3` | string | No | Level 3 category |
| `brand` | string | No | Brand name |
| `id` | string | No | Custom product ID (auto-generated if not provided) |

### Response

```json
{
  "success": true,
  "product": {
    "id": "userId_productId",
    "userId": "user123",
    "productId": "user_1705312800000_abc123",
    "name": "Product Name",
    "price": 10000,
    "images": ["https://example.com/img.jpg"],
    "affiliateLink": "https://link.coupang.com/...",
    "category": {
      "level1": "Beauty",
      "level2": "Skincare",
      "level3": "Cream"
    },
    "brand": "Brand Name",
    "assignedAt": "2025-01-15T12:00:00.000Z",
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:00.000Z",
    "source": "api"
  },
  "message": "Product created successfully."
}
```

### Example

```bash
curl -X POST {{BASE_URL}}/api/products \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "price": 10000,
    "images": ["https://example.com/img.jpg"],
    "affiliateLink": "https://link.coupang.com/...",
    "category1": "Beauty",
    "category2": "Skincare",
    "category3": "Cream",
    "brand": "Brand Name"
  }'
```

---

## GET /api/products

Retrieve products (single or list).

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | No | Product ID (single product) |
| `keyword` / `search` | string | No | Search term (name/brand) |
| `category` | string | No | Category filter |
| `minPrice` | number | No | Minimum price |
| `maxPrice` | number | No | Maximum price |
| `page` | number | No | Page number (default: 1) |
| `perPage` / `limit` | number | No | Items per page (default: 20) |
| `lastId` | string | No | Cursor-based pagination (use instead of page) |

### Response (Single)

```json
{
  "success": true,
  "product": {
    "id": "userId_productId",
    "name": "Product Name",
    "price": 10000,
    "images": ["https://example.com/img.jpg"],
    "affiliateLink": "https://link.coupang.com/...",
    "category": {
      "level1": "Beauty",
      "level2": "Skincare",
      "level3": "Cream"
    },
    "brand": "Brand Name"
  }
}
```

### Response (List)

```json
{
  "success": true,
  "products": [
    {
      "id": "userId_productId",
      "name": "Product Name",
      "price": 10000,
      "images": [],
      "affiliateLink": "https://...",
      "category": {...},
      "brand": "Brand Name"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 27,
    "perPage": 20,
    "totalCount": 522,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "total": 522,
  "hasMore": true,
  "categoryStats": [
    {"name": "Beauty", "count": 150},
    {"name": "Home & Living", "count": 80}
  ]
}
```

### Example

```bash
# Single product
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/products?id=abc123"

# List products (page-based)
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/products?page=1&perPage=20"

# Search
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/products?keyword=cream"

# Price range filter
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/products?keyword=cream&minPrice=10000&maxPrice=50000"

# Cursor-based pagination
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/products?lastId=userId_productId&perPage=20"
```

---

## PATCH /api/products

Update a product.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |
| `Content-Type` | Yes | `application/json` |

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Product ID |
| `name` | string | No | Product name |
| `price` | number | No | Price |
| `images` | string[] | No | Image URL array |
| `affiliateLink` | string | No | Affiliate link |
| `category1` | string | No | Level 1 category |
| `category2` | string | No | Level 2 category |
| `category3` | string | No | Level 3 category |
| `brand` | string | No | Brand name |

### Response

```json
{
  "success": true,
  "product": {
    "id": "userId_productId",
    "name": "Updated Product Name",
    "price": 15000,
    "updatedAt": "2025-01-15T13:00:00.000Z"
  },
  "message": "Product updated successfully."
}
```

### Example

```bash
curl -X PATCH {{BASE_URL}}/api/products \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123",
    "price": 15000,
    "name": "Updated Product Name"
  }'
```

---

## DELETE /api/products

Delete a product.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Product ID to delete |

### Response

```json
{
  "success": true,
  "message": "Product deleted successfully."
}
```

### Example

```bash
curl -X DELETE -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/products?id=abc123"
```

---

## Error Response

All APIs return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error info (optional)"
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
