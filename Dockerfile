# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN ODK_LAST_RESTORE_DRILL_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
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
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

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
