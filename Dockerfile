FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

FROM base AS deps

RUN npm ci
RUN npx prisma generate

FROM deps AS build

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ARG APP_VERSION=unknown

ENV NODE_ENV=production
ENV PORT=3000
ENV APP_VERSION=$APP_VERSION

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     openssl \
     chromium \
     fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# Wrapper that injects sandbox + resource flags into every Puppeteer launch
RUN printf '#!/bin/sh\nexec /usr/bin/chromium \\\n  --no-sandbox \\\n  --disable-setuid-sandbox \\\n  --disable-dev-shm-usage \\\n  --disable-gpu \\\n  --no-zygote \\\n  --disable-extensions \\\n  "$@"\n' \
    > /usr/local/bin/chromium-wrapper \
  && chmod +x /usr/local/bin/chromium-wrapper

ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chromium-wrapper

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:deploy && node dist/index.js"]
