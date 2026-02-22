# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blog Editor App — a web application for managing and editing blog content. Provides HTML export for Tistory/Naver platforms, WordPress publishing, Threads SNS sharing, AI-powered writing/editing, SEO analysis, and affiliate product management.

No separate backend server — Firebase Firestore serves as BaaS, and Next.js API Routes handle all server-side logic.

## Tech Stack

- **Framework**: Next.js 15 (App Router) — all pages are `'use client'` (CSR-only, no SSR)
- **Language**: TypeScript 5.9 (strict mode, `moduleResolution: "bundler"`)
- **UI**: shadcn/ui (New York style) + Radix UI primitives + CVA (class-variance-authority)
- **Styling**: Tailwind CSS v4 (CSS-first config in `globals.css`, no `tailwind.config.ts`) + framer-motion (animations)
- **Editor**: Monaco (`@monaco-editor/react`, dynamic import + `ssr: false`)
- **Database**: Firebase Firestore (Client SDK v12 + Admin SDK v13)
- **Auth**: Firebase Auth (Google OAuth)
- **State**: TanStack Query v5 (caching/mutations) + Firestore onSnapshot (realtime)
- **Validation**: Zod v4 (runtime type validation + type inference)
- **Storage**: AWS S3 (image upload via `@aws-sdk/client-s3` + `sharp` for resize/WebP)
- **Deployment**: AWS Amplify

## Commands

```bash
npm run dev      # Dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Production server
```

### Build Caveats

`npm run build` overwrites the `.next` folder, which conflicts with the dev server.

**Build procedure:**
1. Stop `npm run dev` first if running (Ctrl+C)
2. Run `npm run build`
3. Restart dev server with `npm run dev` after build completes

## Architecture

### Server/Client Boundary (`server-only`)

Server-only files use `import 'server-only'` to prevent accidental client-side imports (build error if violated):

| File | Server-only reason |
|------|-------------------|
| `lib/crypto.ts` | Node.js `crypto` module |
| `lib/firebase-admin.ts` | `firebase-admin` SDK |
| `lib/auth-admin.ts` | `firebase-admin/auth` |
| `lib/api-helpers.ts` | `firebase-admin` + `crypto` |
| `lib/env.ts` | Server environment variable validation |
| `lib/file-validation.ts` | `Buffer` (Node.js) |
| `lib/logger.ts` | Server-only logging |

**Important**: `lib/wordpress-api.ts` is a mixed file — data normalization functions (`normalizeWordPressData`, `getOverallWPStatus`) are used by client components, while API call functions (`createWPPost`, `validateWPConnection`) are used by API routes. Do NOT add `server-only` to this file. Use `getDecryptedWPConnection()` from `lib/api-helpers.ts` instead of `getWPConnectionFromUserData()` in API routes to handle password decryption.

### WordPress App Password Encryption

WordPress app passwords are encrypted with AES-256-GCM before storing in Firestore.

- `lib/crypto.ts` — `encrypt()`, `decrypt()`, `isEncrypted()` (prefix: `enc:iv:authTag:ciphertext`)
- **Encrypt on save**: `app/api/settings/wordpress/route.ts` — POST handler + `migrateIfNeeded`
- **Decrypt on read**: `lib/api-helpers.ts` — `getDecryptedWPConnection()` wraps `getWPConnectionFromUserData()` + `decrypt()`
- **Backward compatible**: `decrypt()` returns plaintext as-is if not `enc:`-prefixed (legacy data)
- Env var: `WP_ENCRYPTION_KEY` (32-byte hex, 64 chars)

### Provider Hierarchy

Global providers are wrapped in `components/layout/Providers.tsx`. Order matters:

```
QueryProvider (TanStack Query)
└─ ThemeProvider (next-themes)
   └─ ErrorBoundary
      └─ AuthProvider (Firebase Auth state, user profile, roles)
         └─ PostsProvider (Firestore realtime subscription)
```

### Component Folder Structure

Components are organized by domain:

```
components/
├── ai/          # AIChatModal, AIWriterModal, AIRequestCard
├── common/      # FloatingActionMenu, SlidePanel, Snackbar, QueryProvider
├── layout/      # AuthGuard, AuthProvider, Header, Providers, ThemeProvider
├── post/        # PostCard, PostEditor, PostViewer, CopyButton, HtmlCodeEditor
├── product/     # ProductCard, ProductCombobox, ProductEditor
├── seo/         # SeoAnalysisView, SeoBadges, TrendChart
├── threads/     # ThreadsSection
├── ui/          # shadcn/ui atomic components (Button, Dialog, Input, Sheet, etc.)
└── wordpress/   # WordPressPanel, WPCategoryTree, WPPublishProgress, wp-helpers.ts
```

### Tailwind v4 Configuration

No `tailwind.config.ts` — all config is in `app/globals.css` using CSS-first approach:

```css
@import 'tailwindcss';
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));
```

Color tokens are defined as CSS Custom Properties (HSL) in `@layer base` (`:root` and `.dark`).

### Authentication (Dual Auth System)

**Client** (`lib/auth.ts`):
- Firebase Auth + Google OAuth
- Lazy initialization (avoids SSR issues)
- `AuthProvider` manages auth state, profile, and roles
- `AuthGuard` component protects routes (optional admin requirement)

**Server** (`lib/auth-admin.ts`):
- `getAuthFromRequest()` — Bearer token verification
- `getAuthFromApiKey()` — X-API-Key header verification
- `getAuthFromRequestOrApiKey()` — supports both (API Key takes priority)
- `getUserRole()` / `isAdmin()` — checks role from Firestore `users` collection (in-memory cache, TTL 5min)

### Data Fetching (Dual Strategy)

**Realtime subscriptions** (Firestore `onSnapshot`):
- `context/PostsProvider.tsx` — post list (with filters, pagination)
- `hooks/useAIWriteRequests.ts` — detects AI request status changes

**TanStack Query** (REST API-based):
- `hooks/usePostQuery.ts` — single post query
- `hooks/usePostMutations.ts` — CRUD mutations (optimistic updates)
- `hooks/useAuthFetch.ts` — fetch wrapper with auto-attached auth token
- Cache keys centralized in `lib/query-client.ts` (`queryKeys` constant)

### API Route Error Handling Pattern

All API routes follow the standard pattern from `lib/api-error-handler.ts`:

```typescript
import { handleApiError, requireAuth, requireResource, requirePermission } from '@/lib/api-error-handler'
import { getAuthFromRequest } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)        // throws 401 if null
    requireResource(data)    // throws 404 if null/undefined
    requirePermission(cond)  // throws 403 if false
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error) // standardized JSON response per error type
  }
}
```

Custom error classes (`lib/errors.ts`): `AppError` → `ApiError`, `ValidationError`, `AuthError`, `NetworkError`

### Shared API Route Helpers (`lib/api-helpers.ts`)

- `getOwnedDocument(collection, docId, auth)` — Firestore doc fetch + ownership check (404/403)
- `requireOwnership(data, auth)` — ownership-only check
- `getDecryptedWPConnection(userData, siteId?)` — `getWPConnectionFromUserData()` + password decryption

### Middleware (`middleware.ts`)

Edge middleware applies CORS headers to `/api/public/*` routes only. Internal API routes have no CORS (same-origin only).

### Routes (Pages)

- `/` — Post list (status filter: draft/published)
- `/posts/[id]` — Post detail (HTML copy button)
- `/posts/[id]/edit` — Post editor (split-view editor)
- `/products` — Product list management
- `/settings` — API key management, WordPress connection, Threads connection
- `/admin` — Admin dashboard (stats, users, content)
- `/auth/login` — Login
- `/auth/signup` — Sign up

### API Routes

```
app/api/
├── public/              # External API (X-API-Key auth)
│   ├── publish/         # Blog post CRUD (POST/GET/PATCH/DELETE)
│   ├── products/        # Product CRUD (POST/GET/PATCH/DELETE)
│   ├── ai-requests/     # AI write request query/status update/delete (GET/PATCH/DELETE)
│   ├── validate-key/    # API key validation (GET)
│   ├── docs/            # API docs (GET) - returns Markdown
│   └── download/        # Image download proxy (GET, no auth required)
├── posts/               # Internal post CRUD (Bearer token auth)
│   ├── route.ts         # GET (list)
│   └── [id]/route.ts    # GET/PATCH/DELETE (single)
├── admin/               # Admin API (Bearer token + admin role)
│   ├── contents/        # All content management
│   ├── stats/           # Statistics
│   └── users/           # User management
├── ai/                  # AI features
│   ├── blog-writer/     # AI post writing
│   └── blog-editor/     # AI post editing
├── wordpress/           # WordPress integration
│   ├── publish/         # WP post publish/update/delete/get (POST/PATCH/DELETE/GET)
│   ├── categories/      # WP category list (GET)
│   ├── tags/            # WP tag list/create (GET/POST)
│   └── detect/          # WP site detection (POST)
├── threads/
│   └── publish/         # Threads post publish (POST)
├── settings/
│   ├── api-key/         # API key issue/reissue
│   ├── wordpress/       # WP connection management (POST/GET/DELETE)
│   └── threads-token/   # Threads OAuth token management (POST/GET/DELETE/PATCH)
├── auth/register/       # User registration
└── upload/              # S3 image upload
```

**Internal vs External API:**
- `api/public/*` — for external integrations. Authenticated via `X-API-Key` header
- `api/posts/*`, `api/admin/*`, etc. — for frontend internal use. Authenticated via Firebase Bearer token

### AI Features

**AI Post Writing Flow:**
1. `AIWriterModal` → POST `/api/ai/blog-writer` → creates `ai_write_requests` document (status: pending)
2. External AI API processes asynchronously and updates Firestore directly
3. `useAIWriteRequests` hook detects completion via onSnapshot
4. On completion: notification + link to generated post

**AI Chat Editing:**
- `AIChatModal` component
- Subcollection: `blog_posts/{postId}/conversations`
- Real-time conversation with AI about an existing post

### WordPress Publishing

Publish, update, and delete posts to WordPress directly from the edit page. Supports multiple WordPress sites per user.

**Architecture:**
- `lib/wordpress-api.ts` — WordPress REST API client (publishing, image migration, category/tag management) + data normalization (client-safe)
- `components/wordpress/WordPressPanel.tsx` — Publishing UI (inside SlidePanel)
- Connection info stored in Firestore `users.wpSites` map (keyed by siteId)
- App passwords encrypted with AES-256-GCM (`lib/crypto.ts`)

**Multi-site data structure:**
- `users.wpSites.{siteId}` — `{ siteUrl, username, appPassword (encrypted), displayName, connectedAt }`
- `blog_posts.wordpress.sites.{siteId}` — per-site publish state (`wpPostId`, `postStatus`, etc.)
- Legacy flat fields (`wpSiteUrl`, `wpUsername`, `wpAppPassword`) auto-migrated to `wpSites` map

**Publishing Flow:**
1. Connect WordPress site on settings page (Application Password auth)
2. Edit page → FloatingActionMenu → open WordPress panel
3. Select categories/tags/SEO options and publish
4. Automatic image migration: S3 URLs → WordPress Media Library
5. Publish history recorded in `blog_posts.wordpress.publishHistory`

**Key Features:**
- Scheduled publishing (future posts), comment settings, featured image
- Update/delete existing WP posts, sync status check

### Threads Publishing

Share blog post summaries to Threads SNS.

**Architecture:**
- `lib/threads-api.ts` — Threads Graph API client (profile retrieval, container creation, publishing)
- `components/threads/ThreadsSection.tsx` — Threads content editor UI (inside SlidePanel)
- OAuth token stored in Firestore `users` collection (`threadsAccessToken`, `threadsTokenExpiresAt`, `threadsUserId`)

**Publishing Flow:**
1. Register Threads OAuth token on settings page (60-day expiry, refreshable)
2. Edit page → FloatingActionMenu → open Threads panel
3. Write body (500-char limit) + hashtags + link/image, then publish
4. Publish status saved in `blog_posts.threads` (`not_posted` / `posted` / `failed`)

### SEO Analysis

Keyword research results from AI writing are saved in `blog_posts.seoAnalysis`.

**Analysis Fields** (`lib/schemas/post.ts` — `SeoAnalysisSchema`):
- Keyword candidate comparison (`keywordCandidates`) — volume, competition, CTR comparison table
- Trend time series (`trendData`) — monthly search volume chart
- SERP competitor analysis (`serpCompetitors`) — top search result blog analysis
- Blog competition (`blogCompetition`) — attackability, strategy suggestions
- Search intent (`searchIntent`) — informational/commercial/navigational intent ratios
- Shopping data (`shoppingData`) — price range, product count (for product reviews)
- Title options (`titleOptions`) — CTR-optimized title recommendations

**Visualization:** `components/seo/SeoAnalysisView.tsx` — renders analysis results on post detail page

### Firestore Collections

| Collection | Description | Schema Definition |
|---|---|---|
| `blog_posts` | Blog posts | `lib/schemas/post.ts` (BlogPost) |
| `products` | Affiliate products | `lib/schemas/post.ts` |
| `ai_write_requests` | AI writing requests | `lib/schemas/aiRequest.ts` |
| `users` | User profile + API key + role + WP/Threads connection info | `lib/schemas/user.ts` |
| `blog_posts/{id}/conversations` | AI chat history (subcollection) | — |

**BlogPost Notable Fields:**
- `seoAnalysis` — SEO keyword research analysis results
- `threads` — Threads publish status/content (`ThreadsContentSchema`)
- `wordpress` — WordPress publish status/settings/history (`WordPressContentSchema`)
  - `wordpress.sites.{siteId}` — per-site publish data (multi-site support)
  - `wordpress.publishHistory` — publish/update/delete history array

**users Collection Integration Fields:**
- WordPress: `wpSites.{siteId}.{ siteUrl, username, appPassword (encrypted), displayName, connectedAt }`
- Threads: `threadsAccessToken`, `threadsTokenExpiresAt`, `threadsUserId`, `threadsUsername`

**Index configuration:** see `firestore.indexes.json`

### Modal / Bottom Sheet Pattern

- **Custom modal** (`createPortal` + Framer Motion, `z-50`) — primary task UIs. Centered on all screen sizes. See `AIWriterModal.tsx`.
- **`responsive-dialog`** (`components/ui/responsive-dialog.tsx`, `z-50`) — yes/no confirmations only. Mobile: bottom sheet. Desktop: centered popup. See `WPConfirmModals.tsx`.

> Both use `z-50`. Do NOT use higher z-index on custom modals — `responsive-dialog` will render behind it. Stacking is determined by DOM mount order.

### Editor Page UI Architecture

UI structure of the post edit page (`/posts/[id]/edit`):

- `PostEditor` — Main editor (split view: Monaco code editor + HTML preview)
- `FloatingActionMenu` — Bottom-right FAB menu (toggles AI Chat, WordPress, Threads panels)
- `SlidePanel` — Right slide-in panel (WordPress/Threads content)
- `DisclaimerButtons` — Auto-insert affiliate disclaimer buttons (Naver Shopping/Coupang Partners)
- `SeoAnalysisView` — SEO analysis result visualization

### Image Upload

1. Client → `/api/upload` (Bearer token auth)
2. Server validates magic bytes (`lib/file-validation.ts`) + resizes with `sharp` → uploads to S3
3. Returns S3 public URL → inserted into post HTML content
4. On WordPress publishing, S3 images are auto-migrated to WP Media Library

## Environment Variables

See `.env.local` for environment variables.

Server-side env vars are bundled at build time via the `env` property in `next.config.js` (Firebase, S3, WP_ENCRYPTION_KEY).

### Amplify Deployment Env Var Caveat

**Important**: When adding new server-side environment variables, you must configure them in **three places**:

1. **`next.config.js`** → `env` object (build-time bundling)
2. **Amplify Console** → Environment variables
3. **`amplify.yml`** build commands:
```yaml
build:
  commands:
    - echo "NEW_ENV_VAR=$NEW_ENV_VAR" >> .env.production
    - npm run build
```

If not added to `amplify.yml`, the variable won't be included in `.env.production` during build, making it unreadable from API Routes.

## Path Aliases

`@/*` maps to project root (configured in tsconfig.json)

## External API (Public API)

External integration APIs are located under `/api/public/`. All requests require the `X-API-Key` header.

### Endpoints

| Endpoint | Methods | Description |
|---|---|---|
| `/api/public/publish` | POST/GET/PATCH/DELETE | Blog post CRUD |
| `/api/public/products` | POST/GET/PATCH/DELETE | Product CRUD |
| `/api/public/ai-requests` | GET/PATCH/DELETE | AI write request query/status update/delete |
| `/api/public/validate-key` | GET | API key validation |
| `/api/public/docs` | GET | API docs (returns Markdown) |
| `/api/public/download` | GET | Image download proxy (no auth required) |

### Authentication

```
X-API-Key: YOUR_API_KEY
```

API keys can be issued/reissued on the settings page (`/settings`).

### API Documentation

Detailed parameters and request/response examples are available as Markdown from `/api/public/docs`:

```bash
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/public/docs
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/public/docs?resource=publish
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/public/docs?resource=products
curl -H "X-API-Key: YOUR_API_KEY" https://your-app.vercel.app/api/public/docs?resource=ai-requests
```

### Documentation File Locations

API documentation source files are managed as Markdown in the `docs/api/` directory:
- `docs/api/publish.md` — Publish API detailed docs
- `docs/api/products.md` — Products API detailed docs
- `docs/api/ai-requests.md` — AI Requests API detailed docs

## Blog HTML Authoring Guide (Dark Mode Support)

Follow these rules to ensure text is visible in Tistory/Naver dark mode.

### Core Principle

| Area | color property | Reason |
|------|---------------|--------|
| Plain text (no background) | **Do not set** | Inherits light color in dark mode |
| Inside light background box | `color: #333 !important` | Ensures readability on light background |
| Inside dark background box | `color: white` or `#dddddd` | Ensures readability on dark background |

### Light Background Boxes (must use `!important`)

```html
<!-- Set color on div -->
<div style="background: #f8f9fa; color: #333 !important; ...">

<!-- Also set color on ul/ol -->
<ul style="color: #333 !important; ...">
  <li>Content</li>
</ul>
```

Light background colors: `#f8f9fa`, `#fafafa`, `#e8f5e9`, `#fff3e0`, `#e3f2fd`, `linear-gradient(135deg, #f...)`

### Dark Background Boxes

```html
<div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); color: white; ...">
  <p style="color: #dddddd;">Text</p>
</div>
```

### Plain Body Text (No Background)

```html
<!-- Do NOT set color -->
<p style="font-size: 17px; line-height: 1.9; margin-bottom: 20px;">
  Plain body text should not have a color property.
</p>
```

### Tables

Handle tables on a per-row basis:

| Row Type | Treatment |
|----------|-----------|
| Light background row (`#f7fafc`, `#ebf8ff`, etc.) | Add `color: #333 !important` to all `<td>` |
| No background row | Remove `color` (let it inherit) |
| Header row (dark background) | Keep `color: white` |

```html
<!-- Light background row: color required -->
<tr style="background: #f7fafc;">
  <td style="padding: 14px; color: #333 !important;">Item</td>
  <td style="padding: 14px; color: #333 !important;">Content</td>
</tr>

<!-- No background row: remove color -->
<tr>
  <td style="padding: 14px;">Item</td>
  <td style="padding: 14px;">Content</td>
</tr>

<!-- Header (dark background): keep color white -->
<tr style="background: #4299e1; color: white;">
  <th>Title</th>
</tr>
```

Light background colors: `#f7fafc`, `#ebf8ff`, `#f0fff4`, `#fff5f5`, `#fffaf0`

### Warning: Areas Without Background

In Q&A sections, plain body text, or **any area without a background**, never add `color: #333`.
→ Dark mode: dark background + dark text = invisible

```html
<!-- Wrong -->
<p style="color: #333; line-height: 1.9;">Answer text</p>

<!-- Correct -->
<p style="line-height: 1.9;">Answer text</p>
```

### Checklist

- [ ] Light background div → add `color: #333 !important`
- [ ] ul/ol inside light background → add `color: #333 !important`
- [ ] **Areas without background** → remove `color` (let it inherit)
- [ ] Dark background → use `color: white` or light colors
