import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileSignature,
  FileText,
  GraduationCap,
  Lightbulb,
  Package,
  Receipt,
  Settings,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

/* ─── tipos ─────────────────────────────────────────────────────── */
interface Modulo {
  id: string;
  icon: React.ReactNode;
  titulo: string;
  subtitulo: string;
  cor: string;
  descricao: string;
  passos: { titulo: string; descricao: string }[];
  dicas?: string[];
  atencao?: string[];
}

/* ─── dados ─────────────────────────────────────────────────────── */
const FLUXO = [
  { label: 'CRM',         sub: 'Capturar lead',     cor: '#7c3aed', icon: <Target size={18} /> },
  { label: 'Cliente',     sub: 'Cadastrar empresa', cor: '#2563eb', icon: <Users size={18} /> },
  { label: 'Proposta',    sub: 'Enviar e assinar',  cor: '#0891b2', icon: <FileText size={18} /> },
  { label: 'Contrato',    sub: 'Gerar e formalizar',cor: '#059669', icon: <FileSignature size={18} /> },
  { label: 'Projeto',     sub: 'Executar e entregar',cor: '#d97706',icon: <Briefcase size={18} /> },
  { label: 'Faturamento', sub: 'Emitir NFS-e',      cor: '#dc2626', icon: <Receipt size={18} /> },
  { label: 'Financeiro',  sub: 'Controlar fluxo',   cor: '#0f766e', icon: <Wallet size={18} /> },
];

const MODULOS: Modulo[] = [
  {
    id: 'crm',
    icon: <Target size={20} />,
    titulo: 'CRM — Gestão de Oportunidades',
    subtitulo: 'Pipeline de vendas e captação de novos clientes',
    cor: '#7c3aed',
    descricao: 'O CRM é o ponto de entrada para novos negócios. Registre leads, acompanhe o funil de vendas e converta oportunidades em clientes e contratos de forma automática.',
    passos: [
      { titulo: 'Criar oportunidade', descricao: 'Clique em "Nova oportunidade". Preencha o nome da empresa/lead, contato responsável, produto de interesse e valor estimado. Defina o estágio inicial (geralmente "Lead Recebido").' },
      { titulo: 'Avançar no funil', descricao: 'Arraste o card no Kanban ou edite o estágio no formulário. O funil tem 8 etapas: Lead Recebido → Contato Iniciado → Diagnóstico → Proposta Enviada → Negociação → Fechado Ganho / Fechado Perdido → Pós-venda.' },
      { titulo: 'Registrar comentários', descricao: 'Dentro da oportunidade, adicione comentários cronológicos para registrar o histórico de contatos, reuniões e compromissos assumidos.' },
      { titulo: 'Converter oportunidade', descricao: 'Quando a venda for concluída ("Fechado Ganho"), clique em "Converter". O sistema cria automaticamente: cliente (se novo), contrato e projeto — tudo de uma vez.' },
    ],
    dicas: [
      'Use o campo "Próxima ação" e "Data da próxima ação" para nunca perder um follow-up.',
      'Registre o motivo de perda em oportunidades perdidas — isso gera dados para melhorar o processo comercial.',
      'A probabilidade (%) afeta o BI e ajuda no planejamento financeiro da receita esperada.',
    ],
  },
  {
    id: 'clientes',
    icon: <Users size={20} />,
    titulo: 'Clientes — Cadastro de Base',
    subtitulo: 'Gestão do cadastro de clientes e contatos',
    cor: '#2563eb',
    descricao: 'A base de clientes centraliza todas as informações de empresas e pessoas físicas atendidas. Um cadastro completo agiliza propostas, contratos e emissão de notas fiscais.',
    passos: [
      { titulo: 'Criar cliente', descricao: 'Clique em "Novo cliente". Selecione o tipo (Pessoa Jurídica ou Física). Preencha CNPJ/CPF, razão social, nome fantasia, e-mail, telefone e WhatsApp.' },
      { titulo: 'Preencher endereço', descricao: 'Digite o CEP e o sistema busca automaticamente logradouro, bairro, cidade e estado (integração ViaCEP). Complete número e complemento manualmente.' },
      { titulo: 'Definir contato principal', descricao: 'Informe o nome do contato principal da empresa. Esse dado é pré-preenchido automaticamente nas propostas.' },
      { titulo: 'Gerenciar status', descricao: 'Use o status "Ativo", "Inativo" ou "Prospect" para controlar a base. Clientes inativos não aparecem nas seleções de novas propostas.' },
    ],
    dicas: [
      'Mantenha o e-mail do cliente atualizado — ele é usado no envio de propostas para assinatura digital.',
      'O campo "Inscrição Estadual" é obrigatório para emissão de NFS-e em alguns municípios.',
    ],
    atencao: [
      'Não é possível excluir um cliente que possui propostas, contratos ou projetos vinculados.',
    ],
  },
  {
    id: 'produtos',
    icon: <Package size={20} />,
    titulo: 'Produtos & Serviços — Catálogo',
    subtitulo: 'Configuração dos serviços oferecidos pela empresa',
    cor: '#0891b2',
    descricao: 'O catálogo de produtos e serviços é a base para propostas e contratos. Cada item tem nome, descrição e conta contábil associada para automatizar o lançamento financeiro.',
    passos: [
      { titulo: 'Criar serviço', descricao: 'Clique em "Novo produto/serviço". Preencha o nome (ex: "Consultoria Mensal"), a descrição detalhada e selecione a conta contábil de receita correspondente.' },
      { titulo: 'Definir ordem de exibição', descricao: 'Use o campo "Ordem" para controlar a sequência em que os serviços aparecem nas listas. Números menores aparecem primeiro.' },
      { titulo: 'Ativar / desativar', descricao: 'Serviços inativos não aparecem para seleção em novas propostas, mas continuam vinculados às existentes.' },
    ],
    dicas: [
      'Descreva bem os serviços — a descrição é pré-preenchida no campo "Objeto" da proposta.',
      'Configure a conta contábil correta desde o início para que o faturamento seja classificado automaticamente.',
    ],
  },
  {
    id: 'propostas',
    icon: <FileText size={20} />,
    titulo: 'Propostas — Comercial e Assinatura',
    subtitulo: 'Criação, envio e assinatura digital de propostas',
    cor: '#0891b2',
    descricao: 'O módulo de propostas gerencia todo o ciclo comercial: da criação ao envio para assinatura digital via Autentique. Uma proposta assinada gera automaticamente um contrato.',
    passos: [
      { titulo: 'Criar proposta', descricao: 'Clique em "Nova proposta". Selecione o cliente (dados do contato são preenchidos automaticamente) e o serviço (título e objeto também são preenchidos). Informe o valor total, forma de pagamento e periodicidade.' },
      { titulo: 'Configurar cobranças', descricao: 'Defina o número de parcelas, a data do primeiro vencimento e o sistema gera o cronograma automaticamente. Você pode editar cada linha individualmente.' },
      { titulo: 'Enviar para assinatura', descricao: 'Salve a proposta e clique em "Enviar para assinatura". O sistema envia via Autentique. O cliente recebe um e-mail com o link para assinar digitalmente.' },
      { titulo: 'Acompanhar status', descricao: 'O status muda automaticamente: Rascunho → Aguardando Assinatura → Assinada (ou Recusada / Expirada). Use "Sincronizar assinatura" se o status não atualizar sozinho.' },
      { titulo: 'Converter em contrato', descricao: 'Após a assinatura, clique em "Gerar contrato". O sistema cria o contrato com todos os dados da proposta, incluindo o cronograma de cobranças.' },
    ],
    dicas: [
      'Preencha a data de validade da proposta para que o status mude para "Expirada" automaticamente.',
      'O PDF assinado fica disponível para download na proposta após a assinatura.',
    ],
    atencao: [
      'Propostas com status diferente de "Rascunho" não podem ser editadas.',
      'Certifique-se de que o e-mail do cliente está correto antes de enviar para assinatura.',
    ],
  },
  {
    id: 'contratos',
    icon: <FileSignature size={20} />,
    titulo: 'Contratos — Gestão e Faturamento',
    subtitulo: 'Contratos, modelos e cronograma de cobranças',
    cor: '#059669',
    descricao: 'Os contratos formalizam a prestação de serviços e geram o cronograma de faturamento. O sistema gerencia modelos com variáveis automáticas e envia para assinatura digital.',
    passos: [
      { titulo: 'Criar ou receber contrato', descricao: 'Contratos podem ser criados manualmente (Contratos → Novo) ou automaticamente a partir de uma proposta assinada. Os dados do cliente, valores e cronograma já vêm preenchidos.' },
      { titulo: 'Aplicar modelo', descricao: 'Selecione um modelo de contrato. O texto é preenchido automaticamente com variáveis como {cliente.razaoSocial}, {contrato.valor}, {contrato.dataInicio}. Revise e ajuste antes de enviar.' },
      { titulo: 'Enviar para assinatura', descricao: 'Clique em "Enviar para assinatura digital". O contrato é enviado via Autentique para as partes assinarem eletronicamente.' },
      { titulo: 'Configurar cronograma', descricao: 'O cronograma de cobranças fica na aba de cobranças do contrato. Cada linha tem data de vencimento, valor e status (pendente, emitido, cancelado).' },
      { titulo: 'Gerenciar renovações', descricao: 'Contratos com renovação automática ativa são sinalizados no BI quando se aproximam do vencimento (30 e 60 dias).' },
    ],
    dicas: [
      'Crie modelos de contrato para cada tipo de serviço — economiza muito tempo.',
      'Ative "Gerar itens financeiros" ao criar o contrato para que as cobranças apareçam automaticamente no Contas a Receber.',
      'Ative "Gerar projeto" para que um projeto seja criado automaticamente junto com o contrato.',
    ],
  },
  {
    id: 'projetos',
    icon: <Briefcase size={20} />,
    titulo: 'Projetos — Execução e Entregas',
    subtitulo: 'Gestão de projetos, tarefas e entregáveis',
    cor: '#d97706',
    descricao: 'O módulo de projetos organiza a execução dos serviços contratados. Cada projeto tem tarefas, entregáveis e documentos, com controle de visibilidade para o cliente.',
    passos: [
      { titulo: 'Criar projeto', descricao: 'Projetos podem ser internos (sem cliente) ou vinculados a um cliente e contrato. Ao vincular um contrato, as datas são preenchidas automaticamente.' },
      { titulo: 'Criar tarefas', descricao: 'Dentro do projeto, vá na aba "Tarefas" e clique em "Nova tarefa". Defina título, responsável, prioridade, prazo e status. Você pode criar subtarefas e checklists dentro de cada tarefa.' },
      { titulo: 'Usar o Kanban', descricao: 'A visão Kanban mostra as tarefas em colunas por status: Não Iniciada → Em Andamento → Aguardando → Concluída. Arraste os cards para atualizar o status.' },
      { titulo: 'Registrar entregáveis', descricao: 'Na aba "Entregáveis", registre os relatórios, apresentações e documentos que serão entregues ao cliente. Cada entregável tem status próprio.' },
      { titulo: 'Controlar visibilidade', descricao: 'Marque "Visível para cliente" nos projetos, tarefas e entregáveis que o cliente pode visualizar — preparação para o portal do cliente.' },
    ],
    dicas: [
      'Use subtarefas para dividir tarefas complexas em passos menores.',
      'O checklist dentro da tarefa é ótimo para procedimentos padronizados.',
      'Adicione comentários nas tarefas para registrar o histórico de execução.',
    ],
  },
  {
    id: 'faturamento',
    icon: <Receipt size={20} />,
    titulo: 'Faturamento — Emissão de NFS-e',
    subtitulo: 'Emissão automática de notas fiscais de serviço',
    cor: '#dc2626',
    descricao: 'O módulo de faturamento emite NFS-e automaticamente a partir do cronograma de cobranças dos contratos, integrado ao eNotas.',
    passos: [
      { titulo: 'Configurar eNotas', descricao: 'Antes de usar, configure a API Key do eNotas e o ID da empresa em Sistema. A empresa deve estar previamente cadastrada no eNotas com o certificado digital.' },
      { titulo: 'Selecionar competência', descricao: 'No topo da tela, selecione o mês de faturamento. O sistema lista todas as cobranças com vencimento naquele período ainda não faturadas.' },
      { titulo: 'Emitir notas', descricao: 'Selecione as cobranças que deseja faturar e clique em "Emitir NFS-e". O sistema envia ao eNotas. O status muda para "Emitindo" e depois "Emitido".' },
      { titulo: 'Acompanhar status', descricao: 'Clique em "Sincronizar" para atualizar o status das notas em processamento. Após emitidas, faça download do PDF/XML ou cancele se necessário.' },
      { titulo: 'Cobranças avulsas', descricao: 'Para cobranças fora do cronograma, use "Nova cobrança avulsa" — útil para reembolsos, serviços extras e cobranças pontuais.' },
    ],
    dicas: [
      'Emita as notas na virada do mês, antes do vencimento das cobranças.',
      'Erros de emissão geralmente indicam dados cadastrais incompletos — verifique CNPJ, endereço e inscrição municipal.',
    ],
    atencao: [
      'Notas emitidas não podem ser editadas — apenas canceladas.',
      'Certifique-se que o CNPJ do cliente está correto antes de emitir.',
    ],
  },
  {
    id: 'financeiro',
    icon: <Wallet size={20} />,
    titulo: 'Financeiro — Fluxo de Caixa',
    subtitulo: 'Contas a receber, pagar e fluxo de caixa',
    cor: '#0f766e',
    descricao: 'O módulo financeiro consolida todas as receitas e despesas, projetando o fluxo de caixa futuro. Integra automaticamente com os contratos (cobranças) e propostas aprovadas.',
    passos: [
      { titulo: 'Contas a Receber', descricao: 'Geradas automaticamente pelos contratos. Em Financeiro → Contas a Receber, marque como "Recebido" quando o pagamento for confirmado, informando data e conta bancária.' },
      { titulo: 'Contas a Pagar', descricao: 'Lançamentos manuais de despesas. Em Financeiro → Contas a Pagar, cadastre fornecedor, valor, vencimento, conta contábil e conta bancária de pagamento.' },
      { titulo: 'Fluxo de Caixa', descricao: 'O painel principal mostra o resumo do fluxo: recebíveis em aberto, contas a pagar, saldo projetado. Use as abas "Fluxo Mensal" e "Fluxo Diário" para visão detalhada.' },
      { titulo: 'Simulações temporárias', descricao: 'Adicione simulações no painel para testar cenários (ex: "e se fechar esse cliente?"). As simulações são marcadas separadamente e não afetam os lançamentos reais.' },
      { titulo: 'Plano de Contas', descricao: 'Configure as categorias contábeis em Financeiro → Plano de Contas. A hierarquia de contas organiza as receitas e despesas nas análises do BI.' },
    ],
    dicas: [
      'Registre todos os recebimentos confirmados para manter o fluxo de caixa preciso.',
      'Use as simulações para planejar novos investimentos ou contratações.',
      'Configure o Plano de Contas antes de começar a lançar — fica mais difícil reorganizar depois.',
    ],
  },
  {
    id: 'bi',
    icon: <BarChart3 size={20} />,
    titulo: 'BI — Indicadores Gerenciais',
    subtitulo: 'Painel executivo com KPIs e tendências',
    cor: '#1d4ed8',
    descricao: 'O BI consolida indicadores financeiros, operacionais e comerciais em um único painel executivo, com comparativos mensais e tendências dos últimos 6 meses.',
    passos: [
      { titulo: 'Indicadores financeiros', descricao: 'Veja o total faturado, recebido, a receber e valores vencidos no mês atual. A variação em relação ao mês anterior aparece em verde (melhora) ou vermelho (piora).' },
      { titulo: 'Indicadores operacionais', descricao: 'Contratos ativos, com vencimento próximo, projetos em andamento, tarefas em atraso e entregáveis pendentes — tudo visível de uma vez.' },
      { titulo: 'Tendência de receita', descricao: 'O gráfico de 6 meses mostra a evolução do faturado versus o recebido — útil para identificar problemas de inadimplência.' },
      { titulo: 'Top 5 clientes', descricao: 'Ranking dos 5 maiores clientes por valor contratado — ajuda a identificar concentração de receita e risco de churn.' },
      { titulo: 'Recebimentos próximos', descricao: 'Lista os próximos recebimentos dos próximos 30 dias para planejamento de caixa de curto prazo.' },
    ],
    dicas: [
      'Acesse o BI diariamente para ter visão rápida da saúde do negócio.',
      'Contratos com vencimento em 30 dias precisam de ação imediata — renovar ou encerrar.',
    ],
  },
  {
    id: 'sistema',
    icon: <Settings size={20} />,
    titulo: 'Sistema — Configurações',
    subtitulo: 'Identidade da empresa, usuários e permissões',
    cor: '#475569',
    descricao: 'O módulo Sistema centraliza as configurações administrativas: identidade da empresa, cadastro de usuários, perfis de acesso e gerenciamento de múltiplas empresas.',
    passos: [
      { titulo: 'Configurar identidade', descricao: 'Em Sistema → Identidade da empresa, preencha nome, CNPJ, endereço, representante legal e faça upload da logo. Esses dados são usados nos contratos e NFS-e.' },
      { titulo: 'Adicionar usuários', descricao: 'Em Sistema → Usuários, clique em "Novo usuário". Preencha nome, e-mail e senha. Defina o perfil base (ADMIN, ANALISTA ou CLIENTE) e quais empresas o usuário pode acessar.' },
      { titulo: 'Perfis de acesso', descricao: 'Em Sistema → Perfis & Permissões, configure permissões granulares por recurso. Defina quem pode visualizar, criar, editar, excluir, aprovar ou administrar cada módulo.' },
      { titulo: 'Múltiplas empresas', descricao: 'Em Sistema → Empresas, cadastre as empresas do grupo. Cada empresa tem dados, logo, usuários e dados financeiros separados. Troque de empresa pelo seletor no menu superior.' },
    ],
    dicas: [
      'Configure os perfis de acesso antes de criar os usuários — é mais fácil atribuir perfis prontos.',
      'O perfil CLIENTE é para dar acesso limitado ao portal do cliente — visibilidade apenas dos próprios projetos e tarefas.',
    ],
    atencao: [
      'Apenas usuários com perfil ADMIN têm acesso ao módulo Sistema.',
      'A exclusão de uma empresa remove todos os dados vinculados — use com extremo cuidado.',
    ],
  },
];

/* ─── componente principal ───────────────────────────────────────── */
export default function LearningPage() {
  const [aba, setAba] = useState<'fluxo' | 'modulos' | 'setup' | 'mapeamento'>('fluxo');
  const [moduloAberto, setModuloAberto] = useState<string | null>(null);

  function toggleModulo(id: string) {
    setModuloAberto((prev) => (prev === id ? null : id));
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Central de Aprendizado"
        subtitle="Manual completo de operação do Raccolto — processos, módulos e configuração inicial."
        chips={[{ label: `${MODULOS.length} módulos documentados` }]}
      />

      {/* Abas */}
      <div className="segmented">
        <button className={`segmented__button${aba === 'fluxo' ? ' segmented__button--active' : ''}`} onClick={() => setAba('fluxo')}>
          Fluxo do negócio
        </button>
        <button className={`segmented__button${aba === 'modulos' ? ' segmented__button--active' : ''}`} onClick={() => setAba('modulos')}>
          Módulos
        </button>
        <button className={`segmented__button${aba === 'setup' ? ' segmented__button--active' : ''}`} onClick={() => setAba('setup')}>
          Primeiros passos
        </button>
        <button className={`segmented__button${aba === 'mapeamento' ? ' segmented__button--active' : ''}`} onClick={() => setAba('mapeamento')}>
          Mapeamento de processos
        </button>
      </div>

      {/* ── Aba: Fluxo do negócio ──────────────────────────────── */}
      {aba === 'fluxo' && (
        <div className="page-stack">
          {/* Diagrama de fluxo */}
          <div className="panel">
            <div className="panel__header">
              <h3>Fluxo principal do Raccolto</h3>
              <p>Do lead à receita — o ciclo completo de um cliente no sistema.</p>
            </div>
            <div className="panel__body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {FLUXO.map((etapa, i) => (
                  <>
                    <div
                      key={etapa.label}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        background: `${etapa.cor}14`, border: `1.5px solid ${etapa.cor}40`,
                        borderRadius: 12, padding: '12px 16px', minWidth: 96, textAlign: 'center',
                      }}
                    >
                      <div style={{ color: etapa.cor, marginBottom: 6 }}>{etapa.icon}</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: etapa.cor }}>{etapa.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{etapa.sub}</span>
                    </div>
                    {i < FLUXO.length - 1 && (
                      <ArrowRight key={`arr-${i}`} size={16} color="var(--muted)" />
                    )}
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* Como cada etapa se conecta */}
          <div className="panel">
            <div className="panel__header">
              <h3>Como cada etapa se conecta</h3>
            </div>
            <div className="panel__body" style={{ display: 'grid', gap: 12 }}>
              {[
                { etapa: '1. Captação no CRM', cor: '#7c3aed', texto: 'Todo novo cliente entra como oportunidade no CRM. Registre o lead, avance pelas etapas do funil e converta quando o negócio for fechado. A conversão cria o cliente, o contrato e o projeto automaticamente.' },
                { etapa: '2. Proposta comercial', cor: '#2563eb', texto: 'Para clientes que exigem proposta formal antes do contrato, crie uma proposta. Defina o serviço, valor e cronograma de cobranças. Envie para assinatura digital via Autentique — o cliente assina pelo celular ou computador sem nenhum aplicativo.' },
                { etapa: '3. Contrato ativo', cor: '#059669', texto: 'Com a proposta assinada ou a conversão do CRM, o contrato é gerado com todas as cláusulas (via modelo) e o cronograma de cobranças. Ele alimenta automaticamente o Contas a Receber do módulo Financeiro.' },
                { etapa: '4. Execução do projeto', cor: '#d97706', texto: 'O projeto vinculado ao contrato organiza a execução: tarefas atribuídas à equipe, entregáveis planejados e documentos de referência. O Kanban facilita o acompanhamento diário.' },
                { etapa: '5. Faturamento mensal', cor: '#dc2626', texto: 'Todo mês, acesse o módulo Faturamento, selecione a competência e emita as NFS-e das cobranças do período. O sistema envia ao eNotas e acompanha o status da nota.' },
                { etapa: '6. Controle financeiro', cor: '#0f766e', texto: 'Registre os recebimentos no Contas a Receber e os pagamentos no Contas a Pagar. O Fluxo de Caixa projeta automaticamente o saldo futuro. O BI consolida tudo em indicadores gerenciais.' },
              ].map((item) => (
                <div
                  key={item.etapa}
                  style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: `${item.cor}08`, borderLeft: `3px solid ${item.cor}`,
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, color: item.cor, marginBottom: 4 }}>{item.etapa}</p>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{item.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Aba: Módulos ──────────────────────────────────────── */}
      {aba === 'modulos' && (
        <div className="page-stack page-stack--compact">
          {MODULOS.map((m) => (
            <div
              key={m.id}
              className="panel"
              style={{ padding: 0, overflow: 'hidden', border: moduloAberto === m.id ? `1.5px solid ${m.cor}50` : undefined }}
            >
              {/* Cabeçalho do acordeão */}
              <button
                onClick={() => toggleModulo(m.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: `${m.cor}18`, color: m.cor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {m.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{m.titulo}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{m.subtitulo}</p>
                </div>
                {moduloAberto === m.id
                  ? <ChevronDown size={18} color="var(--muted)" />
                  : <ChevronRight size={18} color="var(--muted)" />
                }
              </button>

              {/* Conteúdo expandido */}
              {moduloAberto === m.id && (
                <div style={{ padding: '0 18px 20px', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '14px 0 18px', lineHeight: 1.6 }}>{m.descricao}</p>

                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Passo a passo</p>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                    {m.passos.map((passo, i) => (
                      <div
                        key={i}
                        style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 9, background: 'var(--surface-soft)' }}
                      >
                        <div
                          style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                            background: m.cor, color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{passo.titulo}</p>
                          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{passo.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {m.dicas && m.dicas.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Lightbulb size={14} color="#f59e0b" /> Dicas
                      </p>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {m.dicas.map((d, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                            <CheckCircle size={14} color="#22c55e" style={{ marginTop: 3, flexShrink: 0 }} />
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.atencao && m.atencao.length > 0 && (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} color="#ef4444" /> Atenção
                      </p>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {m.atencao.map((a, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#b91c1c', lineHeight: 1.6, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
                            <AlertTriangle size={14} style={{ marginTop: 3, flexShrink: 0 }} />
                            {a}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Aba: Primeiros passos ─────────────────────────────── */}
      {aba === 'setup' && (
        <div className="page-stack">
          <div className="panel">
            <div className="panel__header">
              <h3>Configure o sistema em 6 passos</h3>
              <p>Siga essa sequência para ter o Raccolto pronto para operação.</p>
            </div>
            <div className="panel__body" style={{ display: 'grid', gap: 12 }}>
              {[
                { num: 1, cor: '#7c3aed', titulo: 'Identidade da empresa', descricao: 'Vá em Sistema e selecione a empresa atual. Preencha nome, CNPJ, endereço completo, representante legal e faça upload da logo. Esses dados aparecem nos contratos e NFS-e.' },
                { num: 2, cor: '#2563eb', titulo: 'Plano de Contas', descricao: 'Acesse Financeiro → Plano de Contas. O sistema cria um plano padrão automaticamente, mas revise as contas e adicione categorias específicas do seu negócio antes de começar a lançar.' },
                { num: 3, cor: '#0891b2', titulo: 'Modelos de contrato', descricao: 'Em Contratos → Modelos, crie os templates dos seus contratos padrão. Use as variáveis disponíveis ({cliente.razaoSocial}, {contrato.valor}, etc.) para que o texto seja preenchido automaticamente.' },
                { num: 4, cor: '#059669', titulo: 'Catálogo de serviços', descricao: 'Em Produtos & Serviços, cadastre todos os serviços que sua empresa oferece com nome, descrição e conta contábil. Isso agiliza a criação de propostas.' },
                { num: 5, cor: '#d97706', titulo: 'Usuários e permissões', descricao: 'Em Sistema → Perfis & Permissões, configure os perfis de acesso. Em seguida, em Sistema → Usuários, cadastre os membros da equipe e atribua os perfis corretos.' },
                { num: 6, cor: '#dc2626', titulo: 'Integração eNotas (NFS-e)', descricao: 'Para emissão de NFS-e, você precisará de uma conta no eNotas e o certificado digital da empresa configurado lá. Obtenha a API Key em app.enotas.com.br → Configurações → Integrações → API e insira em Sistema.' },
              ].map((item) => (
                <div
                  key={item.num}
                  style={{
                    display: 'flex', gap: 14, padding: '14px 16px',
                    borderRadius: 10, background: 'var(--surface-soft)', border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: item.cor, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800,
                    }}
                  >
                    {item.num}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{item.titulo}</p>
                    <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{item.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ background: 'var(--primary-soft)', border: '1px solid rgba(15,76,117,0.2)' }}>
            <div className="panel__body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <GraduationCap size={22} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>Dica de produtividade</p>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                  Comece cadastrando seus clientes e serviços mais importantes, depois crie os contratos ativos. O sistema vai popular automaticamente o Contas a Receber e o BI com dados reais — você terá visibilidade imediata da sua carteira.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Aba: Mapeamento de processos ─────────────────────── */}
      {aba === 'mapeamento' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Mapeamento de Processos — Raccolto</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Fluxogramas completos de todos os módulos, ciclos e lógica de negócio do sistema.</p>
            </div>
            <a
              href="/mapeamento-processo.html"
              target="_blank"
              rel="noopener noreferrer"
              className="button button--ghost button--small"
            >
              Abrir em nova aba
            </a>
          </div>
          <iframe
            src="/mapeamento-processo.html"
            title="Mapeamento de Processos"
            style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
}
