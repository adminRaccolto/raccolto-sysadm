FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/

RUN npm ci

RUN npx prisma generate --config prisma.config.ts

COPY src/ ./src/

RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy --config prisma.config.ts && node dist/main"]
