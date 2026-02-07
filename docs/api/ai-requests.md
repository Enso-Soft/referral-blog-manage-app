# AI Requests API

AI blog writing request management API (query, update status, delete).

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
    "prompt": "Write a review about top 10 Olive Young cosmetics",
    "options": {
      "tone": "friendly",
      "length": "medium"
    },
    "status": "pending",
    "progressMessage": "Writing draft...",
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
      "prompt": "Write a review about top 10 Olive Young cosmetics",
      "status": "pending",
      "progressMessage": "Writing draft...",
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
  "message": "Request updated successfully."
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
    "progressMessage": "Writing draft..."
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
    "errorMessage": "AI API call failed"
  }'
```

### Progress Update Guidelines (Required)

> **Warning: These guidelines MUST be followed.**

Use `progressMessage` to keep the user informed of current progress during processing.

- When starting, update the status to `"Prompt received"`.
- Update the status at each major step:
  - e.g., `"Researching materials"`, `"Writing draft"`, `"Processing images"`, `"Final review"`, `"Writing complete"`, etc.
- When spawning sub-agents, either pass the progress update method to them or update the status directly.
- When all work is complete, you **must** change `status` to `"success"`. (Include `resultPostId` if available)
- `progressMessage` should contain **only the current step** in a concise format. Do not include previous steps.

```bash
# Update progress
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "abc123xyz", "progressMessage": "Writing draft"}'

# Mark as success
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "abc123xyz", "status": "success", "resultPostId": "post123"}'

# Mark as failed
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "abc123xyz", "status": "failed", "errorMessage": "AI API call failed"}'
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
  "message": "Request deleted successfully."
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
