# syntax=docker/dockerfile:1
# Build the TypeScript API and native SQLite dependency using Node 20 Alpine.
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
# The supplied backend does not include a lockfile. Prefer npm ci when one is added.
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
# Required by the native better-sqlite3 module on Alpine.
RUN apk add --no-cache libstdc++ \
    && mkdir -p /app/data \
    && chown -R node:node /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
# npm run seed uses tsx src/seed-cli.ts in the existing package.json.
COPY --from=build --chown=node:node /app/src ./src
USER node
EXPOSE 3000
# Seed is safe on repeat launches: it inserts only if the movies table is empty.
CMD ["sh", "-c", "npm run seed && exec node dist/src/server.js"]
