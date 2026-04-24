# Raccolto Suite v4

Pacote consolidado do projeto **Raccolto**, com backend e frontend separados para rodar em paralelo.

## Estrutura

- `backend/` → API NestJS + Prisma + PostgreSQL
- `frontend/` → Painel web React + Vite
- `docs/` → consolidação funcional e roteiro de teste

## O que esta versão materializa

### Implementado para teste agora
- clientes com CPF/CNPJ, tipo de pessoa, IE, WhatsApp e endereço
- catálogo administrável de produtos e serviços
- contratos ampliados com produto, dados de assinatura e dados financeiros-base
- geração automática de contas a receber quando contrato é criado como **assinado** e com geração financeira habilitada
- tarefas com atribuição para analista ou cliente
- tarefas com checklist opcional, subtarefas básicas em JSON, comentário resumido e anexo por URL
- visão web de tarefas em **lista** e **kanban**, com filtro por **atribuído a** e por **status**
- página inicial de financeiro para visualizar recebíveis gerados
- manifesto do suporte atualizado

### Consolidado na especificação, mas ainda não programado por completo
- agenda interna completa
- documentos com fluxo de assinatura digital e retorno automático
- CRM clássico em pipeline completo
- notificações configuráveis por perfil
- financeiro completo com OFX/OFC, cartão, tesouraria e notas fiscais
- permissões dinâmicas por perfil
- parametrização ampla de todos os tipos, modelos e checklists

## Como subir

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

### Frontend
Em outro terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## URLs
- Backend: `http://localhost:3001/api`
- Frontend: `http://localhost:5173`

## Observação importante
Esta entrega foi preparada para você **testar a evolução junto do frontend**, mas ainda é uma versão incremental. Ela já materializa parte relevante do que consolidamos, porém não cobre todos os módulos avançados do Raccolto.
