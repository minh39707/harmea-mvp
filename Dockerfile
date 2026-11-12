FROM node:24.22.2-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24.22.2-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
  PORT=3000 \
  HOST=0.0.0.0 \
  UPLOAD_DIR=/app/storage/uploads

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=node:node /app/database ./database
COPY --from=build --chown=node:node /app/scripts/migrate.ts /app/scripts/backfill-lookup.mjs /app/scripts/seed-demo.mjs /app/scripts/migrate-uploads-to-s3.mjs ./scripts/

# Node 24 type stripping runs these operational scripts from their TypeScript sources.
COPY --from=build --chown=node:node /app/apps/api/src/db.ts ./apps/api/src/db.ts
COPY --from=build --chown=node:node /app/apps/api/src/lib/errors.ts /app/apps/api/src/lib/validate.ts ./apps/api/src/lib/
COPY --from=build --chown=node:node /app/apps/api/src/lib/storage ./apps/api/src/lib/storage
COPY --from=build --chown=node:node /app/apps/api/src/modules/catalog/product.ts ./apps/api/src/modules/catalog/
COPY --from=build --chown=node:node /app/apps/api/src/modules/orders/create.ts /app/apps/api/src/modules/orders/lookup.ts /app/apps/api/src/modules/orders/presentation.ts /app/apps/api/src/modules/orders/repository.ts /app/apps/api/src/modules/orders/state.ts /app/apps/api/src/modules/orders/uploads.ts /app/apps/api/src/modules/orders/validation.ts ./apps/api/src/modules/orders/
COPY --from=build --chown=node:node /app/apps/web/src/shared/types.ts ./apps/web/src/shared/types.ts
COPY --from=build --chown=node:node /app/apps/web/src/features/editor/card-svg.ts /app/apps/web/src/features/editor/geometry.ts /app/apps/web/src/features/editor/music-url.ts /app/apps/web/src/features/editor/text-layout.ts /app/apps/web/src/features/editor/validate-design.ts ./apps/web/src/features/editor/

RUN mkdir -p /app/storage && chown node:node /app/storage
VOLUME /app/storage
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "apps/api/dist/server.js"]
