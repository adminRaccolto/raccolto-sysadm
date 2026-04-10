import type { PerfilUsuario } from './auth';

export type TipoPessoa = 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
export type StatusCliente = 'PROSPECT' | 'ATIVO' | 'INATIVO';
export type StatusContrato = 'RASCUNHO' | 'ATIVO' | 'SUSPENSO' | 'ENCERRADO';
export type StatusProposta =
  | 'RASCUNHO'
  | 'AGUARDANDO_ASSINATURA'
  | 'ASSINADA'
  | 'RECUSADA'
  | 'EXPIRADA'
  | 'CONVERTIDA';
export type StatusAssinatura =
  | 'PENDENTE'
  | 'ENVIADO'
  | 'AGUARDANDO_ASSINATURA'
  | 'ASSINADO'
  | 'RECUSADO'
  | 'CANCELADO';
export type StatusProjeto =
  | 'PLANEJADO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_CLIENTE'
  | 'CONCLUIDO'
  | 'CANCELADO';
export type PrioridadeProjeto = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type TipoAtribuicaoTarefa = 'ANALISTA' | 'CLIENTE';
export type PrioridadeTarefa = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type StatusTarefa = 'NAO_INICIADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'AGUARDANDO' | 'CANCELADA';
export type TipoEntregavel =
  | 'RELATORIO'
  | 'PLANILHA'
  | 'APRESENTACAO'
  | 'PARECER'
  | 'DIAGNOSTICO'
  | 'PLANO_DE_ACAO'
  | 'ATA'
  | 'DOCUMENTO'
  | 'OUTRO';
export type StatusEntregavel =
  | 'PLANEJADO'
  | 'EM_PRODUCAO'
  | 'EM_REVISAO'
  | 'AGUARDANDO_APROVACAO'
  | 'CONCLUIDO'
  | 'CANCELADO';
export type EtapaCrm =
  | 'LEAD_RECEBIDO'
  | 'CONTATO_INICIADO'
  | 'DIAGNOSTICO'
  | 'PROPOSTA_ENVIADA'
  | 'NEGOCIACAO'
  | 'FECHADO_GANHO'
  | 'FECHADO_PERDIDO'
  | 'POS_VENDA';

export type StatusRecebivel = 'ABERTO' | 'PARCIALMENTE_RECEBIDO' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO';

export type StatusContaPagar = 'ABERTO' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
export type TipoContaGerencial = 'RECEITA' | 'CUSTO' | 'DESPESA' | 'INVESTIMENTO' | 'TESOURARIA';
export type TipoContaBancaria = 'CORRENTE' | 'POUPANCA' | 'CAIXA' | 'APLICACAO' | 'OUTRA';
export type TipoLancamentoTesouraria = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';
export type TipoDocumento =
  | 'CONTRATO'
  | 'RELATORIO_CONSULTORIA'
  | 'RELATORIO_DESLOCAMENTO'
  | 'REEMBOLSO'
  | 'TERMO_ENTREGA'
  | 'APROVACAO'
  | 'ENTREGAVEL'
  | 'OUTRO';
export type StatusDocumento =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'AGUARDANDO_ASSINATURA'
  | 'APROVADO'
  | 'ASSINADO'
  | 'ARQUIVADO'
  | 'CANCELADO';
export type PrioridadeNotificacao = 'BAIXA' | 'MEDIA' | 'ALTA';


export interface Empresa {
  id: string;
  nome: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  representanteNome?: string | null;
  representanteCargo?: string | null;
  logoUrl?: string | null;
  status?: string;
  _count?: {
    usuarios: number;
    clientes: number;
    contratos: number;
    projetos?: number;
  };
}

export interface ProdutoServico {
  id: string;
  nome: string;
  interno?: boolean;
  descricao?: string | null;
  contaGerencialReceita?: string | null;
  ativo: boolean;
  ordem: number;
}

export interface Cliente {
  id: string;
  tipoPessoa: TipoPessoa;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cpfCnpj?: string | null;
  inscricaoEstadual?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  contatoPrincipal?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  status: StatusCliente;
  createdAt: string;
}



export interface ContratoModelo {
  id: string;
  nome: string;
  descricao?: string | null;
  conteudo: string;
  ativo: boolean;
  padrao: boolean;
  createdAt?: string;
}

export interface PropostaModelo {
  id: string;
  nome: string;
  descricao?: string | null;
  conteudo: string;
  ativo: boolean;
  padrao: boolean;
  createdAt?: string;
}

export interface ContratoCobranca {
  id?: string;
  ordem: number;
  vencimento: string;
  valor: number;
  descricao?: string | null;
  createdAt?: string;
}

export interface Contrato {
  id: string;
  clienteId: string;
  produtoServicoId?: string | null;
  numeroContrato?: string | null;
  codigo?: string | null;
  titulo: string;
  objeto?: string | null;
  tipoContrato?: string | null;
  responsavelInterno?: string | null;
  contatoClienteNome?: string | null;
  contatoClienteEmail?: string | null;
  contatoClienteTelefone?: string | null;
  contatoClienteWhatsapp?: string | null;
  clienteRazaoSocial?: string | null;
  clienteNomeFantasia?: string | null;
  clienteCpfCnpj?: string | null;
  clienteInscricaoEstadual?: string | null;
  clienteEnderecoFormatado?: string | null;
  valor?: number | null;
  moeda?: string | null;
  formaPagamento?: string | null;
  periodicidadeCobranca?: string | null;
  quantidadeParcelas?: number | null;
  valorParcela?: number | null;
  dataInicio: string;
  dataFim?: string | null;
  primeiroVencimento?: string | null;
  diaVencimento?: number | null;
  indiceReajuste?: string | null;
  periodicidadeReajuste?: string | null;
  renovacaoAutomatica: boolean;
  status: StatusContrato;
  statusAssinatura: StatusAssinatura;
  dataEmissao?: string | null;
  dataAssinatura?: string | null;
  gerarProjetoAutomatico: boolean;
  gerarFinanceiroAutomatico: boolean;
  modeloContratoNome?: string | null;
  textoContratoBase?: string | null;
  observacoes?: string | null;
  cliente?: Cliente;
  produtoServico?: ProdutoServico | null;
  contaGerencial?: ContaGerencial | null;
  contaGerencialId?: string | null;
  recebiveis?: Recebivel[];
  cobrancas?: ContratoCobranca[];
  autentiqueDocId?: string | null;
  autentiqueSignUrl?: string | null;
  pdfAssinadoUrl?: string | null;
  createdAt: string;
}

export interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo?: boolean;
}

export interface ProjetoPainel {
  tarefasAIniciar: number;
  tarefasAtrasadas: number;
  percentualConclusao: number;
  totalTarefas: number;
}

export interface Projeto {
  id: string;
  clienteId: string;
  contratoId?: string | null;
  produtoServicoId?: string | null;
  responsavelId?: string | null;
  nome: string;
  interno?: boolean;
  descricao?: string | null;
  equipeEnvolvida?: string | null;
  tipoServicoProjeto?: string | null;
  faseAtual?: string | null;
  percentualAndamento: number;
  prioridade: PrioridadeProjeto;
  recorrente: boolean;
  dataInicio: string;
  dataFimPrevista?: string | null;
  status: StatusProjeto;
  visivelCliente: boolean;
  cliente?: Cliente;
  contrato?: Contrato | null;
  produtoServico?: ProdutoServico | null;
  contaGerencial?: ContaGerencial | null;
  contaGerencialId?: string | null;
  responsavel?: UsuarioResumo | null;
  painel?: ProjetoPainel;
  _count?: {
    tarefas: number;
    entregaveis: number;
    documentos?: number;
  };
  createdAt: string;
}

export interface HistoricoComentario {
  id: string;
  autorNome: string;
  mensagem: string;
  createdAt: string;
  autorUsuario?: { id: string; nome: string; email?: string } | null;
}

export interface Tarefa {
  id: string;
  projetoId: string;
  atribuicaoTipo: TipoAtribuicaoTarefa;
  responsavelUsuarioId?: string | null;
  responsavelClienteId?: string | null;
  titulo: string;
  descricao?: string | null;
  anexoUrl?: string | null;
  comentarioResumo?: string | null;
  checklistHabilitado: boolean;
  checklistJson?: Array<{ titulo?: string; concluido?: boolean }> | null;
  subtarefasJson?: Array<{ titulo?: string; concluida?: boolean }> | null;
  prioridade: PrioridadeTarefa;
  prazo?: string | null;
  status: StatusTarefa;
  visivelCliente: boolean;
  concluidaEm?: string | null;
  projeto?: {
    id: string;
    nome: string;
    clienteId?: string;
    visivelCliente?: boolean;
    interno?: boolean;
  };
  responsavelUsuario?: UsuarioResumo | null;
  responsavelCliente?: {
    id: string;
    razaoSocial: string;
  } | null;
  comentarios?: HistoricoComentario[];
  createdAt: string;
}

export interface Entregavel {
  id: string;
  projetoId: string;
  titulo: string;
  tipo: TipoEntregavel;
  descricao?: string | null;
  dataPrevista?: string | null;
  dataConclusao?: string | null;
  status: StatusEntregavel;
  visivelCliente: boolean;
  observacaoInterna?: string | null;
  observacaoCliente?: string | null;
  anexoUrl?: string | null;
  comentarioResumo?: string | null;
  projeto?: {
    id: string;
    nome: string;
    clienteId?: string;
    visivelCliente?: boolean;
    interno?: boolean;
  };
  createdAt: string;
}



export interface ContaGerencial {
  id: string;
  codigo: string;
  descricao: string;
  tipo: TipoContaGerencial;
  aceitaLancamento: boolean;
  ativo: boolean;
  contaPaiId?: string | null;
  contaPai?: { id: string; codigo: string; descricao: string } | null;
  _count?: {
    subcontas: number;
    contasPagar: number;
    recebiveis: number;
    lancamentos: number;
  };
}

export interface ContaBancaria {
  id: string;
  nome: string;
  banco?: string | null;
  agencia?: string | null;
  numeroConta?: string | null;
  tipo: TipoContaBancaria;
  saldoInicial: number;
  saldoAtual: number;
  ativo: boolean;
}

export interface ContaPagar {
  id: string;
  fornecedor?: string | null;
  descricao: string;
  competencia: string;
  dataCompra?: string | null;
  vencimento: string;
  valor: number;
  valorTotalCompra?: number | null;
  parcelado: boolean;
  grupoParcelamento?: string | null;
  parcelaNumero?: number | null;
  totalParcelas?: number | null;
  recorrente: boolean;
  previsao: boolean;
  anexoUrl?: string | null;
  status: StatusContaPagar;
  observacoes?: string | null;
  contaGerencial?: ContaGerencial;
}

export interface LancamentoTesouraria {
  id: string;
  contaBancariaId: string;
  contaGerencialId: string;
  tipo: TipoLancamentoTesouraria;
  descricao: string;
  dataLancamento: string;
  valor: number;
  observacoes?: string | null;
  contaBancaria?: ContaBancaria;
  contaGerencial?: ContaGerencial;
}

export interface FinanceiroDashboard {
  indicadores: {
    totalReceberAberto: number;
    totalPagarAberto: number;
    saldoProjetado: number;
    vencidosReceber: number;
    vencidosPagar: number;
  };
  fluxo: Array<{ data: string; entradas: number; saidas: number; saldo: number; entradasPrevistas?: number; saidasPrevistas?: number }>;
}

export interface Documento {
  id: string;
  projetoId?: string | null;
  contratoId?: string | null;
  tarefaId?: string | null;
  entregavelId?: string | null;
  nome: string;
  tipo: TipoDocumento;
  descricao?: string | null;
  arquivoUrl?: string | null;
  versao?: string | null;
  status: StatusDocumento;
  exigeAssinatura: boolean;
  exigeAprovacao: boolean;
  visivelCliente: boolean;
  dataEnvio?: string | null;
  dataConclusao?: string | null;
  observacaoInterna?: string | null;
  observacaoCliente?: string | null;
  projeto?: { id: string; nome: string } | null;
  contrato?: { id: string; titulo: string } | null;
  tarefa?: { id: string; titulo: string } | null;
  entregavel?: { id: string; titulo: string } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  link?: string | null;
  prioridade: PrioridadeNotificacao;
  lida: boolean;
  createdAt: string;
}

export interface NotificacoesResponse {
  naoLidas: number;
  itens: Notificacao[];
}

export interface Recebivel {
  id: string;
  descricao: string;
  valor: number;
  parcelaNumero?: number | null;
  totalParcelas?: number | null;
  grupoParcelamento?: string | null;
  vencimento: string;
  valorPago?: number | null;
  dataPagamento?: string | null;
  status: StatusRecebivel;
  previsao: boolean;
  origemAutomatica: boolean;
  cliente?: Cliente;
  contrato?: Contrato | null;
  produtoServico?: ProdutoServico | null;
  contaGerencial?: ContaGerencial | null;
  contaGerencialId?: string | null;
}

export interface DashboardResumo {
  escopo: 'interno' | 'cliente';
  usuario: {
    nome: string;
    email: string;
    perfil: PerfilUsuario;
  };
  indicadores: Record<string, number>;
  atalhosSugeridos: string[];
  projetos?: Projeto[];
}

export interface PainelOperacional {
  escopo: 'interno' | 'cliente';
  indicadores: {
    projetosAtivos: number;
    projetosAguardandoCliente: number;
    tarefasEmAtraso: number;
    entregaveisPendentes: number;
  };
  proximosPrazos: {
    tarefas: Tarefa[];
    entregaveis: Entregavel[];
  };
}

export interface HealthResponse {
  status: string;
  database: string;
  result?: unknown;
}


export interface RecursoSistema {
  id: string;
  chave: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  ativo: boolean;
}

export interface PerfilPermissao {
  id: string;
  recursoSistemaId: string;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  aprovar: boolean;
  administrar: boolean;
  recursoSistema: RecursoSistema;
}

export interface PerfilAcesso {
  id: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  padraoSistema?: boolean;
  permissoes: PerfilPermissao[];
  _count?: { usuariosEmpresa: number };
}

export interface UsuarioEmpresaAcesso {
  id: string;
  principal: boolean;
  ativo: boolean;
  empresa: Empresa;
  perfilAcesso?: PerfilAcesso | null;
}

export interface UsuarioAdmin extends UsuarioResumo {
  empresaId: string;
  clienteId?: string | null;
  empresa?: Empresa | null;
  perfilAcessoAtual?: PerfilAcesso | null;
  empresasDisponiveis?: Array<{
    id: string;
    nome: string;
    nomeFantasia?: string | null;
    principal?: boolean;
    perfilAcesso?: { id: string; nome: string } | null;
  }>;
  ativo?: boolean;
  createdAt?: string;
}


export interface OportunidadeCrm {
  id: string;
  clienteId?: string | null;
  produtoServicoId?: string | null;
  responsavelId?: string | null;
  titulo: string;
  empresaNome: string;
  contatoNome?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  origemLead?: string | null;
  valorEstimado?: number | null;
  etapa: EtapaCrm;
  probabilidade: number;
  previsaoFechamento?: string | null;
  proximaAcao?: string | null;
  dataProximaAcao?: string | null;
  motivoPerda?: string | null;
  observacoes?: string | null;
  cliente?: Cliente | null;
  produtoServico?: ProdutoServico | null;
  responsavel?: UsuarioResumo | null;
  comentarios?: HistoricoComentario[];
  createdAt: string;
  updatedAt: string;
}

export interface FormularioCaptacao {
  id: string;
  empresaId: string;
  produtoServicoId?: string | null;
  nome: string;
  slug: string;
  origemLead: string;
  etapaInicial: EtapaCrm;
  titulo: string;
  descricao?: string | null;
  ativo: boolean;
  produtoServico?: { id: string; nome: string } | null;
  _count?: { submissoes: number };
  createdAt: string;
  updatedAt: string;
}

export interface FormularioSubmissao {
  id: string;
  formularioId: string;
  oportunidadeId?: string | null;
  nomeContato: string;
  empresaNome?: string | null;
  email?: string | null;
  telefone?: string | null;
  mensagem?: string | null;
  oportunidade?: { id: string; titulo: string; etapa: EtapaCrm } | null;
  createdAt: string;
}

export interface PublicFormulario {
  id: string;
  nome: string;
  titulo: string;
  descricao?: string | null;
  origemLead: string;
  empresa: { nomeFantasia?: string | null; nome: string; logoUrl?: string | null };
}
