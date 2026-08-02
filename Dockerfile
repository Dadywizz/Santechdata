FROM node:24-slim

# Install pnpm
RUN npm install -g pnpm@10.26.1

WORKDIR /app

# Copy workspace config files first (for layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/santech-data/package.json ./artifacts/santech-data/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/ 2>/dev/null || true

# Install all dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy full source
COPY . .

# Build frontend then API
RUN pnpm --filter @workspace/santech-data run build && \
    pnpm --filter @workspace/api-server run build

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
