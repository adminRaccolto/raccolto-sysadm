import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type {
  Cliente,
  ModeloDocumento,
  ProdutoServico,
  StatusAssinatura,
  StatusProposta,
} from '../types/api';
import {
  formatCurrency,
  formatDate,
  labelize,
  maskCurrencyInputBRL,
  parseCurrencyInputBRL,
} from '../utils/format';

const periodicidades = ['MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'] as const;

const MODELO_PADRAO_AGB = `## Objetivo da proposta

Apresentar uma solução de consultoria voltada à organização da gestão financeira, administrativa e operacional, com foco em controle, previsibilidade, apoio gerencial à tomada de decisão e melhoria da rotina do cliente.

## 1. Escopo da atuação

### Frente 1 — Operação da gestão financeira

• Contas a pagar, contas a receber, lançamentos fiscais, baixas e conciliação bancária.
• Estruturação do fluxo de caixa previsto e acompanhamento das rotinas financeiras.
• Centro de custos, rateios, gestão de contratos e relatórios gerenciais.
• Treinamento das rotinas e orientação da equipe envolvida.

### Frente 2 — Gestão financeira em nível diretivo

• Análise de passivos e definição de estratégias de pagamento.
• Estratégias de caixa, controle de recursos financeiros e priorização de desembolsos.
• Apoio à governança e à aprovação de pagamentos.

### Frente 3 — Gestão operacional

• Controle de abastecimentos, estoque de insumos e produtos.
• Acompanhamento da operação de campo, apropriações e utilização de hora-máquina.
• Manutenção de máquinas e equipamentos.
• Estruturação de orçamento CAPEX e OPEX, com visão orçado x realizado.

### Frente 4 — Implantação e padronização de controles

• Apoio à implantação do sistema gerencial e às parametrizações necessárias.
• Formatação de controles internos e definição do fluxo de informação.
• Revisão de processos de trabalho para garantir aderência à operação.

## 2. Entregáveis esperados

• Rotinas financeiras estruturadas e acompanhadas com maior disciplina operacional.
• Base de informações gerenciais mais confiável para análise de caixa, passivos, custos e resultados.
• Padronização de controles e processos com definição clara de responsabilidades.
• Apoio executivo à tomada de decisão financeira e administrativa.
• Equipe orientada para utilização das rotinas e ferramentas implantadas.

## 3. Forma de trabalho e acompanhamento

• O cronograma analítico será detalhado após a aprovação da proposta.
• A agenda de visitas e reuniões será alinhada com o responsável, considerando a sazonalidade da operação do cliente.
• Os atendimentos poderão ocorrer de forma presencial e online, conforme a necessidade de cada etapa.
• O avanço do projeto dependerá do acesso às informações e da disponibilidade dos responsáveis internos.

## 4. Prazo estimado

Prazo máximo estimado: até {{data_fim}}. O período pode ser reduzido conforme a disponibilidade do cliente, da equipe envolvida e da aderência ao cronograma executivo.

## 5. Investimento

O investimento do projeto é calculado com base no esforço previsto para desenvolvimento das atividades, tanto in office quanto in company.

**Valor total: {{valor_total}}**
**Forma de pagamento: {{forma_pagamento}}**
**Parcelas: {{qtd_parcelas}}x ({{periodicidade}})**

{{tabela_cobrancas}}

## 6. Despesas de deslocamento e condições de desenvolvimento

• Para atendimentos fora do município sede, poderão ser cobrados deslocamento, alimentação e hospedagem, quando aplicável.
• Quilômetro rodado (ida e volta): conforme tabela vigente.
• Alimentação: conforme acordado, por dia integral ou valor proporcional.
• Hospedagem: reservada pelo cliente, quando necessária.
• O sucesso do projeto depende do compartilhamento tempestivo das informações econômico-financeiras e operacionais previstas no escopo.

## 7. Confidencialidade e pós-implantação

Comprometemo-nos com a confidencialidade das informações compartilhadas pelo cliente. Após a implantação, poderá ser realizado acompanhamento e suporte técnico para monitorar resultados, colher feedbacks e apoiar a consolidação das rotinas implantadas.

## 8. Validade e aceite

• Esta proposta pode ser ajustada conforme escopo, agenda, local de atendimento e necessidades específicas do cliente.
• Validade desta proposta: {{validade}}.
• Após o aceite, recomenda-se formalizar o início do projeto por meio de assinatura eletrônica ou confirmação formal por e-mail.`;


type PropostaCobranca = {
  ordem: number;
  vencimento: string;
  valor: number;
  descricao?: string | null;
};

type PropostaForm = {
  clienteId: string;
  produtoServicoId: string;
  titulo: string;
  objeto: string;
  responsavelInterno: string;
  contatoClienteNome: string;
  contatoClienteEmail: string;
  contatoClienteTelefone: string;
  clienteRazaoSocial: string;
  clienteNomeFantasia: string;
  clienteCpfCnpj: string;
  clienteEnderecoFormatado: string;
  valor: string;
  moeda: string;
  formaPagamento: string;
  periodicidadeCobranca: string;
  quantidadeParcelas: string;
  valorParcela: string;
  dataInicio: string;
  dataFim: string;
  primeiroVencimento: string;
  validadeAte: string;
  textoPropostaBase: string;
  observacoes: string;
  status: StatusProposta;
  statusAssinatura: StatusAssinatura;
  autentiqueDocId: string | null;
  autentiqueSignUrl: string | null;
  pdfAssinadoUrl: string | null;
  tokenAceite: string | null;
  contratoGeradoId: string | null;
  cobrancas: PropostaCobranca[];
};

type PropostaApi = PropostaForm & {
  id: string;
  createdAt: string;
  updatedAt: string;
  dataAssinatura: string | null;
  dataAceite: string | null;
  cliente?: { id: string; razaoSocial: string; nomeFantasia: string; email: string; cpfCnpj: string; contatoPrincipal: string } | null;
  produtoServico?: { id: string; nome: string } | null;
  contratoGerado?: { id: string; titulo: string; status: string; statusAssinatura: string } | null;
};

const initialForm: PropostaForm = {
  clienteId: '',
  produtoServicoId: '',
  titulo: '',
  objeto: '',
  responsavelInterno: '',
  contatoClienteNome: '',
  contatoClienteEmail: '',
  contatoClienteTelefone: '',
  clienteRazaoSocial: '',
  clienteNomeFantasia: '',
  clienteCpfCnpj: '',
  clienteEnderecoFormatado: '',
  valor: '',
  moeda: 'BRL',
  formaPagamento: '',
  periodicidadeCobranca: 'MENSAL',
  quantidadeParcelas: '1',
  valorParcela: '',
  dataInicio: '',
  dataFim: '',
  primeiroVencimento: '',
  validadeAte: '',
  textoPropostaBase: '',
  observacoes: '',
  status: 'RASCUNHO',
  statusAssinatura: 'PENDENTE',
  autentiqueDocId: null,
  autentiqueSignUrl: null,
  pdfAssinadoUrl: null,
  tokenAceite: null,
  contratoGeradoId: null,
  cobrancas: [],
};

function resolveIntervaloMeses(periodicidade: string) {
  const map: Record<string, number> = { BIMESTRAL: 2, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12 };
  return map[periodicidade] ?? 1;
}

function gerarCobrancas(params: {
  valor: number;
  periodicidadeCobranca: string;
  quantidadeParcelas: number;
  primeiroVencimento: string;
}): PropostaCobranca[] {
  const intervalo = resolveIntervaloMeses(params.periodicidadeCobranca);
  const base = Number((params.valor / params.quantidadeParcelas).toFixed(2));
  const resto = Math.round((params.valor - base * params.quantidadeParcelas) * 100) / 100;
  return Array.from({ length: params.quantidadeParcelas }).map((_, i) => {
    const venc = new Date(params.primeiroVencimento);
    venc.setMonth(venc.getMonth() + i * intervalo);
    return {
      ordem: i + 1,
      vencimento: venc.toISOString().slice(0, 10),
      valor: i === params.quantidadeParcelas - 1 ? base + resto : base,
      descricao: `Parcela ${i + 1}/${params.quantidadeParcelas}`,
    };
  });
}

function formatClienteEndereco(cliente?: Cliente | null) {
  if (!cliente) return '';
  const partes = [cliente.logradouro, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean);
  return partes.join(', ');
}

function labelStatus(status: StatusProposta): string {
  const map: Record<StatusProposta, string> = {
    RASCUNHO: 'Rascunho',
    AGUARDANDO_ASSINATURA: 'Ag. aceite',
    ASSINADA: 'Assinada',
    RECUSADA: 'Recusada',
    EXPIRADA: 'Expirada',
    CONVERTIDA: 'Convertida',
  };
  return map[status] ?? status;
}

function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    return typeof msg === 'string' ? msg : fallback;
  }
  return fallback;
}

type Filtro = 'ABERTAS' | 'CONCLUIDAS' | 'TODAS';

const CONCLUIDAS: StatusProposta[] = ['ASSINADA', 'CONVERTIDA', 'RECUSADA', 'EXPIRADA'];

export default function PropostasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [propostas, setPropostas] = useState<PropostaApi[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('ABERTAS');
  const [form, setForm] = useState<PropostaForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCobrancasModalOpen, setIsCobrancasModalOpen] = useState(false);
  const [isModelosModalOpen, setIsModelosModalOpen] = useState(false);
  const [modelos, setModelos] = useState<ModeloDocumento[]>([]);
  const [editingModeloId, setEditingModeloId] = useState<string | null>(null);
  const [modeloForm, setModeloForm] = useState({ nome: '', descricao: '', conteudo: '', ativo: true, padrao: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [clientesRes, produtosRes, propostasRes, modelosRes] = await Promise.all([
        http.get<Cliente[]>('/clientes'),
        http.get<ProdutoServico[]>('/produtos-servicos'),
        http.get<PropostaApi[]>('/propostas'),
        http.get<ModeloDocumento[]>('/modelos-documento?tipo=PROPOSTA'),
      ]);
      setClientes(clientesRes.data);
      setProdutos(produtosRes.data);
      setPropostas(propostasRes.data);
      setModelos(modelosRes.data ?? []);
      setSelectedId((cur) => {
        if (!propostasRes.data.length) return null;
        if (cur && propostasRes.data.some((p) => p.id === cur)) return cur;
        return propostasRes.data[0].id;
      });
      setForm((cur) => ({
        ...cur,
        clienteId: cur.clienteId || clientesRes.data[0]?.id || '',
        produtoServicoId: cur.produtoServicoId || produtosRes.data[0]?.id || '',
      }));
    } catch (err) {
      setError(getApiError(err, 'Falha ao carregar propostas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const filteredPropostas = useMemo(() => {
    if (filtro === 'TODAS') return propostas;
    if (filtro === 'CONCLUIDAS') return propostas.filter((p) => CONCLUIDAS.includes(p.status));
    return propostas.filter((p) => !CONCLUIDAS.includes(p.status));
  }, [propostas, filtro]);

  const selectedProposta = useMemo(
    () => propostas.find((p) => p.id === selectedId) ?? null,
    [propostas, selectedId],
  );

  function resetForm() {
    setEditingId(null);
    setForm({
      ...initialForm,
      clienteId: clientes[0]?.id || '',
      produtoServicoId: produtos[0]?.id || '',
    });
  }

  function openNewModal() {
    const primeiroClienteId = clientes[0]?.id || '';
    const primeiroProdutoId = produtos[0]?.id || '';
    const primeiroProduto = produtos[0];
    const base: PropostaForm = {
      ...initialForm,
      clienteId: primeiroClienteId,
      produtoServicoId: primeiroProdutoId,
      titulo: primeiroProduto?.nome || '',
      objeto: primeiroProduto?.descricao || '',
    };
    const dadosCliente = primeiroClienteId
      ? preencherDadosCliente(primeiroClienteId, base)
      : {};
    setEditingId(null);
    setForm({ ...base, ...dadosCliente });
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeModal() {
    if (saving) return;
    resetForm();
    setIsModalOpen(false);
  }

  function startEdit(p: PropostaApi) {
    setEditingId(p.id);
    setForm({
      clienteId: p.clienteId,
      produtoServicoId: p.produtoServicoId || '',
      titulo: p.titulo,
      objeto: p.objeto || '',
      responsavelInterno: p.responsavelInterno || '',
      contatoClienteNome: p.contatoClienteNome || '',
      contatoClienteEmail: p.contatoClienteEmail || '',
      contatoClienteTelefone: p.contatoClienteTelefone || '',
      clienteRazaoSocial: p.clienteRazaoSocial || '',
      clienteNomeFantasia: p.clienteNomeFantasia || '',
      clienteCpfCnpj: p.clienteCpfCnpj || '',
      clienteEnderecoFormatado: p.clienteEnderecoFormatado || '',
      valor: p.valor ? maskCurrencyInputBRL(String(Math.round(Number(p.valor) * 100))) : '',
      moeda: p.moeda || 'BRL',
      formaPagamento: p.formaPagamento || '',
      periodicidadeCobranca: p.periodicidadeCobranca || 'MENSAL',
      quantidadeParcelas: String(p.quantidadeParcelas || 1),
      valorParcela: p.valorParcela ? maskCurrencyInputBRL(String(Math.round(Number(p.valorParcela) * 100))) : '',
      dataInicio: p.dataInicio ? String(p.dataInicio).slice(0, 10) : '',
      dataFim: p.dataFim ? String(p.dataFim).slice(0, 10) : '',
      primeiroVencimento: p.primeiroVencimento ? String(p.primeiroVencimento).slice(0, 10) : '',
      validadeAte: p.validadeAte ? String(p.validadeAte).slice(0, 10) : '',
      textoPropostaBase: p.textoPropostaBase || '',
      observacoes: p.observacoes || '',
      status: p.status,
      statusAssinatura: p.statusAssinatura,
      autentiqueDocId: p.autentiqueDocId ?? null,
      autentiqueSignUrl: p.autentiqueSignUrl ?? null,
      pdfAssinadoUrl: p.pdfAssinadoUrl ?? null,
      tokenAceite: p.tokenAceite ?? null,
      contratoGeradoId: p.contratoGeradoId ?? null,
      cobrancas: (p.cobrancas || []).map((c) => ({
        ordem: c.ordem,
        vencimento: String(c.vencimento).slice(0, 10),
        valor: c.valor,
        descricao: c.descricao ?? null,
      })),
    });
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function preencherDadosCliente(clienteId: string, prev: PropostaForm): Partial<PropostaForm> {
    const c = clientes.find((cl) => cl.id === clienteId);
    return {
      clienteId,
      clienteRazaoSocial: c?.razaoSocial || '',
      clienteNomeFantasia: c?.nomeFantasia || '',
      clienteCpfCnpj: c?.cpfCnpj || '',
      clienteEnderecoFormatado: formatClienteEndereco(c),
      contatoClienteNome: c?.contatoPrincipal || prev.contatoClienteNome || '',
      contatoClienteEmail: c?.email || prev.contatoClienteEmail || '',
      contatoClienteTelefone: c?.telefone || prev.contatoClienteTelefone || '',
    };
  }

  function handleClienteChange(clienteId: string) {
    setForm((prev) => ({ ...prev, ...preencherDadosCliente(clienteId, prev) }));
  }

  function handleGerarCobrancas() {
    const valorNum = parseCurrencyInputBRL(form.valor);
    const qtd = parseInt(form.quantidadeParcelas, 10);
    if (!valorNum || !qtd || !form.primeiroVencimento) {
      setError('Preencha valor total, quantidade de parcelas e primeiro vencimento.');
      return;
    }
    const cobrancas = gerarCobrancas({
      valor: valorNum,
      periodicidadeCobranca: form.periodicidadeCobranca,
      quantidadeParcelas: qtd,
      primeiroVencimento: form.primeiroVencimento,
    });
    setForm((prev) => ({ ...prev, cobrancas }));
    setIsCobrancasModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        clienteId: form.clienteId,
        produtoServicoId: form.produtoServicoId || undefined,
        titulo: form.titulo,
        objeto: form.objeto || undefined,
        responsavelInterno: form.responsavelInterno || undefined,
        contatoClienteNome: form.contatoClienteNome || undefined,
        contatoClienteEmail: form.contatoClienteEmail || undefined,
        contatoClienteTelefone: form.contatoClienteTelefone || undefined,
        valor: parseCurrencyInputBRL(form.valor) || undefined,
        moeda: form.moeda || 'BRL',
        formaPagamento: form.formaPagamento || undefined,
        periodicidadeCobranca: form.periodicidadeCobranca || undefined,
        quantidadeParcelas: form.quantidadeParcelas ? parseInt(form.quantidadeParcelas, 10) : undefined,
        valorParcela: parseCurrencyInputBRL(form.valorParcela) || undefined,
        dataInicio: form.dataInicio || undefined,
        dataFim: form.dataFim || undefined,
        primeiroVencimento: form.primeiroVencimento || undefined,
        validadeAte: form.validadeAte || undefined,
        textoPropostaBase: form.textoPropostaBase || undefined,
        observacoes: form.observacoes || undefined,
        cobrancas: form.cobrancas,
      };
      if (editingId) {
        await http.patch(`/propostas/${editingId}`, payload);
      } else {
        await http.post('/propostas', payload);
      }
      setIsModalOpen(false);
      setSuccess(editingId ? 'Proposta atualizada.' : 'Proposta criada.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro ao salvar proposta.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: PropostaApi) {
    if (!confirm(`Excluir a proposta "${p.titulo}"?`)) return;
    try {
      await http.delete(`/propostas/${p.id}`);
      setSuccess('Proposta excluída.');
      if (selectedId === p.id) setSelectedId(null);
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro ao excluir proposta.'));
    }
  }

  async function handleEnviarParaCliente(p: PropostaApi) {
    setEnviando(true);
    setError(null);
    try {
      await http.post(`/propostas/${p.id}/enviar-cliente`);
      setSuccess('Link de aceite enviado ao cliente por e-mail.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro ao enviar proposta ao cliente.'));
    } finally {
      setEnviando(false);
    }
  }

  async function handleReenviarLinkCliente(p: PropostaApi) {
    setEnviando(true);
    setError(null);
    try {
      const res = await http.post<{ message: string }>(`/propostas/${p.id}/reenviar-link-cliente`);
      setSuccess(res.data.message || 'Link reenviado com sucesso.');
    } catch (err) {
      setError(getApiError(err, 'Erro ao reenviar link.'));
    } finally {
      setEnviando(false);
    }
  }

  const podeEditar = (p: PropostaApi) => p.status === 'RASCUNHO';
  const podeExcluir = (p: PropostaApi) => p.status !== 'CONVERTIDA';
  const podeEnviar = (p: PropostaApi) => p.status === 'RASCUNHO' || p.status === 'RECUSADA';

  function openModelosModal() {
    setEditingModeloId(null);
    setModeloForm({ nome: '', descricao: '', conteudo: '', ativo: true, padrao: false });
    setIsModelosModalOpen(true);
  }

  function startEditModelo(m: ModeloDocumento) {
    setEditingModeloId(m.id);
    setModeloForm({ nome: m.nome, descricao: m.descricao ?? '', conteudo: m.conteudo, ativo: m.ativo, padrao: m.padrao });
    setIsModelosModalOpen(true);
  }

  async function handleSaveModelo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { nome: modeloForm.nome.trim(), descricao: modeloForm.descricao || undefined, conteudo: modeloForm.conteudo, ativo: modeloForm.ativo, padrao: modeloForm.padrao };
      if (editingModeloId) {
        await http.put(`/modelos-documento/${editingModeloId}`, payload);
      } else {
        await http.post('/modelos-documento', { ...payload, tipo: 'PROPOSTA' });
      }
      setEditingModeloId(null);
      setModeloForm({ nome: '', descricao: '', conteudo: '', ativo: true, padrao: false });
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao salvar modelo de proposta.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModelo(m: ModeloDocumento) {
    if (!confirm(`Excluir o modelo "${m.nome}"?`)) return;
    try {
      await http.delete(`/modelos-documento/${m.id}`);
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao excluir modelo.'));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Propostas"
        subtitle="Crie propostas comerciais, envie o link de aceite ao cliente e gere o contrato automaticamente após a aprovação."
        chips={loading ? [] : (() => {
          const abertas = propostas.filter((p) => p.status === 'RASCUNHO' || p.status === 'AGUARDANDO_ASSINATURA').length;
          const convertidas = propostas.filter((p) => p.status === 'CONVERTIDA').length;
          return [
            ...(abertas > 0 ? [{ label: `${abertas} em aberto` }] : []),
            ...(convertidas > 0 ? [{ label: `${convertidas} convertida${convertidas !== 1 ? 's' : ''}` }] : []),
          ];
        })()}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div>
            <h3>Propostas</h3>
            <p>{filteredPropostas.length} proposta(s) no filtro atual.</p>
          </div>
          <div className="header-tools">
            <div className="segmented">
              {(['ABERTAS', 'CONCLUIDAS', 'TODAS'] as Filtro[]).map((f) => (
                <button
                  key={f}
                  className={`segmented__button${filtro === f ? ' segmented__button--active' : ''}`}
                  type="button"
                  onClick={() => setFiltro(f)}
                >
                  {f === 'ABERTAS' ? 'Em aberto' : f === 'CONCLUIDAS' ? 'Concluídas' : 'Todas'}
                </button>
              ))}
            </div>
            <div className="table-actions-toolbar">
              <button className="button button--ghost button--small" type="button" onClick={openModelosModal}>Modelos</button>
              <button className="button button--ghost button--small" type="button" onClick={openNewModal}>
                Nova proposta
              </button>
              <button
                className="button button--ghost button--small"
                type="button"
                disabled={!selectedProposta || !podeEditar(selectedProposta!)}
                onClick={() => selectedProposta && startEdit(selectedProposta)}
              >
                Editar
              </button>
              <button
                className="button button--small"
                type="button"
                disabled={!selectedProposta || !podeEnviar(selectedProposta!) || enviando || !!selectedProposta?.tokenAceite}
                onClick={() => selectedProposta && void handleEnviarParaCliente(selectedProposta)}
              >
                {enviando ? 'Enviando…' : selectedProposta?.tokenAceite ? 'Enviado' : 'Enviar para cliente'}
              </button>
              {selectedProposta?.tokenAceite && selectedProposta.status === 'AGUARDANDO_ASSINATURA' ? (
                <button
                  className="button button--ghost button--small"
                  type="button"
                  disabled={enviando}
                  onClick={() => void handleReenviarLinkCliente(selectedProposta)}
                >
                  {enviando ? 'Enviando…' : 'Reenviar link'}
                </button>
              ) : null}
              {selectedProposta?.contratoGerado ? (
                <span className="button button--ghost button--small" style={{ pointerEvents: 'none', opacity: 0.8 }}>
                  Contrato: {selectedProposta.contratoGerado.titulo}
                </span>
              ) : null}
              <button
                className="button button--danger button--small"
                type="button"
                disabled={!selectedProposta || !podeExcluir(selectedProposta!)}
                onClick={() => selectedProposta && void handleDelete(selectedProposta)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>

        {selectedProposta ? (
          <div className="selection-note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>
              Selecionado: <strong>{selectedProposta.titulo}</strong>
              {' · '}
              <span className={`status-pill status-pill--${selectedProposta.status.toLowerCase()}`}>
                {labelStatus(selectedProposta.status)}
              </span>
            </span>
            <button
              className="button button--ghost button--small"
              type="button"
              onClick={() => window.open(`/propostas/${selectedProposta.id}/preview`, '_blank')}
            >
              Visualizar proposta
            </button>
          </div>
        ) : null}

        {selectedProposta?.tokenAceite && selectedProposta.status === 'AGUARDANDO_ASSINATURA' ? (
          <div className="panel" style={{ background: 'var(--warning-bg, #fffbeb)', border: '1px solid #f59e0b', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong style={{ fontSize: 13 }}>Link de aceite para o cliente</strong>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 8px' }}>
                  Compartilhe este link com o cliente para que ele possa visualizar e aceitar a proposta.
                </p>
                <input
                  readOnly
                  value={`${window.location.origin}/proposta/${selectedProposta.tokenAceite}`}
                  style={{ width: '100%', fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'text' }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-end', paddingBottom: 2 }}>
                <button
                  className="button button--small"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${window.location.origin}/proposta/${selectedProposta.tokenAceite}`);
                    setSuccess('Link copiado para a área de transferência.');
                  }}
                >
                  Copiar link
                </button>
                <button
                  className="button button--ghost button--small"
                  type="button"
                  disabled={enviando}
                  onClick={() => void handleReenviarLinkCliente(selectedProposta)}
                >
                  {enviando ? 'Enviando…' : 'Reenviar por e-mail'}
                </button>
                <a
                  className="button button--ghost button--small"
                  href={`${window.location.origin}/proposta/${selectedProposta.tokenAceite}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? <LoadingBlock label="Carregando propostas..." /> : null}
        {!loading && filteredPropostas.length === 0 ? (
          <EmptyState message="Nenhuma proposta encontrada para este filtro." />
        ) : null}
        {!loading && filteredPropostas.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Proposta</th>
                  <th>Cliente</th>
                  <th>Produto/Serviço</th>
                  <th>Valor</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th>Link aceite</th>
                </tr>
              </thead>
              <tbody>
                {filteredPropostas.map((p) => (
                  <tr
                    key={p.id}
                    className={selectedId === p.id ? 'table-row--selected' : ''}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <td>
                      <strong>{p.titulo}</strong>
                      {p.objeto ? <div className="table-subline">{p.objeto}</div> : null}
                    </td>
                    <td>{p.cliente?.razaoSocial || p.clienteRazaoSocial || '—'}</td>
                    <td>{p.produtoServico?.nome || '—'}</td>
                    <td>{p.valor != null ? formatCurrency(Number(p.valor)) : '—'}</td>
                    <td>{p.validadeAte ? formatDate(String(p.validadeAte)) : '—'}</td>
                    <td>
                      <span className={`status-pill status-pill--${p.status.toLowerCase()}`}>
                        {labelStatus(p.status)}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {p.tokenAceite ? (
                        <button
                          className="button button--ghost button--small"
                          type="button"
                          title={`${window.location.origin}/proposta/${p.tokenAceite}`}
                          onClick={() => {
                            void navigator.clipboard.writeText(`${window.location.origin}/proposta/${p.tokenAceite}`);
                            setSuccess('Link copiado.');
                          }}
                        >
                          Copiar link
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Modal criar/editar */}
      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar proposta' : 'Nova proposta'}
        subtitle="Preencha os dados da proposta. Após o aceite do cliente, o contrato será gerado automaticamente."
        onClose={closeModal}
      >
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
          <div className="field">
            <label>Cliente *</label>
            <select
              value={form.clienteId}
              required
              onChange={(e) => handleClienteChange(e.target.value)}
            >
              <option value="">Selecione</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.razaoSocial}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Produto / Serviço</label>
            <select
              value={form.produtoServicoId}
              onChange={(e) => {
                const id = e.target.value;
                const prod = produtos.find((p) => p.id === id);
                setForm((f) => ({
                  ...f,
                  produtoServicoId: id,
                  titulo: f.titulo || prod?.nome || '',
                  objeto: f.objeto || prod?.descricao || '',
                }));
              }}
            >
              <option value="">Nenhum</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="field field--span-2">
            <label>Título *</label>
            <input
              value={form.titulo}
              required
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
          </div>

          <div className="field field--span-2">
            <label>Objeto / Descrição</label>
            <textarea
              rows={3}
              value={form.objeto}
              onChange={(e) => setForm((f) => ({ ...f, objeto: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Responsável interno</label>
            <input
              value={form.responsavelInterno}
              onChange={(e) => setForm((f) => ({ ...f, responsavelInterno: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Contato do cliente</label>
            <input
              value={form.contatoClienteNome}
              placeholder="Nome"
              onChange={(e) => setForm((f) => ({ ...f, contatoClienteNome: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>E-mail do cliente</label>
            <input
              type="email"
              value={form.contatoClienteEmail}
              onChange={(e) => setForm((f) => ({ ...f, contatoClienteEmail: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Telefone do cliente</label>
            <input
              value={form.contatoClienteTelefone}
              onChange={(e) => setForm((f) => ({ ...f, contatoClienteTelefone: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Valor total (R$)</label>
            <input
              value={form.valor}
              onChange={(e) => setForm((f) => ({ ...f, valor: maskCurrencyInputBRL(e.target.value) }))}
            />
          </div>

          <div className="field">
            <label>Forma de pagamento</label>
            <input
              value={form.formaPagamento}
              onChange={(e) => setForm((f) => ({ ...f, formaPagamento: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Periodicidade</label>
            <select
              value={form.periodicidadeCobranca}
              onChange={(e) => setForm((f) => ({ ...f, periodicidadeCobranca: e.target.value }))}
            >
              {periodicidades.map((p) => (
                <option key={p} value={p}>{labelize(p)}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Qtd. parcelas</label>
            <input
              type="number"
              min="1"
              value={form.quantidadeParcelas}
              onChange={(e) => setForm((f) => ({ ...f, quantidadeParcelas: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Primeiro vencimento</label>
            <input
              type="date"
              value={form.primeiroVencimento}
              onChange={(e) => setForm((f) => ({ ...f, primeiroVencimento: e.target.value }))}
            />
          </div>

          <div className="field field--span-2">
            <label>Grade de cobranças</label>
            <div className="table-actions-toolbar">
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={handleGerarCobrancas}
                disabled={!form.valor || !form.quantidadeParcelas || !form.primeiroVencimento}
              >
                Gerar grade de cobranças
              </button>
              {form.cobrancas.length > 0 ? (
                <span className="muted">{form.cobrancas.length} parcela(s) configurada(s)</span>
              ) : null}
            </div>
          </div>

          <div className="field">
            <label>Início dos serviços</label>
            <input
              type="date"
              value={form.dataInicio}
              onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Término previsto</label>
            <input
              type="date"
              value={form.dataFim}
              onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Validade da proposta</label>
            <input
              type="date"
              value={form.validadeAte}
              onChange={(e) => setForm((f) => ({ ...f, validadeAte: e.target.value }))}
            />
          </div>

          <div className="field field--span-2">
            <label>Observações</label>
            <textarea
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            />
          </div>

          <div className="field field--span-2">
            <div className="table-actions-toolbar" style={{ marginBottom: 4 }}>
              <label style={{ margin: 0 }}>Texto da proposta</label>
              {modelos.length > 0 ? (
                <select
                  style={{ flex: 'none', width: 'auto' }}
                  value=""
                  onChange={(e) => {
                    const m = modelos.find((m) => m.id === e.target.value);
                    if (m) setForm((c) => ({ ...c, textoPropostaBase: m.conteudo }));
                  }}
                >
                  <option value="">Aplicar modelo…</option>
                  {modelos.filter((m) => m.ativo).map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}{m.padrao ? ' (padrão)' : ''}</option>
                  ))}
                </select>
              ) : null}
            </div>
            <textarea
              rows={8}
              value={form.textoPropostaBase}
              onChange={(e) => setForm((f) => ({ ...f, textoPropostaBase: e.target.value }))}
              placeholder="Texto principal da proposta. Selecione um modelo acima ou escreva livremente."
            />
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar proposta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal grade de cobranças */}
      <Modal
        open={isCobrancasModalOpen}
        title="Grade de cobranças"
        subtitle="Revise e ajuste manualmente os vencimentos e valores de cada parcela."
        onClose={() => setIsCobrancasModalOpen(false)}
      >
        <div className="page-stack">
          <div className="table-actions-toolbar">
            <button
              className="button button--ghost button--small"
              type="button"
              onClick={() => {
                const valor = parseCurrencyInputBRL(form.valor);
                const qtd = parseInt(form.quantidadeParcelas, 10);
                if (valor && qtd && form.primeiroVencimento) {
                  setForm((f) => ({
                    ...f,
                    cobrancas: gerarCobrancas({ valor, periodicidadeCobranca: f.periodicidadeCobranca, quantidadeParcelas: qtd, primeiroVencimento: f.primeiroVencimento }),
                  }));
                }
              }}
            >
              Regenerar
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {form.cobrancas.map((c, i) => (
                  <tr key={c.ordem}>
                    <td>{c.ordem}</td>
                    <td>
                      <input
                        type="date"
                        value={c.vencimento}
                        onChange={(e) => {
                          const next = [...form.cobrancas];
                          next[i] = { ...next[i], vencimento: e.target.value };
                          setForm((f) => ({ ...f, cobrancas: next }));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        value={maskCurrencyInputBRL(String(Math.round(c.valor * 100)))}
                        onChange={(e) => {
                          const next = [...form.cobrancas];
                          next[i] = { ...next[i], valor: parseCurrencyInputBRL(e.target.value) || 0 };
                          setForm((f) => ({ ...f, cobrancas: next }));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        value={c.descricao ?? ''}
                        onChange={(e) => {
                          const next = [...form.cobrancas];
                          next[i] = { ...next[i], descricao: e.target.value };
                          setForm((f) => ({ ...f, cobrancas: next }));
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="button button--ghost button--small" type="button" onClick={() => setIsCobrancasModalOpen(false)}>
            Concluir
          </button>
        </div>
      </Modal>

      {/* Modal modelos de proposta */}
      <Modal
        open={isModelosModalOpen}
        title={editingModeloId ? 'Editar modelo de proposta' : 'Modelos de proposta'}
        subtitle="Crie textos base reutilizáveis e aplique-os ao criar uma proposta."
        onClose={() => { if (saving) return; setIsModelosModalOpen(false); setEditingModeloId(null); }}
      >
        <div className="page-stack">
          <div className="table-actions-toolbar">
            <button className="button button--ghost button--small" type="button" onClick={() => { setEditingModeloId(null); setModeloForm({ nome: '', descricao: '', conteudo: '', ativo: true, padrao: false }); }}>
              Novo modelo
            </button>
            <button
              className="button button--ghost button--small"
              type="button"
              onClick={() => {
                setEditingModeloId(null);
                setModeloForm({ nome: 'Proposta Consultoria — Estruturação e Diretoria Terceira', descricao: 'Modelo para propostas de consultoria financeira, administrativa e operacional.', conteudo: MODELO_PADRAO_AGB, ativo: true, padrao: modelos.length === 0 });
              }}
            >
              Importar modelo padrão
            </button>
          </div>

          {modelos.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Descrição</th>
                    <th>Status</th>
                    <th>Padrão</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {modelos.map((m) => (
                    <tr key={m.id}>
                      <td>{m.nome}</td>
                      <td>{m.descricao ?? '—'}</td>
                      <td>{m.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td>{m.padrao ? 'Sim' : 'Não'}</td>
                      <td>
                        <div className="table-actions-toolbar">
                          <button className="button button--ghost button--small" type="button" onClick={() => startEditModelo(m)}>Editar</button>
                          <button className="button button--danger button--small" type="button" onClick={() => void handleDeleteModelo(m)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <form className="form-grid" onSubmit={(e) => void handleSaveModelo(e)}>
            <div className="field">
              <label>Nome</label>
              <input value={modeloForm.nome} onChange={(e) => setModeloForm((c) => ({ ...c, nome: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Descrição</label>
              <input value={modeloForm.descricao} onChange={(e) => setModeloForm((c) => ({ ...c, descricao: e.target.value }))} />
            </div>
            <div className="field field--checkbox">
              <label><input type="checkbox" checked={modeloForm.ativo} onChange={(e) => setModeloForm((c) => ({ ...c, ativo: e.target.checked }))} /> Ativo</label>
            </div>
            <div className="field field--checkbox">
              <label><input type="checkbox" checked={modeloForm.padrao} onChange={(e) => setModeloForm((c) => ({ ...c, padrao: e.target.checked }))} /> Modelo padrão</label>
            </div>
            <div className="field field--span-2">
              <label>Conteúdo do modelo</label>
              <textarea
                value={modeloForm.conteudo}
                onChange={(e) => setModeloForm((c) => ({ ...c, conteudo: e.target.value }))}
                rows={10}
                placeholder="Texto base da proposta. Use variáveis como {{cliente_nome}}, {{valor_total}}, {{objeto}}, etc."
                required
              />
            </div>
            <div className="field field--span-2">
              <button className="button" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingModeloId ? 'Salvar modelo' : 'Criar modelo'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
