FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
COPY src/ ./src/
COPY premigrate.js ./

RUN npm ci

ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "node premigrate.js && npx prisma db push --accept-data-loss && node dist/src/main.js"]
