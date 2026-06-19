# referral-blog-manage-app (Next.js 15 SSR) 프로덕션 이미지
# 빌드타임에 .env 가 필요하다 (next.config.js 의 env 블록 + NEXT_PUBLIC_* 가 번들에 인라인됨).
# Next.js 가 프로젝트 루트의 .env 를 자동 로드하므로 빌드 컨텍스트에 .env 가 포함되어야 한다.
FROM node:22-slim AS base
WORKDIR /app

# --- 의존성 설치 (devDeps 포함: next build 에 typescript 등 필요) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- 빌드 ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# .env 가 없으면 빌드 실패 → 배포 전 반드시 .env 채울 것
RUN test -f .env || (echo "ERROR: .env 파일이 필요합니다 (빌드타임 환경변수)" && exit 1)
RUN npm run build

# --- 런타임 (next start) ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.js ./next.config.js
# 런타임에도 서버사이드 env (FIREBASE_PRIVATE_KEY, AI_EDITOR_API_URL, LANDING_DOMAINS 등) 가 필요
COPY --from=build /app/.env ./.env
EXPOSE 3000
CMD ["npm", "start"]
