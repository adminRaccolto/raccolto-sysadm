FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/

RUN npm ci

# URL fictícia só para o prisma generate (não conecta ao banco, apenas lê o schema)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate

COPY src/ ./src/

RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main"]
