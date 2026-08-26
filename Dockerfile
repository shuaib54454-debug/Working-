# Production Dockerfile for Shuayb Agency Private Backend (Google Cloud Run)
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Compile frontend and backend bundle (dist/ and dist/server.cjs)
RUN npm run build

# Production runner stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy production package specifications and install production-only modules
COPY package*.json ./
RUN npm install --only=production --ignore-scripts

# Copy compiled production artifacts and public assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

# Start compiled server
CMD ["node", "dist/server.cjs"]
