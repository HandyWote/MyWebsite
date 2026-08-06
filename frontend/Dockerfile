FROM node:22-alpine AS deps

WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1

COPY frontend/package*.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_INTERNAL_URL=http://backend:5000
ARG PUBLIC_SITE_URL=http://localhost:4419
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL

COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./
COPY contracts/ /app/contracts/
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

RUN mkdir -p .next/cache && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
