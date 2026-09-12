# Production Dockerfile for Shuayb Agency Private Backend (Google Cloud Run)
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm install --only=production --ignore-scripts

# Frontend assets are kept in dist/; backend bundle is kept separately.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server-dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

CMD ["node", "server-dist/server.cjs"]
