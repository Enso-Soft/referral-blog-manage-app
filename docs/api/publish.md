# Publish API

Blog post CRUD API.

## Base URL

```
{{BASE_URL}}/api/public/publish
```

## Authentication

All requests require the `X-API-Key` header.

```
X-API-Key: YOUR_API_KEY
```

---

## POST /api/public/publish

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
| `slug` | string | Yes | URL slug for SEO |
| `excerpt` | string | Yes | Post excerpt/summary for SEO |
| `keywords` | string[] | No | Keywords array |
| `products` | object[] | No | Associated products array |
| `seoAnalysis` | object | No | SEO analysis data |
| `threads` | object | No | Threads posting content |

> **Note:** Updating the `products` array will automatically update the `postType`. If `products` becomes non-empty, `postType` changes to 'affiliate'. If empty, it changes to 'general'.
| `metadata` | object | No | Additional metadata |

**products array element:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Product name |
| `affiliateLink` | string | Yes | Affiliate link |
| `price` | number | No | Price |
| `brand` | string | No | Brand |

> **Note:** The `postType` ('general' or 'affiliate') is automatically determined based on the presence of the `products` array. If `products` has items, `postType` becomes 'affiliate', otherwise 'general'.

**seoAnalysis object:**

AI가 글 작성 전 수행한 키워드 리서치 결과. `mainKeyword`만 필수이며, 나머지는 모두 optional.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mainKeyword` | object | **Yes** | 메인 키워드 정보 |
| `mainKeyword.keyword` | string | **Yes** | 메인 키워드 |
| `mainKeyword.monthlyVolume` | number | No | 월간 검색량 (합계) |
| `mainKeyword.pcVolume` | number | No | PC 검색량 |
| `mainKeyword.mobileVolume` | number | No | 모바일 검색량 |
| `mainKeyword.competition` | string | No | `"low"`, `"medium"`, `"high"` |
| `mainKeyword.serpDifficulty` | number | No | SERP 난이도 (0-100) |
| `mainKeyword.ctr` | number | No | 클릭률 (%) |
| `mainKeyword.adCount` | number | No | 광고 노출 수 |
| `mainKeyword.recommendation` | string | No | 추천 의견 |
| `mainKeyword.reason` | string | No | 선택 이유 |
| `subKeywords` | object[] | No | 서브 키워드 목록 (mainKeyword와 동일 구조) |
| `trendKeywords` | object[] | No | 트렌드 키워드 |
| `trendKeywords[].keyword` | string | Yes | 키워드 |
| `trendKeywords[].monthlyVolume` | number | No | 월간 검색량 |
| `trendKeywords[].competition` | string | No | 경쟁도 |
| `trendKeywords[].trend` | string | No | 트렌드 방향 (급상승/안정적/하락) |
| `trendKeywords[].insight` | string | No | 인사이트 설명 |
| `keywordCandidates` | object[] | No | AI가 비교한 키워드 후보 목록 |
| `keywordCandidates[].keyword` | string | Yes | 키워드 |
| `keywordCandidates[].pcVolume` | number | No | PC 검색량 |
| `keywordCandidates[].mobileVolume` | number | No | 모바일 검색량 |
| `keywordCandidates[].totalVolume` | number | No | 총 검색량 |
| `keywordCandidates[].competition` | string | No | `"low"`, `"medium"`, `"high"` |
| `keywordCandidates[].serpDifficulty` | number | No | SERP 난이도 (0-100) |
| `keywordCandidates[].selected` | boolean | No | 최종 선택 여부 |
| `keywordCandidates[].recommendation` | string | No | 추천 의견 |
| `keywordCandidates[].reason` | string | No | 판단 이유 |
| `trendData` | object[] | No | 검색량 시계열 데이터 |
| `trendData[].keyword` | string | Yes | 키워드 |
| `trendData[].dataPoints` | object[] | Yes | 시계열 포인트 배열 |
| `trendData[].dataPoints[].period` | string | Yes | 기간 ("2025-08" 또는 "8월") |
| `trendData[].dataPoints[].value` | number | Yes | 검색량 (상대값 또는 절대값) |
| `trendData[].summary` | string | No | 트렌드 요약 |
| `titleOptions` | object[] | No | 타이틀 추천 옵션 |
| `titleOptions[].title` | string | Yes | 추천 타이틀 |
| `titleOptions[].length` | number | No | 글자수 |
| `titleOptions[].reasoning` | string | No | 추천 이유 |
| `titleOptions[].selected` | boolean | No | 최종 선택 여부 |
| `titleOptions[].keywordCoverage` | string[] | No | 포함된 키워드 목록 |
| `titleOptions[].ctrEstimate` | string | No | CTR 예상 (높음/중간/낮음) |
| `titleOptions[].targetIntent` | string | No | 타겟 검색 의도 |
| `searchIntent` | object[] | No | 검색 의도 분석 |
| `searchIntent[].type` | string | Yes | 의도 유형 |
| `searchIntent[].percentage` | number | Yes | 비율 (%) |
| `searchIntent[].keywords` | string[] | No | 관련 검색어 |
| `searchIntent[].contentDirection` | string | No | 콘텐츠 방향 |
| `serpCompetitors` | object[] | No | 상위 경쟁 블로그 분석 |
| `blogCompetition` | object | No | 블로그 경쟁도 요약 |
| `shoppingData` | object | No | 쇼핑 데이터 (제품 리뷰 글용) |
| `insights` | string[] | No | 인사이트 |
| `risks` | string[] | No | 위험 요소 |
| `analyzedAt` | string | No | 분석 일시 |

**threads object:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Threads post content (max 500 chars) |
| `hashtag` | string | No | Hashtags |
| `imageUrl` | string | No | Image URL |
| `linkUrl` | string | No | Link URL |

### Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "title": "Post Title",
    "slug": "post-title-slug",
    "excerpt": "Post summary for SEO",
    "status": "draft",
    "postType": "affiliate",
    "createdAt": "2025-01-15T12:00:00.000Z"
  },
  "message": "Blog post created successfully."
}
```

### Example

```bash
curl -X POST {{BASE_URL}}/api/public/publish \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Post Title",
    "content": "<p>HTML content</p>",
    "slug": "post-title-slug",
    "excerpt": "Post summary for SEO",
    "keywords": ["keyword1", "keyword2"],
    "status": "draft",
    "products": [
      {"name": "Product Name", "affiliateLink": "https://link.coupang.com/...", "price": 10000}
    ]
  }'
```

---

## GET /api/public/publish

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
    "slug": "post-title-slug",
    "excerpt": "Post summary for SEO",
    "keywords": ["keyword1", "keyword2"],
    "products": [],
    "status": "draft",
    "postType": "general",
    "seoAnalysis": { "mainKeyword": { "keyword": "..." }, "..." : "..." },
    "threads": { "text": "...", "postStatus": "not_posted" },
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
      "slug": "post-title-slug",
      "status": "draft",
      "postType": "general",
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
  "{{BASE_URL}}/api/public/publish?id=abc123xyz"

# List posts
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/public/publish?page=1&limit=10"

# Filter by status
curl -H "X-API-Key: YOUR_API_KEY" \
  "{{BASE_URL}}/api/public/publish?status=published"
```

---

## PATCH /api/public/publish

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
| `slug` | string | No | URL slug for SEO |
| `excerpt` | string | No | Post excerpt/summary for SEO |
| `keywords` | string[] | No | Keywords array |
| `status` | string | No | `"draft"` or `"published"` |
| `products` | object[] | No | Associated products array |
| `seoAnalysis` | object | No | SEO analysis data (full replacement) |
| `threads` | object | No | Threads content (partial update supported) |

> **Note:** Updating the `products` array will automatically update the `postType`. If `products` becomes non-empty, `postType` changes to 'affiliate'. If empty, it changes to 'general'.

### Response

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "title": "Updated Title",
    "content": "<p>Updated content</p>",
    "slug": "updated-slug",
    "excerpt": "Updated excerpt",
    "keywords": [],
    "products": [],
    "status": "published",
    "postType": "general",
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T13:00:00.000Z"
  },
  "message": "Post updated successfully."
}
```

### Example

```bash
curl -X PATCH {{BASE_URL}}/api/public/publish \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123xyz",
    "title": "Updated Title",
    "status": "published"
  }'
```

---

## DELETE /api/public/publish

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
  "{{BASE_URL}}/api/public/publish?id=abc123xyz"
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
