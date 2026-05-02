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
export type StatusTarefa = 'NAO_INICIADA' | 'INICIADA' | 'AGUARDANDO_APROVACAO' | 'CONCLUIDA' | 'CANCELADA';
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
export type TipoContaBancaria = 'CORRENTE' | 'POUPANCA' | 'CAIXA' | 'APLICACAO' | 'TRANSITORIA' | 'INVESTIMENTO' | 'OUTRA';
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
  infBancarias?: string | null;
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
  nomeFazenda?: string | null;
  distanciaKm?: number | null;
  precoKmReembolso?: number | null;
  status: StatusCliente;
  createdAt: string;
}



export type TipoModeloDocumento = 'CONTRATO' | 'PROPOSTA' | 'RELATORIO_CONSULTORIA' | 'RELATORIO_DESLOCAMENTO' | 'OUTRO';

export interface ModeloDocumento {
  id: string;
  tipo: TipoModeloDocumento;
  nome: string;
  descricao?: string | null;
  conteudo: string;
  ativo: boolean;
  padrao: boolean;
  createdAt?: string;
}

export interface Deslocamento {
  id: string;
  empresaId: string;
  projetoId: string;
  clienteId: string;
  responsavelId?: string | null;
  data: string;
  distanciaKm: number;
  precoKm: number;
  valorTotal: number;
  descricao?: string | null;
  observacoes?: string | null;
  docFiscal?: string | null;
  pedagios?: number | null;
  refeicao?: number | null;
  reembolsado: boolean;
  projeto?: { id: string; nome: string } | null;
  cliente?: { id: string; razaoSocial: string; nomeFantasia?: string | null; nomeFazenda?: string | null } | null;
  responsavel?: { id: string; nome: string } | null;
  createdAt: string;
}

export interface RelatorioDeslocamento {
  projetoId: string;
  dataInicio: string;
  dataFim: string;
  adiantamento?: number;
  anotacoes?: string;
}

export type TipoItemReembolso = 'KM' | 'PEDAGIO' | 'ALIMENTACAO' | 'HOSPEDAGEM' | 'OUTRO';
export type StatusRelatorioReembolso =
  | 'RASCUNHO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'REPROVADO'
  | 'FINANCEIRO_GERADO';

export interface ItemReembolso {
  id: string;
  tipo: TipoItemReembolso;
  data?: string | null;
  descricao: string;
  km?: number | null;
  precoKm?: number | null;
  valor: number;
  createdAt: string;
}

export interface ReembolsoCliente {
  id: string;
  clienteId: string;
  percentual: number;
  valor: number;
  recebivelId?: string | null;
  cliente: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
    nomeFazenda?: string | null;
    distanciaKm?: number | null;
    precoKmReembolso?: number | null;
  };
}

export interface RelatorioReembolso {
  id: string;
  empresaId: string;
  projetoId?: string | null;
  responsavelId?: string | null;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  observacoes?: string | null;
  status: StatusRelatorioReembolso;
  valorTotal: number;
  documentoUrl?: string | null;
  autentiqueDocId?: string | null;
  projeto?: { id: string; nome: string } | null;
  responsavel?: { id: string; nome: string } | null;
  itens: ItemReembolso[];
  clientes: ReembolsoCliente[];
  createdAt: string;
  updatedAt: string;
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
  tarefasAbertas: number;
  tarefasAtrasadas: number;
  tarefasConcluidas: number;
  tarefasPendentesAprovacao: number;
  tarefasCanceladas: number;
  percentualConclusao: number;
  totalTarefas: number;
}

export interface ProjetoMembro {
  id: string;
  projetoId: string;
  usuarioId: string;
  papel: string;
  usuario?: UsuarioResumo;
  createdAt: string;
}

export interface TarefaAnexo {
  id: string;
  tarefaId: string;
  nome: string;
  url: string;
  tipo?: string | null;
  tamanho?: number | null;
  autorNome: string;
  createdAt: string;
}

export type StatusEtapa = 'PLANEJADA' | 'ATIVA' | 'CONCLUIDA' | 'CANCELADA';

export interface ProjetoEtapa {
  id: string;
  projetoId: string;
  nome: string;
  meta?: string | null;
  dataInicio: string;
  dataFim: string;
  status: StatusEtapa;
  ordem: number;
  createdAt: string;
  _count?: { tarefas: number };
}

export interface TarefaLabel {
  id: string;
  empresaId: string;
  nome: string;
  cor: string;
}

export interface TarefaAtividade {
  id: string;
  tarefaId: string;
  autorNome: string;
  tipo: string;
  detalhe?: string | null;
  createdAt: string;
}

export interface Projeto {
  id: string;
  clienteId: string;
  contratoId?: string | null;
  produtoServicoId?: string | null;
  responsavelId?: string | null;
  gerenteId?: string | null;
  nome: string;
  interno?: boolean;
  descricao?: string | null;
  cor?: string;
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
  gerente?: UsuarioResumo | null;
  membros?: ProjetoMembro[];
  painel?: ProjetoPainel;
  etapas?: ProjetoEtapa[];
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
  etapaId?: string | null;
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
  estimativaHoras?: number | null;
  horasRegistradas?: number;
  ordem?: number;
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
  aprovadorTipo?: string | null;
  aprovadorUsuarioId?: string | null;
  etapa?: { id: string; nome: string; status: string; cor?: string | null } | null;
  labels?: Array<{ label: TarefaLabel }>;
  anexos?: TarefaAnexo[];
  atividades?: TarefaAtividade[];
  responsavelUsuario?: UsuarioResumo | null;
  responsavelCliente?: {
    id: string;
    razaoSocial: string;
  } | null;
  aprovadorUsuario?: UsuarioResumo | null;
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

export interface Banco {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

export interface ContaBancaria {
  id: string;
  bancoId?: string | null;
  bancoRef?: Banco | null;
  nome: string;
  banco?: string | null;
  agencia?: string | null;
  numeroConta?: string | null;
  chavePix?: string | null;
  tipo: TipoContaBancaria;
  saldoInicial: number;
  saldoAtual: number;
  incluiFluxoCaixa: boolean;
  ativo: boolean;
}

export interface Funcionario {
  id: string;
  empresaId: string;
  nome: string;
  documento?: string | null;
  tipoDocumento?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  sexo?: string | null;
  fotoUrl?: string | null;
  cargo?: string | null;
  vinculo: string;
  salario?: number | null;
  dataAdmissao?: string | null;
  dataDemissao?: string | null;
  dataNascimento?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  contaBancariaNome?: string | null;
  contaBancariaAgencia?: string | null;
  contaBancariaConta?: string | null;
  contaBancariaBanco?: string | null;
  contaBancariaPix?: string | null;
  usuarioId?: string | null;
  fornecedorId?: string | null;
  fornecedor?: { id: string; razaoSocial: string; nomeFantasia?: string | null } | null;
  ativo: boolean;
  observacoes?: string | null;
  createdAt: string;
}

export interface Fornecedor {
  id: string;
  empresaId: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  nomeContato?: string | null;
  telefoneEmpresa?: string | null;
  telefoneContato?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  _count?: { funcionarios: number };
  createdAt: string;
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
  assinaturaAratoId?: string | null;
}

export type StatusAssinaturaArato = 'ATIVA' | 'SUSPENSA' | 'CANCELADA';

export interface AssinaturaArato {
  id: string;
  clienteId: string;
  produtoServicoId: string;
  contaGerencialId?: string | null;
  valorMensal: number;
  diaVencimento: number;
  dataInicio: string;
  avisoEnviado: boolean;
  status: StatusAssinaturaArato;
  parcelasVencidas?: number;
  createdAt: string;
  cliente: Cliente;
  produtoServico: ProdutoServico;
  recebiveis?: Recebivel[];
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


export interface CrmEtapa {
  id: string;
  chave: string;
  nome: string;
  cor: string;
  ordem: number;
  createdAt: string;
}

export interface CrmTag {
  id: string;
  nome: string;
  cor: string;
  createdAt: string;
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
  etapa: string;
  probabilidade: number;
  previsaoFechamento?: string | null;
  proximaAcao?: string | null;
  dataProximaAcao?: string | null;
  motivoPerda?: string | null;
  observacoes?: string | null;
  tags: string[];
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

export interface DiagramaListItem {
  id: string;
  titulo: string;
  projetoId: string | null;
  projeto?: { id: string; nome: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramaFull extends DiagramaListItem {
  conteudo: Record<string, unknown>;
}

export type StatusDiagnosticoLead = 'PENDENTE' | 'QUALIFICADO' | 'NAO_QUALIFICADO';

export interface DiagnosticoLeadResumo {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string | null;
  estado: string | null;
  status: StatusDiagnosticoLead;
  createdAt: string;
}

export interface DiagnosticoLeadFull extends DiagnosticoLeadResumo {
  idade: number | null;
  profissao: string | null;
  nomeFazenda: string | null;
  culturas: string[];
  percentualArrendado: number | null;
  operacoesTerceirizadas: string[];
  temSiloArmazem: boolean | null;
  produtividadeMedia: { cultura: string; media: number }[] | null;
  custosInsumosDiretos: string | null;
  hectaresPorTrabalhador: number | null;
  travaAntecipada: boolean | null;
  boaLeituraComercializacao: boolean | null;
  frustracaoSafra: Record<string, number | null> | null;
  percentualCusteio: string | null;
  captouMaisQuePageu: boolean | null;
  usaSoftwareGestao: string | null;
  sabeCustoPorSaca: boolean | null;
  clarezaCustos: boolean | null;
  baseDecisoes: string | null;
  reuniaoFechamento: boolean | null;
  respondidoAt: string | null;
  updatedAt: string;
}

