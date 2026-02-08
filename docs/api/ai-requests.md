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
| `errorMessage` | string | No | Error message (on failure). **This message is displayed to the user in the UI.** |

> **Note:** When `status` is changed to `"success"` or `"failed"`, `completedAt` is automatically set.

### Response

#### Success Response

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

#### Failed Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "status": "failed",
    "progressMessage": null,
    "resultPostId": null,
    "errorMessage": "요청이 거부되었습니다.",
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

### Failure Handling Guide

When an external AI API call fails, capture the error detail and pass it as `errorMessage`. This message is **displayed directly to the user** in the request card UI.

#### Example: AI API returns error

If the AI API responds with:

```
HTTP 400
{"detail": "요청이 거부되었습니다."}
```

Then update the request like this:

```bash
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123xyz",
    "status": "failed",
    "errorMessage": "요청이 거부되었습니다."
  }'
```

#### Common error message examples

| Scenario | Example `errorMessage` |
|----------|----------------------|
| AI API 400 error | `"요청이 거부되었습니다."` (pass `detail` from response) |
| AI API timeout | `"AI API 응답 시간 초과"` |
| AI API 500 error | `"AI 서버 내부 오류 (status: 500)"` |
| Network error | `"AI API 연결 실패"` |
| Invalid response | `"AI API 응답 형식 오류"` |
| Rate limit | `"요청 한도 초과. 잠시 후 다시 시도해주세요."` |

#### Pseudocode

```python
try:
    response = requests.post("https://api.enso-soft.xyz/v1/ai/blog-writer", ...)

    if response.status_code != 200:
        error_detail = response.json().get("detail", f"AI API 오류 (status: {response.status_code})")
        # Mark as failed with the error detail
        requests.patch(f"{BASE_URL}/api/public/ai-requests", json={
            "id": request_id,
            "status": "failed",
            "errorMessage": error_detail
        }, headers={"X-API-Key": API_KEY})
        return

    # ... process success ...

except requests.exceptions.Timeout:
    requests.patch(f"{BASE_URL}/api/public/ai-requests", json={
        "id": request_id,
        "status": "failed",
        "errorMessage": "AI API 응답 시간 초과"
    }, headers={"X-API-Key": API_KEY})

except requests.exceptions.ConnectionError:
    requests.patch(f"{BASE_URL}/api/public/ai-requests", json={
        "id": request_id,
        "status": "failed",
        "errorMessage": "AI API 연결 실패"
    }, headers={"X-API-Key": API_KEY})
```

### Progress Update Guidelines (MANDATORY)

> **CRITICAL: You MUST follow ALL of these rules. Failure to update progress will result in the user seeing a stuck "pending" state with no feedback. This is a blocking requirement — not optional.**

#### Rule 1: Update progress BEFORE every major step

You MUST call `PATCH /api/public/ai-requests` to update `progressMessage` **before** you begin each step. Do NOT batch updates or skip them. The user is watching the progress in real-time.

**Example sequence (adapt messages to your actual workflow):**

```
PATCH → {"progressMessage": "describing your current step"}
  ... do work ...
PATCH → {"progressMessage": "describing your next step"}
  ... do work ...
PATCH → {"progressMessage": "describing your next step"}
  ... do work ...
PATCH → {"status": "success", "resultPostId": "..."}
```

Write `progressMessage` in a way that accurately describes what you are currently doing. You MUST have **at least 3 progress updates** before marking as success.

#### Rule 2: Sub-agents MUST also update progress

If you spawn sub-agents or delegate tasks:

- You MUST pass `requestId`, `API_KEY`, and `BASE_URL` to every sub-agent.
- Every sub-agent MUST call `PATCH /api/public/ai-requests` independently to update progress for its own step.
- Do NOT rely on the parent agent to update progress on behalf of sub-agents.
- If a sub-agent cannot call the API directly, the parent agent MUST update progress immediately after each sub-agent completes.

**Example instruction to pass to sub-agents:**

```
Before starting your task, you MUST update the progress:

curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: {{API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"id": "{{REQUEST_ID}}", "progressMessage": "YOUR_CURRENT_STEP"}'

When your task is complete, update the progress again with the next step.
```

#### Rule 3: Only show current step

`progressMessage` MUST contain **only the current step** in a short, concise format. Do NOT include previous steps or timestamps.

```
"초안 작성 중"        ← correct
"[2/5] 초안 작성 중"  ← correct
"자료 조사 완료, 초안 작성 중" ← wrong (includes previous step)
```

#### Rule 4: Always set final status

When all work is complete, you MUST change `status` to `"success"`. Include `resultPostId` if a blog post was created.

If any error occurs at any point, you MUST change `status` to `"failed"` with a clear `errorMessage`.

**Never leave a request in `"pending"` status permanently.**

#### API calls

```bash
# Update progress (call this BEFORE each step)
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "abc123xyz", "progressMessage": "초안 작성 중"}'

# Mark as success (MUST be called when all work is done)
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "abc123xyz", "status": "success", "resultPostId": "post123"}'

# Mark as failed (MUST be called on any error)
curl -X PATCH {{BASE_URL}}/api/public/ai-requests \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "abc123xyz", "status": "failed", "errorMessage": "Error description"}'
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
