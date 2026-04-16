# Raccolto — Especificação Executiva (Versão 3)

## Objetivo do sistema
Concentrar em um único ambiente as rotinas principais da empresa de consultoria, agora com o núcleo operacional de execução dos serviços:

- autenticação e perfis
- clientes
- contratos
- usuários
- projetos
- tarefas
- entregáveis
- painel resumido da operação
- suporte técnico interno

## Módulos já entregues nesta versão
1. **Autenticação**
   - bootstrap inicial
   - login
   - proteção por JWT
   - rota `me`

2. **Perfis**
   - `ADMIN`
   - `ANALISTA`
   - `CLIENTE`

3. **Clientes**
   - cadastro
   - listagem
   - detalhamento

4. **Contratos**
   - cadastro
   - listagem
   - detalhamento

5. **Projetos**
   - cadastro
   - listagem
   - detalhamento
   - vínculo com cliente, contrato e responsável
   - status operacional
   - flag de visibilidade para cliente

6. **Tarefas**
   - cadastro
   - listagem
   - detalhamento
   - prioridade
   - prazo
   - responsável
   - compartilhamento opcional com cliente

7. **Entregáveis**
   - cadastro
   - listagem
   - detalhamento
   - tipo de entrega
   - prazo previsto
   - data de conclusão
   - observações internas e externas
   - visibilidade para cliente

8. **Dashboard**
   - resumo gerencial ampliado
   - visão restrita para cliente
   - painel operacional com próximos prazos

9. **Suporte**
   - manifesto do módulo
   - base para futura camada de IA operacional

## Lógica de modelagem
- **Empresa**: unidade organizacional dona dos dados
- **Usuário**: pessoa que acessa o sistema
- **Cliente**: empresa/entidade atendida
- **Contrato**: vínculo comercial entre a empresa e o cliente
- **Projeto**: frente operacional de execução do contrato
- **Tarefa**: atividade executável ligada ao projeto
- **Entregável**: material ou marco de entrega ligado ao projeto

## Regras principais
- o bootstrap inicial cria a primeira empresa e o primeiro administrador
- após o bootstrap, o acesso passa a depender de login e token
- usuários do perfil `CLIENTE` podem ser vinculados a um cliente específico
- contratos sempre pertencem a um cliente da mesma empresa
- projetos sempre pertencem a um cliente da mesma empresa e podem ou não estar vinculados a um contrato
- tarefas e entregáveis sempre pertencem a um projeto da mesma empresa
- o cliente só enxerga projetos marcados como visíveis, tarefas compartilhadas e entregáveis visíveis

## Próximas entregas recomendadas
1. documentos e versionamento
2. agenda online
3. CRM
4. financeiro
5. central inteligente de suporte com camada de IA mais avançada
