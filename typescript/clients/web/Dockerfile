FROM node:23-alpine

WORKDIR /app

# Install dependencies for node-gyp support for installing bufferutil
RUN apk add --no-cache python3 make g++

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files first
COPY package.json pnpm-lock.yaml ./
RUN pnpm i --no-frozen-lockfile

# Copy all project files
COPY . .

# Explicitly ensure public directory files are present and list them for debugging
RUN ls -la public/ && \
    echo "Checking for WASM files:" && \
    ls -la public/*.wasm public/*.zkey || echo "WASM/zkey files not found"

EXPOSE 3000
ENTRYPOINT ["pnpm", "dev"]