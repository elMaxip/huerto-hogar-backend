# Una sola imagen por destino:
#   runtime -> los 4 servicios (gateway, users, products, auth); el comando elige cuál
#   migrate -> ejecuta migraciones y seeds una vez y termina
ARG NODE_VERSION=22.23.4

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV CI=true
RUN npm install -g pnpm@11.5.0
WORKDIR /app

# Todas las dependencias (build, migraciones y seeds con ts-node)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Solo dependencias de producción para la imagen final
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM deps AS build
COPY . .
RUN for app in huerto-hogar-backend users-service products-service auth-service; do \
      pnpm exec nest build "$app" || exit 1; \
    done

FROM deps AS migrate
COPY . .
RUN mkdir -p uploads && chown node:node uploads
USER node
CMD ["sh", "docker/migrate.sh"]

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
CMD ["node", "dist/apps/huerto-hogar-backend/main.js"]
