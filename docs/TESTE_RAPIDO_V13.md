# TESTE RÁPIDO V13 — Financeiro base

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

## Ordem de validação
1. Abrir **Financeiro**
2. Conferir os indicadores do resumo
3. Cadastrar uma **conta gerencial**
4. Cadastrar uma **conta bancária**
5. Cadastrar uma **conta a pagar**
6. Cadastrar uma **conta a receber manual**
7. Conferir o **fluxo de caixa projetado**

## Observações
- esta versão altera o schema do banco
- contas a receber automáticas por contrato continuam funcionando
- a conciliação OFX/OFC, cartão e NF-e ficam para a próxima camada do Financeiro
