# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including devDependencies for build)
RUN yarn install --frozen-lockfile --ignore-scripts

# Copy source files
COPY src/ ./src/
COPY bin/ ./bin/

# Build the project
RUN yarn run prepare

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files from builder (ncc bundles all dependencies)
COPY --from=builder /app/dist/ ./dist/

# Create a directory for mounting files to validate
RUN mkdir /workdir
WORKDIR /workdir

# Set the entrypoint to the validator
ENTRYPOINT ["node", "/app/dist/index.js"]

# Default to showing help (no args will validate current directory)
CMD []
