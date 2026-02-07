# AI Requests API

AI blog writing request CRUD API.

## Base URL

```
{{BASE_URL}}/api/public/ai-requests
```

## Authentication

All requests require the `X-API-Key` header.

```
X-API-Key: YOUR_API_KEY
```

---

## POST /api/public/ai-requests

Create a new AI writing request.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |
| `Content-Type` | Yes | `application/json` |

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Writing prompt |
| `options` | object | Yes | Writing options (see below) |
| `images` | string[] | No | Base64-encoded image array (`data:image/jpeg;base64,...`) |

**options object:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | No | `"tistory"`, `"naver"`, or `"both"` |
| `tone` | string | No | `"auto"`, `"friendly"`, `"professional"`, `"casual"`, `"concise"`, or custom string |
| `length` | string | No | `"auto"`, `"short"`, `"medium"`, or `"long"` |
| `productIds` | string[] | No | Product IDs to associate |

### Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "status": "pending",
    "createdAt": "2025-01-15T12:00:00.000Z"
  },
  "message": "AI 글 작성 요청이 생성되었습니다."
}
```

### Example

```bash
curl -X POST {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "올리브영 추천 화장품 리뷰 글 작성해줘",
    "options": {
      "platform": "tistory",
      "tone": "friendly",
      "length": "medium"
    }
  }'
```

---

## GET /api/public/ai-requests

Retrieve AI writing requests (single or list).

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | No | Request ID (single request) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `status` | string | No | Filter: `"pending"`, `"success"`, or `"failed"` |

### Response (Single)

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "prompt": "올리브영 추천 화장품 리뷰 글 작성해줘",
    "options": {
      "platform": "tistory",
      "tone": "friendly",
      "length": "medium"
    },
    "status": "pending",
    "progressMessage": "초안 작성 중...",
    "resultPostId": null,
    "errorMessage": null,
    "createdAt": "2025-01-15T12:00:00.000Z",
    "completedAt": null
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
      "prompt": "올리브영 추천 화장품 리뷰 글 작성해줘",
      "status": "pending",
      "progressMessage": "초안 작성 중...",
      "createdAt": "2025-01-15T12:00:00.000Z",
      "completedAt": null
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
# Single request
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/public/ai-requests?id=abc123xyz"

# List requests
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/public/ai-requests?page=1&limit=10"

# Filter by status
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/public/ai-requests?status=pending"
```

---

## PATCH /api/public/ai-requests

Update request status or progress.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |
| `Content-Type` | Yes | `application/json` |

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Request ID |
| `status` | string | No | `"pending"`, `"success"`, or `"failed"` |
| `progressMessage` | string | No | Progress message (shown during pending) |
| `resultPostId` | string | No | Created blog post ID (on success) |
| `errorMessage` | string | No | Error message (on failure) |

> **Note:** When `status` is changed to `"success"` or `"failed"`, `completedAt` is automatically set.

### Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "status": "success",
    "progressMessage": null,
    "resultPostId": "post123",
    "errorMessage": null,
    "createdAt": "2025-01-15T12:00:00.000Z",
    "completedAt": "2025-01-15T12:05:00.000Z"
  },
  "message": "요청이 업데이트되었습니다."
}
```

### Example

```bash
# Update progress message
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123xyz",
    "progressMessage": "초안 작성 중..."
  }'

# Mark as success
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123xyz",
    "status": "success",
    "resultPostId": "post123"
  }'

# Mark as failed
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123xyz",
    "status": "failed",
    "errorMessage": "API 호출 실패"
  }'
```

---

## DELETE /api/public/ai-requests

Delete a request.

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Request ID to delete |

### Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz"
  },
  "message": "요청이 삭제되었습니다."
}
```

### Example

```bash
curl -X DELETE -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/public/ai-requests?id=abc123xyz"
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
