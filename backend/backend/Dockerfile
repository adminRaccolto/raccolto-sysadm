FROM node:22-alpine
WORKDIR /app

COPY backend/package*.json ./
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/prisma.config.ts ./
COPY backend/prisma/ ./prisma/
COPY backend/src/ ./src/

RUN npm ci --include=dev

ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate

RUN npx tsc -p tsconfig.build.json && ls dist/src/main.js

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main.js"]
