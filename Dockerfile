FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy the package.json and pnpm-lock.yaml files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY next.config.mjs ./
RUN npm install -g pnpm

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SKIP_PRO_CHECK
ARG NEXT_PUBLIC_GITHUB_APP_NAME
ARG NEXT_PUBLIC_CONVERSATION_BASE_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_POTPIE_PLUS_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUBSCRIPTION_BASE_URL
ARG NEXT_PUBLIC_HMAC_SECRET_KEY
ARG NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID
ARG NEXT_PUBLIC_FORMBRICKS_API_HOST
ARG NEXT_PUBLIC_WORKFLOWS_URL

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_SKIP_PRO_CHECK=$NEXT_PUBLIC_SKIP_PRO_CHECK
ENV NEXT_PUBLIC_GITHUB_APP_NAME=$NEXT_PUBLIC_GITHUB_APP_NAME
ENV NEXT_PUBLIC_CONVERSATION_BASE_URL=$NEXT_PUBLIC_CONVERSATION_BASE_URL
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POTPIE_PLUS_URL=$NEXT_PUBLIC_POTPIE_PLUS_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUBSCRIPTION_BASE_URL=$NEXT_PUBLIC_SUBSCRIPTION_BASE_URL
ENV NEXT_PUBLIC_HMAC_SECRET_KEY=$NEXT_PUBLIC_HMAC_SECRET_KEY
ENV NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID=$NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID
ENV NEXT_PUBLIC_FORMBRICKS_API_HOST=$NEXT_PUBLIC_FORMBRICKS_API_HOST
ENV NEXT_PUBLIC_WORKFLOWS_URL=$NEXT_PUBLIC_WORKFLOWS_URL

ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]

