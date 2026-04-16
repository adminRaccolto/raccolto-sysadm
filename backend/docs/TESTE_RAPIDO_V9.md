# Raccolto v9 — teste rápido

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

## Pontos para validar
1. Login e sidebar recolhível
2. Logo da empresa no canto superior esquerdo (Sistema & Suporte > Identidade da empresa)
3. Projeto > Documentos > upload real de arquivo
4. Notificação de nova tarefa atribuída aparecendo no sino após alguns segundos
5. Frontend mais compacto e com melhor aproveitamento da tela
6. Contexto da empresa atual visível no topo do sistema
