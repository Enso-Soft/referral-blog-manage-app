# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blog Editor App - 블로그 콘텐츠를 관리하고 편집하는 웹 애플리케이션. 티스토리/네이버 플랫폼용 HTML 내보내기, AI 글 작성/편집, 제휴 제품 관리 기능을 제공한다.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, framer-motion (애니메이션)
- **Editor**: Monaco (HTML 코드 에디터)
- **Database**: Firebase Firestore (클라이언트 SDK + Admin SDK)
- **Auth**: Firebase Auth (Google OAuth)
- **State**: TanStack Query (캐싱/뮤테이션) + Firestore onSnapshot (실시간)
- **Validation**: Zod
- **Storage**: AWS S3 (이미지 업로드)
- **Deployment**: AWS Amplify

## Commands

```bash
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run start    # 프로덕션 서버
```

### 빌드 시 주의사항

`npm run build`는 `.next` 폴더를 덮어쓰기 때문에 개발 서버와 충돌한다.

**빌드 실행 절차:**
1. `npm run dev`가 실행 중이면 먼저 종료 (Ctrl+C)
2. `npm run build` 실행
3. 빌드 완료 후 `npm run dev`로 개발 서버 재시작

## Architecture

### Provider Hierarchy

`components/Providers.tsx`에서 전역 Provider를 래핑한다. 순서가 중요:

```
QueryProvider (TanStack Query)
└─ ThemeProvider (next-themes)
   └─ ErrorBoundary
      └─ AuthProvider (Firebase Auth 상태, 사용자 프로필, 역할)
         └─ PostsProvider (Firestore 실시간 구독)
```

### Authentication (이중 인증 시스템)

**클라이언트** (`lib/auth.ts`):
- Firebase Auth + Google OAuth
- Lazy 초기화 (SSR 회피)
- `AuthProvider`가 인증 상태, 프로필, 역할 관리
- `AuthGuard` 컴포넌트로 라우트 보호 (optional admin 요구)

**서버** (`lib/auth-admin.ts`):
- `getAuthFromRequest()` - Bearer 토큰 검증
- `getAuthFromApiKey()` - X-API-Key 헤더 검증
- `getAuthFromRequestOrApiKey()` - 두 가지 모두 지원 (API Key 우선)
- `getUserRole()` / `isAdmin()` - Firestore `users` 컬렉션에서 역할 확인

### Data Fetching (이중 전략)

**실시간 구독** (Firestore `onSnapshot`):
- `context/PostsProvider.tsx` - 글 목록 (필터 포함)
- `hooks/useAIWriteRequests.ts` - AI 요청 상태 변경 감지

**TanStack Query** (REST API 기반):
- `hooks/usePostsQuery.ts` - 글 목록 (캐싱)
- `hooks/usePostQuery.ts` - 단건 글 조회
- `hooks/usePostMutations.ts` - CRUD 뮤테이션 (optimistic update)
- `hooks/useAuthFetch.ts` - 인증 토큰 자동 첨부 fetch wrapper

### API Route Error Handling Pattern

모든 API 라우트는 `lib/api-error-handler.ts`의 표준 패턴을 따른다:

```typescript
import { handleApiError, requireAuth, requireResource, requirePermission } from '@/lib/api-error-handler'
import { getAuthFromRequest } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)        // null이면 401 throw
    requireResource(data)    // null/undefined이면 404 throw
    requirePermission(cond)  // false이면 403 throw
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error) // 에러 종류별 표준 JSON 응답
  }
}
```

커스텀 에러 클래스 (`lib/errors.ts`): `AppError` → `ApiError`, `ValidationError`, `AuthError`, `NetworkError`

### Routes (Pages)

- `/` - 글 목록 (상태 필터: draft/published)
- `/posts/[id]` - 글 상세 (HTML 복사 버튼)
- `/posts/[id]/edit` - 글 편집 (분할 뷰 에디터)
- `/products` - 제품 목록 관리
- `/settings` - API 키 관리 및 사용법 안내
- `/admin` - 관리자 대시보드 (통계, 사용자, 콘텐츠)
- `/auth/login` - 로그인
- `/auth/signup` - 회원가입

### API Routes

```
app/api/
├── public/              # 외부 공개 API (X-API-Key 인증)
│   ├── publish/         # 블로그 글 CRUD (POST/GET/PATCH/DELETE)
│   ├── products/        # 제품 CRUD (POST/GET/PATCH/DELETE)
│   ├── ai-requests/     # AI 글 작성 요청 조회/상태 업데이트/삭제 (GET/PATCH/DELETE)
│   ├── validate-key/    # API 키 유효성 검증 (GET)
│   ├── docs/            # API 문서 조회 (GET) - Markdown 반환
│   └── download/        # 이미지 다운로드 프록시 (GET, 인증 불필요)
├── posts/               # 내부용 글 CRUD (Bearer 토큰 인증)
│   ├── route.ts         # GET (목록)
│   └── [id]/route.ts    # GET/PATCH/DELETE (단건)
├── admin/               # 관리자 API (Bearer 토큰 + admin role)
│   ├── contents/        # 전체 콘텐츠 관리
│   ├── stats/           # 통계
│   └── users/           # 사용자 관리
├── ai/                  # AI 기능
│   ├── blog-writer/     # AI 글 작성
│   └── blog-editor/     # AI 글 편집
├── auth/register/       # 회원가입
├── settings/api-key/    # API 키 발급/재발급
└── upload/              # S3 이미지 업로드
```

**내부 vs 외부 API:**
- `api/public/*` - 외부 연동용. `X-API-Key` 헤더 인증
- `api/posts/*`, `api/admin/*` 등 - 프론트엔드 내부용. Firebase Bearer 토큰 인증

### AI Features

**AI 글 작성 플로우:**
1. `AIWriterModal` → POST `/api/ai/blog-writer` → `ai_write_requests` 문서 생성 (status: pending)
2. 외부 AI API가 비동기 처리 후 Firestore 직접 업데이트
3. `useAIWriteRequests` 훅이 onSnapshot으로 완료 감지
4. 완료 시 알림 + 생성된 글 링크

**AI 채팅 편집:**
- `AIChatModal` 컴포넌트
- 서브컬렉션: `blog_posts/{postId}/conversations`
- 기존 글에 대해 AI와 실시간 대화

### Firestore Collections

| 컬렉션 | 설명 | 스키마 정의 |
|--------|------|------------|
| `blog_posts` | 블로그 글 | `lib/firestore.ts` (BlogPost) |
| `products` | 제휴 제품 | `lib/schemas/post.ts` |
| `ai_write_requests` | AI 글 작성 요청 | `lib/schemas/aiRequest.ts` |
| `users` | 사용자 프로필 + API 키 + 역할 | - |
| `blog_posts/{id}/conversations` | AI 채팅 이력 (서브컬렉션) | - |

**인덱스 설정:** `firestore.indexes.json` 참고

### Image Upload

1. 클라이언트 → `/api/upload` (Bearer 토큰 인증)
2. 서버에서 리사이즈/검증 → S3 (`referral-blog-images` 버킷) 업로드
3. S3 퍼블릭 URL 반환 → 글 HTML content에 삽입

## Environment Variables

환경변수는 `.env.local` 파일 참고.

서버 사이드 환경변수는 `next.config.js`의 `env` 속성에서 빌드 시 번들링된다 (FIREBASE, S3 관련).

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

## External API (Public API)

외부 연동용 API는 `/api/public/` 하위에 위치하며, 모든 요청에 `X-API-Key` 헤더가 필수.

### 엔드포인트 목록

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/public/publish` | POST/GET/PATCH/DELETE | 블로그 글 CRUD |
| `/api/public/products` | POST/GET/PATCH/DELETE | 제품 CRUD |
| `/api/public/ai-requests` | GET/PATCH/DELETE | AI 글 작성 요청 조회/상태 업데이트/삭제 |
| `/api/public/validate-key` | GET | API 키 유효성 검증 |
| `/api/public/docs` | GET | API 문서 조회 (Markdown 형식 반환) |
| `/api/public/download` | GET | 이미지 다운로드 프록시 (인증 불필요) |

### 인증

```
X-API-Key: YOUR_API_KEY
```

API 키는 설정 페이지(`/settings`)에서 발급/재발급 가능.

### API 문서 조회

상세 파라미터, 요청/응답 예시는 `/api/public/docs`에서 Markdown으로 조회 가능:

```bash
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/public/docs
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/public/docs?resource=publish
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/public/docs?resource=products
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/public/docs?resource=ai-requests
```

### 문서 파일 위치

API 문서 원본은 `docs/api/` 디렉토리에 Markdown 파일로 관리:
- `docs/api/publish.md` - Publish API 상세 문서
- `docs/api/products.md` - Products API 상세 문서
- `docs/api/ai-requests.md` - AI Requests API 상세 문서

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
