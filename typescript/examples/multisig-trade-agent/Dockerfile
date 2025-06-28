# Build stage - Context should be the typescript/ directory
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git && \
    npm install -g pnpm@10.7.0

# Copy everything
# The build context is the entire typescript/ directory to support pnpm workspaces
COPY . .

# Install all dependencies
# This creates symlinks between workspace packages as pnpm normally does
RUN pnpm install --frozen-lockfile

# Build only the necessary workspace packages
# The "..." suffix tells pnpm to build multisig-trade-agent and all its dependencies
RUN pnpm --filter multisig-trade-agent... build

# Deploy the specific package with its dependencies
# pnpm deploy creates a production-ready bundle without symlinks, perfect for Docker
RUN pnpm config set force-legacy-deploy true && \
    pnpm --filter=multisig-trade-agent deploy --prod deploy-output

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S ember && \
    adduser -S ember -u 1001

# Copy the deployed application
# The deploy-output directory contains a self-contained application with all dependencies
COPY --from=builder /app/deploy-output /app

WORKDIR /app

# Change ownership to non-root user
RUN chown -R ember:ember /app

# Switch to non-root user
USER ember

# Expose port for SSE MCP server
EXPOSE 3011

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Multisig Trade agent
CMD ["node", "dist/index.js"] 