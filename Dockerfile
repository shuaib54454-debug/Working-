FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN apt-get update \\
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng \\
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
EXPOSE 8080
CMD ["node", "dist/server.cjs"]