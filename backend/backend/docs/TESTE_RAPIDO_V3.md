# Teste rápido da Versão 3

## 1. Reinicialização recomendada para teste limpo

```bash
docker compose down -v
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

## 2. Saúde
Abra:
- `http://localhost:3001/api/health`
- `http://localhost:3001/api/suporte/manifesto`

## 3. Bootstrap
Faça um `POST` para:
- `http://localhost:3001/api/auth/bootstrap`

Payload:

```json
{
  "empresaNome": "Raccolto Consultoria",
  "empresaNomeFantasia": "Raccolto",
  "empresaCnpj": "00.000.000/0001-00",
  "empresaEmail": "contato@raccolto.com",
  "empresaTelefone": "(65) 99999-9999",
  "nome": "Administrador Inicial",
  "email": "admin@raccolto.com",
  "senha": "123456"
}
```

## 4. Login
Faça um `POST` para:
- `http://localhost:3001/api/auth/login`

Payload:

```json
{
  "email": "admin@raccolto.com",
  "senha": "123456"
}
```

Copie o `accessToken`.

## 5. Criar cliente
`POST /api/clientes`

```json
{
  "razaoSocial": "Cliente Exemplo Ltda",
  "nomeFantasia": "Cliente Exemplo",
  "documento": "11.111.111/0001-11",
  "email": "cliente@exemplo.com",
  "telefone": "(11) 99999-8888",
  "contatoPrincipal": "Fulano",
  "status": "ATIVO"
}
```

## 6. Criar contrato
Use o `clienteId` retornado no cadastro do cliente.

`POST /api/contratos`

```json
{
  "clienteId": "COLE_O_ID_AQUI",
  "codigo": "CTR-001",
  "titulo": "Consultoria Financeira Mensal",
  "objeto": "Acompanhamento financeiro e gerencial",
  "valor": 4500,
  "dataInicio": "2026-04-01",
  "dataFim": "2027-03-31",
  "renovacaoAutomatica": true,
  "status": "ATIVO",
  "observacoes": "Contrato base para validação do módulo"
}
```

## 7. Criar projeto
Use o `clienteId` e, se desejar, o `contratoId` retornado.

`POST /api/projetos`

```json
{
  "clienteId": "COLE_O_CLIENTE_ID_AQUI",
  "contratoId": "COLE_O_CONTRATO_ID_AQUI",
  "nome": "Implantação Financeira 2026",
  "descricao": "Projeto piloto do módulo operacional",
  "dataInicio": "2026-04-05",
  "dataFimPrevista": "2026-06-30",
  "status": "EM_ANDAMENTO",
  "visivelCliente": true
}
```

## 8. Criar tarefa
Use o `projetoId` retornado.

`POST /api/tarefas`

```json
{
  "projetoId": "COLE_O_PROJETO_ID_AQUI",
  "titulo": "Mapear processos financeiros",
  "descricao": "Levantamento inicial do fluxo operacional do cliente",
  "prioridade": "ALTA",
  "prazo": "2026-04-12",
  "status": "PENDENTE",
  "visivelCliente": true
}
```

## 9. Criar entregável
Use o `projetoId` retornado.

`POST /api/entregaveis`

```json
{
  "projetoId": "COLE_O_PROJETO_ID_AQUI",
  "titulo": "Diagnóstico Financeiro Inicial",
  "tipo": "RELATORIO",
  "descricao": "Documento inicial de diagnóstico",
  "dataPrevista": "2026-04-20",
  "status": "EM_PRODUCAO",
  "visivelCliente": true,
  "observacaoInterna": "Primeira versão em elaboração",
  "observacaoCliente": "Material em preparação"
}
```

## 10. Testes protegidos
Envie `Authorization: Bearer SEU_TOKEN` e teste:

- `GET /api/auth/me`
- `GET /api/dashboard/resumo`
- `GET /api/projetos`
- `GET /api/projetos/painel-operacional`
- `GET /api/tarefas`
- `GET /api/entregaveis`
