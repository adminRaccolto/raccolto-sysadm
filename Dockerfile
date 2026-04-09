# ──────────────────────────────────────────────
# Raccolto API — Dockerfile de produção
# ──────────────────────────────────────────────

FROM node:22-alpine AS builder
WORKDIR /app

# Dependências
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
RUN npm ci

# Gera Prisma Client
RUN npx prisma generate --config prisma.config.ts

# Build NestJS
COPY src/ ./src/
RUN npm run build

# ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Instala apenas produção + ts-node (necessário para prisma.config.ts)
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
RUN npm ci --omit=dev && npm install ts-node tsconfig-paths

# Copia build e cliente Prisma gerado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

# Roda migrations e sobe a API
CMD ["sh", "-c", "npx prisma migrate deploy --config prisma.config.ts && node dist/main"]
