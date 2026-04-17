# Raccolto v8 — teste rápido

## Ordem de subida
1. backend
2. frontend
3. primeiro acesso/login

## Itens para validar
- sino de notificações no topo
- projeto com abas de tarefas, entregáveis e documentos
- cadastro/edição/exclusão de documentos do projeto
- criação de notificação por nova tarefa atribuída
- criação de notificação para admins em mudanças de contrato
- entregável com anexo/comentário

## Observação
Esta versão amplia o schema do banco com `Documento` e `Notificacao`, então é necessário rodar `npm run prisma:generate` e `npm run prisma:push` no backend.
