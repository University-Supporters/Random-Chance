# 1. 빌드 단계
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2. 실행 단계
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/api ./api

# 데이터 저장 디렉토리 생성
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
