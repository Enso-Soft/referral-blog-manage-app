# Blog Editor App

블로그 콘텐츠를 관리하고 편집하는 웹 애플리케이션입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Editor**: TipTap (WYSIWYG) + Monaco (HTML)
- **Database**: Firebase Firestore
- **Deployment**: Vercel

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local.example`을 참고하여 `.env.local` 파일을 생성합니다:

```bash
cp .env.local.example .env.local
```

Firebase 콘솔에서 웹 앱 설정 정보를 가져와 환경 변수를 설정합니다:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 접속 가능합니다.

## 데이터 마이그레이션

기존 `outputs/` 폴더의 콘텐츠를 Firestore로 마이그레이션:

```bash
# 테스트 실행 (실제 저장 없음)
uv run scripts/migrate.py --dry-run

# 실제 마이그레이션
uv run scripts/migrate.py
```

## 주요 기능

### 글 목록 (/)
- 카드 형태로 글 목록 표시
- 상태 필터 (전체/초안/발행됨)
- 실시간 업데이트 (Firestore onSnapshot)

### 글 상세 (/posts/[id])
- HTML 콘텐츠 미리보기
- **HTML 복사 버튼** - 티스토리/네이버에 붙여넣기
- 수정/삭제 버튼

### 글 수정 (/posts/[id]/edit)
- **WYSIWYG 모드**: TipTap 에디터
  - 텍스트 서식 (굵게, 기울임, 밑줄)
  - 제목 스타일 (H1, H2, H3)
  - 이미지/링크/테이블 삽입
  - 정렬 (왼쪽/가운데/오른쪽)
- **HTML 모드**: Monaco 에디터
  - 구문 강조
  - 자동 완성
- **미리보기 모드**: 렌더링된 결과 확인
- **티스토리 호환성 경고**: 지원되지 않는 태그/스타일 알림

## Firestore 데이터 구조

```
blog_posts/{post_id}
├── title: string
├── content: string (HTML)
├── excerpt: string
├── thumbnail: string (URL)
├── keywords: string[]
├── status: 'draft' | 'published'
├── platform: 'tistory' | 'naver' | 'both'
├── createdAt: timestamp
├── updatedAt: timestamp
└── metadata: {
      originalPath: string
      wordCount: number
    }
```

## Vercel 배포

1. Vercel에서 프로젝트 생성
2. GitHub 저장소 연결
3. 환경 변수 설정 (Settings > Environment Variables)
4. 배포 실행

환경 변수 설정:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

## 프로젝트 구조

```
editor-app/
├── app/
│   ├── layout.tsx          # 공통 레이아웃
│   ├── page.tsx            # 글 목록
│   ├── globals.css         # 전역 스타일
│   └── posts/
│       └── [id]/
│           ├── page.tsx    # 글 상세
│           └── edit/
│               └── page.tsx # 글 수정
├── components/
│   ├── PostList.tsx        # 글 목록 컴포넌트
│   ├── PostCard.tsx        # 글 카드
│   ├── PostViewer.tsx      # HTML 렌더링
│   ├── PostEditor.tsx      # 에디터 래퍼 (탭 전환)
│   ├── TiptapEditor.tsx    # WYSIWYG 에디터
│   ├── HtmlCodeEditor.tsx  # Monaco HTML 에디터
│   └── CopyButton.tsx      # HTML 복사 버튼
├── lib/
│   ├── firebase.ts         # Firebase 설정
│   └── firestore.ts        # Firestore CRUD
├── hooks/
│   ├── usePosts.ts         # 글 목록 Hook
│   └── usePost.ts          # 단일 글 Hook
└── scripts/
    └── migrate.py          # 마이그레이션 스크립트
```
