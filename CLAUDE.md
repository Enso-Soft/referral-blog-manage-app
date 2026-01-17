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

### Firestore Collection
Collection: `blog_posts`
```typescript
interface BlogPost {
  title: string
  content: string      // HTML content
  excerpt: string
  thumbnail: string
  keywords: string[]
  status: 'draft' | 'published'
  platform: 'tistory' | 'naver' | 'both'
  createdAt: Timestamp
  updatedAt: Timestamp
  metadata: { originalPath?: string; wordCount: number }
}
```

## Environment Variables

Required `NEXT_PUBLIC_*` Firebase config variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Path Aliases

`@/*` maps to project root (configured in tsconfig.json)
