# syntax=docker/dockerfile:1
# Public browser configuration is provided by an ephemeral BuildKit secret.
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
RUN --mount=type=secret,id=build_env,target=/app/.env,required=true npm run build

# --- 런타임 (next start) ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.js ./next.config.js
USER node
EXPOSE 3000
CMD ["npm", "start"]
