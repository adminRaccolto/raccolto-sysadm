FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
COPY src/ ./src/

RUN npm ci

ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --config prisma.config.ts --accept-data-loss 2>&1 || echo '[warn] prisma db push falhou — continuando'; node dist/src/main.js"]
