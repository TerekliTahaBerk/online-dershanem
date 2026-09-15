# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
# `postinstall` Prisma Client'ı üretir; şema ve config'i `npm ci`'dan önce kopyala.
COPY prisma.config.ts ./
COPY lib/prisma-env.ts ./lib/prisma-env.ts
COPY prisma/schema ./prisma/schema
RUN npm ci

FROM base AS builder
# Build kimliği: CI bunları `--build-arg` ile geçer, `next.config.ts` artefaktın
# içine gömer. Geçilmezse imaj "bilinmiyor" der — sessizce yanlış SHA raporlamaz.
ARG BUILD_SHA=""
ARG BUILD_REF=""
ARG BUILD_RELEASE=""
ARG BUILD_VERSION=""
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN APP_BUILD_SHA="$BUILD_SHA" \
    APP_BUILD_REF="$BUILD_REF" \
    APP_BUILD_RELEASE="$BUILD_RELEASE" \
    APP_BUILD_VERSION="${BUILD_VERSION:-$(node -p "require('./package.json').version")}" \
    APP_BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    ODK_LAST_RESTORE_DRILL_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    VERCEL_ENV=production \
    DATABASE_URL="postgresql://user:pass@localhost:5432/build?schema=public" \
    DIRECT_URL="postgresql://user:pass@localhost:5432/build?schema=public" \
    NEXT_PUBLIC_APP_URL="http://localhost:3000" \
    NEXTAUTH_SECRET="container-build-only-secret-0123456789abcdef0123456789abcdef" \
    PANEL_ENABLED=true \
    CRON_SECRET="container-build-only-cron-0123456789abcdef0123456789abcdef" \
    BLOB_READ_WRITE_TOKEN="vercel_blob_rw_container_build_only" \
    RESEND_API_KEY="re_container_build_only" \
    EMAIL_MODE=receipts \
    ODK_ROLLOUT_MODE=general \
    ODK_PILOT_KILL_SWITCH=false \
    ODK_PILOT_ACCEPTANCE_APPROVED=true \
    ODK_PILOT_SECURITY_REVIEW_APPROVED=true \
    ODK_PILOT_OPERATIONS_APPROVED=true \
    npm run build

FROM base AS runner
ARG BUILD_SHA=""
ARG BUILD_REF=""
ARG BUILD_RELEASE=""
ARG BUILD_VERSION=""
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# Gömülü değerlerle aynı; `docker inspect` ve runtime `process.env` de görsün.
ENV APP_BUILD_SHA=$BUILD_SHA \
    APP_BUILD_REF=$BUILD_REF \
    APP_BUILD_RELEASE=$BUILD_RELEASE \
    APP_BUILD_VERSION=$BUILD_VERSION
LABEL org.opencontainers.image.revision=$BUILD_SHA \
      org.opencontainers.image.version=$BUILD_VERSION

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health/live || exit 1

CMD ["node", "server.js"]
