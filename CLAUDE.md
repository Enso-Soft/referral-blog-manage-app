# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blog Editor App - A web application for managing and editing blog content with HTML export for Tistory/Naver platforms.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Editor**: Monaco (HTML code editor)
- **Database**: Firebase Firestore (client SDK for frontend, Admin SDK for API routes)
- **Deployment**: Amplify

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

### 빌드 시 주의사항

`npm run build`는 `.next` 폴더를 덮어쓰기 때문에 개발 서버와 충돌한다.

**빌드 실행 절차:**
1. `npm run dev`가 실행 중이면 먼저 종료 (Ctrl+C)
2. `npm run build` 실행
3. 빌드 완료 후 `npm run dev`로 개발 서버 재시작

## Architecture

### Data Layer
- `lib/firebase.ts` - Firebase client SDK initialization (uses `NEXT_PUBLIC_*` env vars)
- `lib/firestore.ts` - Firestore CRUD operations and real-time subscriptions, exports `BlogPost` interface
- API routes (`app/api/`) use Firebase Admin SDK with service account from `../properties/google-services.json`

### Client-Side State
- `hooks/usePosts.ts` - Real-time posts list subscription
- `hooks/usePost.ts` - Single post subscription
- Uses Firestore `onSnapshot` for live updates

### Editor Components
- `PostEditor.tsx` - Main editor wrapper with mode switching (HTML/Split/Preview) and Tistory compatibility warnings
- `HtmlCodeEditor.tsx` - Monaco-based HTML editor with scroll sync
- `TiptapEditor.tsx` - WYSIWYG editor (alternative, dynamic import)

### Routes
- `/` - Post list with status filter (draft/published)
- `/posts/[id]` - Post detail view with HTML copy button
- `/posts/[id]/edit` - Edit post with split-view editor

### Firestore Collections

**주요 컬렉션:**
- `blog_posts` - 블로그 글
- `products` - 제품 정보
- `ai_write_requests` - AI 글 작성 요청

**스키마 상세 문서:**
- `lib/schemas/aiRequest.ts` - AI 관련 컬렉션 스키마 (서버 개발자용 주석 포함)
- `lib/firestore.ts` - BlogPost 인터페이스

```typescript
// blog_posts 컬렉션 (간략)
interface BlogPost {
  userId: string
  title: string
  content: string      // HTML content
  excerpt: string
  thumbnail: string
  keywords: string[]
  status: 'draft' | 'published'
  platform: 'tistory' | 'naver' | 'both'
  createdAt: Timestamp
  updatedAt: Timestamp
  metadata: { originalPath?: string; wordCount: number; aiGenerated?: boolean }
}
```

**인덱스 설정:** `firestore.indexes.json` 참고

## Environment Variables

환경변수는 `.env.local` 파일 참고.

### Amplify 배포 시 환경변수 주의사항

**중요**: 새로운 서버 사이드 환경변수를 추가할 때는 반드시 두 곳에 설정해야 함:

1. **Amplify Console** → Environment variables에 추가
2. **`amplify.yml`** 파일의 build commands에 추가:
```yaml
build:
  commands:
    - echo "NEW_ENV_VAR=$NEW_ENV_VAR" >> .env.production
    - npm run build
```

`amplify.yml`에 추가하지 않으면 빌드 시 `.env.production`에 포함되지 않아 API Routes에서 환경변수를 읽을 수 없음.

## Path Aliases

`@/*` maps to project root (configured in tsconfig.json)

## External API 사용법

API 사용법이 필요하면 `/api/docs` 엔드포인트를 호출하세요:

```bash
# 전체 API 문서 조회
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/docs

# Publish API 문서만 조회
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/docs?resource=publish

# Products API 문서만 조회
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/docs?resource=products
```

**인증**: 모든 API 요청에 `X-API-Key` 헤더 필수

**주요 API 엔드포인트**:
- `/api/publish` - 블로그 글 CRUD
- `/api/products` - 제품 CRUD
- `/api/docs` - API 문서 조회

## Blog HTML 작성 가이드 (다크모드 대응)

티스토리/네이버 다크모드에서 텍스트가 보이도록 아래 규칙을 따른다.

### 핵심 원칙

| 영역 | color 지정 | 이유 |
|------|-----------|------|
| 배경 없는 일반 텍스트 | **지정하지 않음** | 다크모드에서 밝은 색 상속받음 |
| 밝은 배경 박스 내부 | `color: #333 !important` | 밝은 배경 위에서 가독성 확보 |
| 어두운 배경 박스 내부 | `color: white` 또는 `#dddddd` | 어두운 배경 위에서 가독성 확보 |

### 밝은 배경 박스 (필수: `!important`)

```html
<!-- div에 color 지정 -->
<div style="background: #f8f9fa; color: #333 !important; ...">

<!-- ul/ol에도 color 지정 -->
<ul style="color: #333 !important; ...">
  <li>내용</li>
</ul>
```

밝은 배경 색상 예시: `#f8f9fa`, `#fafafa`, `#e8f5e9`, `#fff3e0`, `#e3f2fd`, `linear-gradient(135deg, #f...)`

### 어두운 배경 박스

```html
<div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); color: white; ...">
  <p style="color: #dddddd;">텍스트</p>
</div>
```

### 일반 본문 텍스트 (배경 없음)

```html
<!-- color 지정하지 않음 -->
<p style="font-size: 17px; line-height: 1.9; margin-bottom: 20px;">
  일반 본문 텍스트는 color를 지정하지 않는다.
</p>
```

### 테이블

테이블은 행별로 구분해서 처리한다:

| 행 타입 | 처리 |
|---------|------|
| 밝은 배경 행 (`#f7fafc`, `#ebf8ff` 등) | 모든 `<td>`에 `color: #333 !important` |
| 배경 없는 행 | `color` 제거 (상속받도록) |
| 헤더 행 (어두운 배경) | `color: white` 유지 |

```html
<!-- 밝은 배경 행: color 필수 -->
<tr style="background: #f7fafc;">
  <td style="padding: 14px; color: #333 !important;">항목</td>
  <td style="padding: 14px; color: #333 !important;">내용</td>
</tr>

<!-- 배경 없는 행: color 제거 -->
<tr>
  <td style="padding: 14px;">항목</td>
  <td style="padding: 14px;">내용</td>
</tr>

<!-- 헤더 (어두운 배경): color white 유지 -->
<tr style="background: #4299e1; color: white;">
  <th>제목</th>
</tr>
```

밝은 배경 색상 목록: `#f7fafc`, `#ebf8ff`, `#f0fff4`, `#fff5f5`, `#fffaf0`

### 주의: 배경 없는 영역

Q&A, 일반 본문 등 **배경이 없는 영역**에서는 절대 `color: #333`을 넣지 않는다.
→ 다크모드에서 어두운 배경 + 어두운 텍스트 = 안 보임

```html
<!-- 잘못된 예 -->
<p style="color: #333; line-height: 1.9;">답변 텍스트</p>

<!-- 올바른 예 -->
<p style="line-height: 1.9;">답변 텍스트</p>
```

### 체크리스트

- [ ] 밝은 배경 div → `color: #333 !important` 추가
- [ ] 밝은 배경 내부 ul/ol → `color: #333 !important` 추가
- [ ] **배경 없는 영역** → `color` 제거 (상속받도록)
- [ ] 어두운 배경 → `color: white` 또는 밝은 색 사용
