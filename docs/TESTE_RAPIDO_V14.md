# Raccolto Suite v14 — teste rápido

## Foco desta versão
- Financeiro reorganizado em telas separadas
- Contas a Receber em tela própria
- Contas a Pagar em tela própria
- Compras parceladas com competência concentrada e desembolso mês a mês
- Tesouraria com histórico e lançamentos classificados
- Contas Bancárias movidas para Sistema & Suporte

## Subida
### Backend
```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

### Frontend
```bash
cp .env.example .env
npm install
npm run dev
```

## Ordem de validação
1. Abrir **Financeiro**
2. Validar que o painel inicial mostra apenas visão gerencial + fluxo + plano de contas
3. Abrir **Contas a Receber**
4. Validar que a conta gerencial é obrigatória
5. Abrir **Contas a Pagar**
6. Validar que:
   - não existe campo principal de projeto
   - conta gerencial é obrigatória
   - existe campo de anexo
   - compra parcelada gera parcelas mensais
   - competência pode ficar no mês da compra
7. Abrir **Tesouraria**
8. Cadastrar lançamento manual com conta gerencial obrigatória
9. Abrir **Sistema & Suporte**
10. Validar que **Contas Bancárias** foram movidas para lá
