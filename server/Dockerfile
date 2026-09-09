# Campus Connect V2 API
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# openssl is needed by Prisma's query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
COPY docker-entrypoint.sh ./
RUN npx prisma generate \
  && chmod +x docker-entrypoint.sh \
  && useradd --system --uid 1001 appuser \
  && mkdir -p uploads && chown -R appuser uploads
USER appuser
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
