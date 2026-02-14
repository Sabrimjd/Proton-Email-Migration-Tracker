# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    libgcc-s1 \
    && rm -rf /var/lib/apt/lists/*

# Copy built files (standalone output includes public)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create data directory for SQLite (no specific ownership - will use docker user)
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run via node directly - user set via docker-compose
CMD ["node", "server.js"]
