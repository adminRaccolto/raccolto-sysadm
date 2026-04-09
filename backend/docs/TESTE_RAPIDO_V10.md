# Raccolto v10 — teste rápido

## Objetivo desta versão
- reduzir a escala geral do frontend
- permitir upload real da logo da empresa
- expor base visual e cadastral para multiempresa

## Backend
```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

## Frontend
```bash
cp .env.example .env
npm install
npm run dev
```

## Testes principais
1. Sistema & Suporte -> enviar logo da empresa
2. conferir a logo no canto superior esquerdo
3. conferir se o frontend ficou mais compacto
4. cadastrar nova empresa na base multiempresa
5. visualizar a listagem de empresas cadastradas
