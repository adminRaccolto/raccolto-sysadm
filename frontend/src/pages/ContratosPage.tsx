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
  Contrato,
  ContratoCobranca,
  ModeloDocumento,
  Empresa,
  ProdutoServico,
  StatusAssinatura,
  StatusContrato,
} from '../types/api';
import {
  formatCurrency,
  formatDate,
  labelize,
  maskCurrencyInputBRL,
  parseCurrencyInputBRL,
} from '../utils/format';
import { useAuth } from '../contexts/AuthContext';

const periodicidades = [
  'MENSAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'QUADRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
] as const;

type FiltroContrato = 'ABERTOS' | 'FINALIZADOS' | 'TODOS';

type ContratoForm = {
  clienteId: string;
  produtoServicoId: string;
  numeroContrato: string;
  codigo: string;
  titulo: string;
  objeto: string;
  tipoContrato: string;
  responsavelInterno: string;
  valor: string;
  moeda: string;
  formaPagamento: string;
  periodicidadeCobranca: string;
  quantidadeParcelas: string;
  valorParcela: string;
  dataInicio: string;
  dataFim: string;
  primeiroVencimento: string;
  diaVencimento: string;
  indiceReajuste: string;
  periodicidadeReajuste: string;
  renovacaoAutomatica: boolean;
  status: StatusContrato;
  statusAssinatura: StatusAssinatura;
  dataEmissao: string;
  dataAssinatura: string;
  gerarProjetoAutomatico: boolean;
  gerarFinanceiroAutomatico: boolean;
  modeloContratoId: string;
  modeloContratoNome: string;
  textoContratoBase: string;
  observacoes: string;
  contatoClienteNome: string;
  contatoClienteEmail: string;
  contatoClienteTelefone: string;
  autentiqueDocId: string | null;
  autentiqueSignUrl: string | null;
  pdfAssinadoUrl: string | null;
  cobrancas: ContratoCobranca[];
};

type ModeloForm = {
  nome: string;
  descricao: string;
  conteudo: string;
  ativo: boolean;
  padrao: boolean;
};

const initialForm: ContratoForm = {
  clienteId: '',
  produtoServicoId: '',
  numeroContrato: '',
  codigo: '',
  titulo: '',
  objeto: '',
  tipoContrato: '',
  responsavelInterno: '',
  valor: '',
  moeda: 'BRL',
  formaPagamento: '',
  periodicidadeCobranca: 'MENSAL',
  quantidadeParcelas: '1',
  valorParcela: '',
  dataInicio: '',
  dataFim: '',
  primeiroVencimento: '',
  diaVencimento: '',
  indiceReajuste: '',
  periodicidadeReajuste: '',
  renovacaoAutomatica: false,
  status: 'ATIVO',
  statusAssinatura: 'PENDENTE',
  dataEmissao: '',
  dataAssinatura: '',
  gerarProjetoAutomatico: false,
  gerarFinanceiroAutomatico: true,
  modeloContratoId: '',
  modeloContratoNome: 'Contrato padrão',
  textoContratoBase: '',
  observacoes: '',
  autentiqueDocId: null,
  autentiqueSignUrl: null,
  contatoClienteNome: '',
  contatoClienteEmail: '',
  contatoClienteTelefone: '',
  pdfAssinadoUrl: null,
  cobrancas: [],
};

const initialModeloForm: ModeloForm = {
  nome: '',
  descricao: '',
  conteudo: '',
  ativo: true,
  padrao: false,
};

function resolveIntervaloMeses(periodicidade: string) {
  switch (periodicidade) {
    case 'BIMESTRAL':
      return 2;
    case 'TRIMESTRAL':
      return 3;
    case 'QUADRIMESTRAL':
      return 4;
    case 'SEMESTRAL':
      return 6;
    case 'ANUAL':
      return 12;
    default:
      return 1;
  }
}

function gerarCobrancas(params: {
  valor: number;
  periodicidadeCobranca: string;
  quantidadeParcelas: number;
  primeiroVencimento: string;
  valorParcela?: number;
}) {
  const intervaloMeses = resolveIntervaloMeses(params.periodicidadeCobranca);
  const valorParcela = params.valorParcela ?? Number((params.valor / params.quantidadeParcelas).toFixed(2));
  return Array.from({ length: params.quantidadeParcelas }).map((_, index) => {
    const vencimento = new Date(params.primeiroVencimento);
    vencimento.setMonth(vencimento.getMonth() + index * intervaloMeses);
    return {
      ordem: index + 1,
      vencimento: vencimento.toISOString().slice(0, 10),
      valor: valorParcela,
      descricao: `Parcela ${index + 1}/${params.quantidadeParcelas}`,
    } satisfies ContratoCobranca;
  });
}

function formatClienteEndereco(cliente?: Cliente | null) {
  if (!cliente) return '—';
  const partes = [
    cliente.logradouro,
    cliente.numero,
    cliente.complemento,
    cliente.bairro,
    cliente.cidade,
    cliente.estado,
    cliente.cep,
  ].filter(Boolean);
  return partes.length ? partes.join(', ') : '—';
}

function formatEmpresaEndereco(empresa?: Empresa | null) {
  if (!empresa) return '—';
  const partes = [
    empresa.logradouro,
    empresa.numero,
    empresa.complemento,
    empresa.bairro,
    empresa.cidade,
    empresa.estado,
    empresa.cep,
  ].filter(Boolean);
  return partes.length ? partes.join(', ') : '—';
}

function construirTextoPadrao(form: ContratoForm, cliente?: Cliente | null, empresa?: Empresa | null) {
  const grade = form.cobrancas.length
    ? form.cobrancas
        .map((item) => `Parcela ${item.ordem}: vencimento em ${formatDate(item.vencimento)} no valor de ${formatCurrency(item.valor)}${item.descricao ? ` (${item.descricao})` : ''}.`)
        .join('\n')
    : 'As condições de pagamento serão definidas conforme grade comercial deste contrato.';

  const partes = [
    'INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA',
    '',
    `CONTRATADA: ${empresa?.nomeFantasia || empresa?.nome || 'Empresa não informada'}${empresa?.cnpj ? `, inscrita no CPF/CNPJ sob o nº ${empresa.cnpj}` : ''}, com sede em ${formatEmpresaEndereco(empresa)}${empresa?.representanteNome ? `, neste ato representada por ${empresa.representanteNome}` : ''}${empresa?.representanteCargo ? `, na qualidade de ${empresa.representanteCargo}` : ''}.`,
    '',
    `CONTRATANTE: ${cliente?.razaoSocial || 'Cliente não informado'}${cliente?.cpfCnpj ? `, inscrito no CPF/CNPJ sob o nº ${cliente.cpfCnpj}` : ''}, residente ou sediado em ${formatClienteEndereco(cliente)}.`,
    '',
    'CLÁUSULA PRIMEIRA – DO OBJETO',
    `1.1. O objeto deste contrato é a prestação de serviços de consultoria empresarial pela CONTRATADA, visando a ${form.objeto || form.titulo || 'Prestação de serviços conforme escopo contratado.'} da CONTRATANTE.`,
    '',
    'CLÁUSULA SEGUNDA – DAS CONDIÇÕES DE EXECUÇÃO E PRAZOS',
    `2.1. Os serviços terão duração estimada de ${form.dataInicio && form.dataFim ? `${formatDate(form.dataInicio)} a ${formatDate(form.dataFim)}` : 'prazo a definir'}, com início em ${form.dataInicio ? formatDate(form.dataInicio) : 'data a definir'} e término previsto para ${form.dataFim ? formatDate(form.dataFim) : 'data a definir'}.`,
    '',
    'CLÁUSULA TERCEIRA – DOS HONORÁRIOS E DA MORA',
    `3.1. Pelos serviços, a CONTRATANTE pagará o valor global de ${form.valor ? formatCurrency(parseCurrencyInputBRL(form.valor) || 0) : 'R$ 0,00'}, dividido em parcelas conforme o cronograma financeiro aceito pelas partes abaixo representado:`,
    '',
    grade,
    '',
    `${empresa?.cidade || 'Localidade'}, ${new Date().getDate()} de ${new Date().toLocaleDateString('pt-BR', { month: 'long' })} de ${new Date().getFullYear()}.`,
  ].filter(Boolean);

  return partes.join('\n\n');
}

function mergeContratoTemplate(template: string, form: ContratoForm, cliente?: Cliente | null, empresa?: Empresa | null) {
  const grade = (form.cobrancas.length ? form.cobrancas : [])
    .map((item) => `- Parcela ${item.ordem}: ${formatDate(item.vencimento)} - ${formatCurrency(item.valor)}${item.descricao ? ` (${item.descricao})` : ''}`)
    .join('\n');

  const hoje = new Date();
  const empresaNome = empresa?.nomeFantasia || empresa?.nome || 'Raccolto';
  const empresaEndereco = formatEmpresaEndereco(empresa);
  const contratanteEndereco = formatClienteEndereco(cliente);
  const valorTotal = form.valor ? formatCurrency(parseCurrencyInputBRL(form.valor) || 0) : 'R$ 0,00';
  const dataInicio = form.dataInicio ? formatDate(form.dataInicio) : 'data a definir';
  const dataFim = form.dataFim ? formatDate(form.dataFim) : 'data a definir';

  const variaveis: Record<string, string> = {
    empresa_nome: empresaNome,
    cliente_razao_social: cliente?.razaoSocial || 'Cliente não informado',
    cliente_nome_fantasia: cliente?.nomeFantasia ? `, nome fantasia ${cliente.nomeFantasia}` : '',
    cliente_documento: cliente?.cpfCnpj ? `, documento ${cliente.cpfCnpj}` : '',
    cliente_ie: cliente?.inscricaoEstadual ? `, IE ${cliente.inscricaoEstadual}` : '',
    cliente_contato: cliente?.contatoPrincipal ? `Contato principal: ${cliente.contatoPrincipal}.` : '',
    cliente_email: cliente?.email ? `E-mail: ${cliente.email}.` : '',
    cliente_whatsapp: cliente?.whatsapp ? `WhatsApp: ${cliente.whatsapp}.` : '',
    cliente_endereco: contratanteEndereco,
    objeto: form.objeto || form.titulo || 'Prestação de serviços conforme escopo contratado.',
    data_inicio: dataInicio,
    data_fim: form.dataFim ? ` e término em ${dataFim}` : '',
    valor_total: valorTotal,
    periodicidade_cobranca: labelize(form.periodicidadeCobranca),
    forma_pagamento: form.formaPagamento || 'Conforme grade de cobrança',
    grade_cobranca: grade || 'Grade de cobrança não configurada.',
    observacoes: form.observacoes || '',

    contratada_nome_razao_social: empresa?.nome || empresaNome,
    contratada_documento: empresa?.cnpj || 'não informado',
    contratada_endereco_completo: empresaEndereco,
    contratada_representante_nome: empresa?.representanteNome || 'representante não informado',
    contratada_representante_cargo: empresa?.representanteCargo || 'cargo não informado',
    contratante_nome_razao_social: cliente?.razaoSocial || 'Cliente não informado',
    contratante_documento: cliente?.cpfCnpj || 'não informado',
    contratante_endereco_completo: contratanteEndereco,
    objeto_contrato: form.objeto || form.titulo || 'Prestação de serviços conforme escopo contratado.',
    duracao_contrato: form.dataInicio && form.dataFim ? `${dataInicio} a ${dataFim}` : 'prazo a definir',
    data_inicio_contrato: dataInicio,
    data_fim_contrato: dataFim,
    valor_global_contrato: valorTotal,
    grade_parcelamento_contrato: grade || 'Grade de cobrança não configurada.',
    localidade_assinatura: empresa?.cidade || 'Localidade',
    dia_assinatura: String(hoje.getDate()),
    mes_assinatura: hoje.toLocaleDateString('pt-BR', { month: 'long' }),
    ano_assinatura: String(hoje.getFullYear()),
  };

  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => variaveis[key] ?? '');
}

function baixarMinutaHtml(titulo: string, conteudo: string) {
  const safeTitle = (titulo || 'minuta-contrato').toLowerCase().replace(/[^a-z0-9]+/gi, '-');
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${titulo || 'Minuta de contrato'}</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 32px auto; color: #111827; }
      h1 { font-size: 24px; margin-bottom: 24px; }
      .content { white-space: pre-wrap; font-size: 14px; }
    </style>
  </head>
  <body>
    <h1>${titulo || 'Minuta de contrato'}</h1>
    <div class="content">${conteudo.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeTitle || 'minuta-contrato'}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ContratosPage() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [modelos, setModelos] = useState<ModeloDocumento[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroContrato>('ABERTOS');
  const [form, setForm] = useState<ContratoForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCobrancasModalOpen, setIsCobrancasModalOpen] = useState(false);
  const [isModelosModalOpen, setIsModelosModalOpen] = useState(false);
  const [editingModeloId, setEditingModeloId] = useState<string | null>(null);
  const [modeloForm, setModeloForm] = useState<ModeloForm>(initialModeloForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [clientesResponse, produtosResponse, contratosResponse, modelosResponse] = await Promise.all([
        http.get<Cliente[]>('/clientes'),
        http.get<ProdutoServico[]>('/produtos-servicos'),
        http.get<Contrato[]>('/contratos'),
        http.get<ModeloDocumento[]>('/modelos-documento?tipo=CONTRATO'),
      ]);
      setClientes(clientesResponse.data);
      setProdutos(produtosResponse.data);
      setContratos(contratosResponse.data);
      setModelos(modelosResponse.data);
      setSelectedId((current) => {
        if (!contratosResponse.data.length) return null;
        if (current && contratosResponse.data.some((item) => item.id === current)) return current;
        return contratosResponse.data[0].id;
      });
      const modeloPadrao = modelosResponse.data.find((item) => item.padrao) || modelosResponse.data[0] || null;
      setForm((current) => ({
        ...current,
        clienteId: current.clienteId || clientesResponse.data[0]?.id || '',
        produtoServicoId: current.produtoServicoId || produtosResponse.data[0]?.id || '',
        modeloContratoId: current.modeloContratoId || modeloPadrao?.id || '',
        modeloContratoNome: current.modeloContratoNome || modeloPadrao?.nome || 'Contrato padrão',
      }));
    } catch (err) {
      handleApiError(err, 'Falha ao carregar contratos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredContratos = useMemo(() => {
    if (filtro === 'TODOS') return contratos;
    if (filtro === 'FINALIZADOS') return contratos.filter((item) => item.status === 'ENCERRADO');
    return contratos.filter((item) => item.status !== 'ENCERRADO');
  }, [contratos, filtro]);

  const selectedContrato = useMemo(
    () => contratos.find((item) => item.id === selectedId) || null,
    [contratos, selectedId],
  );

  const clienteAtual = useMemo(
    () => clientes.find((item) => item.id === form.clienteId) || null,
    [clientes, form.clienteId],
  );

  function handleClienteChange(clienteId: string) {
    const cliente = clientes.find((c) => c.id === clienteId) || null;
    setForm((prev) => ({
      ...prev,
      clienteId,
      contatoClienteNome: cliente?.contatoPrincipal || prev.contatoClienteNome || '',
      contatoClienteEmail: cliente?.email || prev.contatoClienteEmail || '',
      contatoClienteTelefone: cliente?.whatsapp || cliente?.telefone || prev.contatoClienteTelefone || '',
    }));
  }

  function resetForm() {
    const modeloPadrao = modelos.find((item) => item.padrao) || modelos[0] || null;
    const primeiroCliente = clientes[0] || null;
    setEditingId(null);
    setForm({
      ...initialForm,
      clienteId: primeiroCliente?.id || '',
      contatoClienteNome: primeiroCliente?.contatoPrincipal || '',
      contatoClienteEmail: primeiroCliente?.email || '',
      contatoClienteTelefone: primeiroCliente?.whatsapp || primeiroCliente?.telefone || '',
      produtoServicoId: produtos[0]?.id || '',
      modeloContratoId: modeloPadrao?.id || '',
      modeloContratoNome: modeloPadrao?.nome || 'Contrato padrão',
    });
  }

  function openNewModal() {
    resetForm();
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeModal() {
    if (saving) return;
    resetForm();
    setIsModalOpen(false);
    setIsCobrancasModalOpen(false);
  }

  function startEdit(contrato: Contrato) {
    const modeloSelecionado = modelos.find((item) => item.nome === (contrato.modeloContratoNome || '')) || null;
    setSelectedId(contrato.id);
    setEditingId(contrato.id);
    setForm({
      clienteId: contrato.clienteId,
      produtoServicoId: contrato.produtoServicoId || '',
      numeroContrato: contrato.numeroContrato || '',
      codigo: contrato.codigo || '',
      titulo: contrato.titulo,
      objeto: contrato.objeto || '',
      tipoContrato: contrato.tipoContrato || '',
      responsavelInterno: contrato.responsavelInterno || '',
      valor: contrato.valor ? maskCurrencyInputBRL(String(Math.round(contrato.valor * 100))) : '',
      moeda: contrato.moeda || 'BRL',
      formaPagamento: contrato.formaPagamento || '',
      periodicidadeCobranca: contrato.periodicidadeCobranca || 'MENSAL',
      quantidadeParcelas: String(contrato.quantidadeParcelas || 1),
      valorParcela: contrato.valorParcela ? maskCurrencyInputBRL(String(Math.round(contrato.valorParcela * 100))) : '',
      dataInicio: contrato.dataInicio.slice(0, 10),
      dataFim: contrato.dataFim?.slice(0, 10) || '',
      primeiroVencimento: contrato.primeiroVencimento?.slice(0, 10) || '',
      diaVencimento: contrato.diaVencimento ? String(contrato.diaVencimento) : '',
      indiceReajuste: contrato.indiceReajuste || '',
      periodicidadeReajuste: contrato.periodicidadeReajuste || '',
      renovacaoAutomatica: contrato.renovacaoAutomatica,
      status: contrato.status,
      statusAssinatura: contrato.statusAssinatura,
      dataEmissao: contrato.dataEmissao?.slice(0, 10) || '',
      dataAssinatura: contrato.dataAssinatura?.slice(0, 10) || '',
      gerarProjetoAutomatico: contrato.gerarProjetoAutomatico,
      gerarFinanceiroAutomatico: contrato.gerarFinanceiroAutomatico,
      modeloContratoId: modeloSelecionado?.id || '',
      modeloContratoNome: contrato.modeloContratoNome || 'Contrato padrão',
      textoContratoBase: contrato.textoContratoBase || '',
      contatoClienteNome: contrato.contatoClienteNome || '',
      contatoClienteEmail: contrato.contatoClienteEmail || '',
      contatoClienteTelefone: contrato.contatoClienteTelefone || '',
      observacoes: contrato.observacoes || '',
      autentiqueDocId: contrato.autentiqueDocId ?? null,
      autentiqueSignUrl: contrato.autentiqueSignUrl ?? null,
      pdfAssinadoUrl: contrato.pdfAssinadoUrl ?? null,
      cobrancas: (contrato.cobrancas || []).map((item) => ({
        id: item.id,
        ordem: item.ordem,
        vencimento: item.vencimento.slice(0, 10),
        valor: item.valor,
        descricao: item.descricao || '',
      })),
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function openModelosModal() {
    setEditingModeloId(null);
    setModeloForm(initialModeloForm);
    setIsModelosModalOpen(true);
  }

  function startEditModelo(modelo: ModeloDocumento) {
    setEditingModeloId(modelo.id);
    setModeloForm({
      nome: modelo.nome,
      descricao: modelo.descricao || '',
      conteudo: modelo.conteudo,
      ativo: modelo.ativo,
      padrao: modelo.padrao,
    });
    setIsModelosModalOpen(true);
  }

  function aplicarTextoPadrao() {
    const modelo = modelos.find((item) => item.id === form.modeloContratoId) || modelos.find((item) => item.padrao) || null;
    const texto = modelo ? mergeContratoTemplate(modelo.conteudo, form, clienteAtual, user?.empresa ?? null) : construirTextoPadrao(form, clienteAtual, user?.empresa ?? null);
    setForm((current) => ({
      ...current,
      modeloContratoNome: modelo?.nome || current.modeloContratoNome,
      textoContratoBase: texto,
    }));
  }

  function abrirModalCobrancas() {
    const valor = parseCurrencyInputBRL(form.valor);
    const quantidadeParcelas = Number(form.quantidadeParcelas || '0');
    const valorParcela = parseCurrencyInputBRL(form.valorParcela);
    if (!valor || !quantidadeParcelas || !form.primeiroVencimento) {
      setError('Preencha valor total, quantidade de parcelas e primeiro vencimento para gerar a grade.');
      return;
    }
    const grade = form.cobrancas.length
      ? form.cobrancas
      : gerarCobrancas({
          valor,
          periodicidadeCobranca: form.periodicidadeCobranca,
          quantidadeParcelas,
          primeiroVencimento: form.primeiroVencimento,
          valorParcela: valorParcela || undefined,
        });
    setForm((current) => ({ ...current, cobrancas: grade }));
    setIsCobrancasModalOpen(true);
    setError(null);
  }

  async function handleSaveModelo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        nome: modeloForm.nome.trim(),
        ...(modeloForm.descricao ? { descricao: modeloForm.descricao.trim() } : {}),
        conteudo: modeloForm.conteudo,
        ativo: modeloForm.ativo,
        padrao: modeloForm.padrao,
      };
      if (editingModeloId) {
        await http.put(`/modelos-documento/${editingModeloId}`, payload);
        setSuccess('Modelo de contrato atualizado com sucesso.');
      } else {
        await http.post('/modelos-documento', { ...payload, tipo: 'CONTRATO' });
        setSuccess('Modelo de contrato criado com sucesso.');
      }
      setIsModelosModalOpen(false);
      setEditingModeloId(null);
      setModeloForm(initialModeloForm);
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao salvar modelo de contrato.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModelo(modelo: ModeloDocumento) {
    const confirmed = window.confirm(`Excluir o modelo "${modelo.nome}"?`);
    if (!confirmed) return;
    try {
      await http.delete(`/modelos-documento/${modelo.id}`);
      setSuccess('Modelo de contrato excluído com sucesso.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir modelo de contrato.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        clienteId: form.clienteId,
        ...(form.contatoClienteNome ? { contatoClienteNome: form.contatoClienteNome } : {}),
        ...(form.contatoClienteEmail ? { contatoClienteEmail: form.contatoClienteEmail } : {}),
        ...(form.contatoClienteTelefone ? { contatoClienteTelefone: form.contatoClienteTelefone } : {}),
        ...(form.produtoServicoId ? { produtoServicoId: form.produtoServicoId } : {}),
        ...(form.numeroContrato ? { numeroContrato: form.numeroContrato } : {}),
        ...(form.codigo ? { codigo: form.codigo } : {}),
        titulo: form.titulo,
        ...(form.objeto ? { objeto: form.objeto } : {}),
        ...(form.tipoContrato ? { tipoContrato: form.tipoContrato } : {}),
        ...(form.responsavelInterno ? { responsavelInterno: form.responsavelInterno } : {}),
        valor: parseCurrencyInputBRL(form.valor),
        moeda: form.moeda,
        ...(form.formaPagamento ? { formaPagamento: form.formaPagamento } : {}),
        periodicidadeCobranca: form.periodicidadeCobranca,
        quantidadeParcelas: form.quantidadeParcelas ? Number(form.quantidadeParcelas) : undefined,
        valorParcela: parseCurrencyInputBRL(form.valorParcela),
        dataInicio: form.dataInicio,
        ...(form.dataFim ? { dataFim: form.dataFim } : {}),
        ...(form.primeiroVencimento ? { primeiroVencimento: form.primeiroVencimento } : {}),
        ...(form.diaVencimento ? { diaVencimento: Number(form.diaVencimento) } : {}),
        ...(form.indiceReajuste ? { indiceReajuste: form.indiceReajuste } : {}),
        ...(form.periodicidadeReajuste ? { periodicidadeReajuste: form.periodicidadeReajuste } : {}),
        renovacaoAutomatica: form.renovacaoAutomatica,
        status: form.status,
        statusAssinatura: form.statusAssinatura,
        ...(form.dataEmissao ? { dataEmissao: form.dataEmissao } : {}),
        ...(form.dataAssinatura ? { dataAssinatura: form.dataAssinatura } : {}),
        gerarProjetoAutomatico: form.gerarProjetoAutomatico,
        gerarFinanceiroAutomatico: form.gerarFinanceiroAutomatico,
        ...(form.modeloContratoNome ? { modeloContratoNome: form.modeloContratoNome } : {}),
        ...(form.textoContratoBase ? { textoContratoBase: form.textoContratoBase } : {}),
        ...(form.observacoes ? { observacoes: form.observacoes } : {}),
        cobrancas: form.cobrancas.map((item) => ({
          ordem: item.ordem,
          vencimento: item.vencimento,
          valor: item.valor,
          ...(item.descricao ? { descricao: item.descricao } : {}),
        })),
      };

      if (editingId) {
        await http.put(`/contratos/${editingId}`, payload);
        setSuccess('Contrato atualizado com sucesso.');
      } else {
        await http.post('/contratos', payload);
        setSuccess('Contrato cadastrado com sucesso.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      handleApiError(err, editingId ? 'Falha ao atualizar contrato.' : 'Falha ao cadastrar contrato.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEnviarAssinatura(contrato: Contrato) {
    setError(null);
    setSuccess(null);
    try {
      await http.post(`/contratos/${contrato.id}/enviar-assinatura`);
      setSuccess(`Contrato "${contrato.titulo}" enviado para assinatura digital. O cliente receberá o link por e-mail.`);
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao enviar contrato para assinatura.');
    }
  }

  async function handleReenviarLink(contrato: Contrato) {
    setError(null);
    setSuccess(null);
    try {
      const res = await http.post<{ message: string }>(`/contratos/${contrato.id}/reenviar-link`);
      setSuccess(res.data.message || 'Link reenviado com sucesso.');
    } catch (err) {
      handleApiError(err, 'Falha ao reenviar link.');
    }
  }

  function handleBaixarPdf(contrato: Contrato) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('raccolto_token');
    const url = `${apiUrl}/contratos/${contrato.id}/pdf`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contrato.titulo}.pdf`;
    // Usa fetch para incluir autenticação
    void fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } })
      .then((r) => r.blob())
      .then((blob) => {
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setError('Falha ao gerar PDF.'));
  }

  async function handleAssinarEmpresa(contrato: Contrato) {
    if (!confirm(`Confirmar assinatura da empresa no contrato "${contrato.titulo}"? O PDF será gerado e enviado ao cliente por e-mail.`)) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await http.post<{ message: string }>(`/contratos/${contrato.id}/assinar-empresa`);
      setSuccess(res.data.message || 'Contrato assinado e enviado ao cliente.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao assinar contrato.');
    }
  }

  async function handleDelete(contrato: Contrato) {
    const confirmed = window.confirm(
      `Excluir o contrato "${contrato.titulo}"? A exclusão só funciona se ele ainda não tiver vínculos operacionais.`,
    );
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    try {
      await http.delete(`/contratos/${contrato.id}`);
      setSuccess('Contrato excluído com sucesso.');
      if (editingId === contrato.id) closeModal();
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir contrato.');
    }
  }

  function handleApiError(err: unknown, fallback: string) {
    if (axios.isAxiosError(err)) {
      const payload = err.response?.data?.message;
      setError(Array.isArray(payload) ? payload.join(' | ') : payload || fallback);
      return;
    }
    setError(fallback);
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Contratos"
        subtitle="Contratos com grade de cobrança editável, herança automática dos dados do cliente e repositório de modelos para a minuta."
        chips={loading ? [] : (() => {
          const ativos = contratos.filter((c) => c.status === 'ATIVO').length;
          const hoje = new Date();
          const em30 = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
          const aVencer = contratos.filter((c) => c.status === 'ATIVO' && c.dataFim && new Date(c.dataFim) >= hoje && new Date(c.dataFim) <= em30).length;
          return [
            { label: `${ativos} ativo${ativos !== 1 ? 's' : ''}` },
            ...(aVencer > 0 ? [{ label: `${aVencer} a vencer`, alert: true }] : []),
          ];
        })()}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div>
            <h3>Contratos atuais</h3>
            <p>{filteredContratos.length} contrato(s) no filtro atual.</p>
          </div>
          <div className="header-tools">
            <div className="segmented">
              {(['ABERTOS', 'FINALIZADOS', 'TODOS'] as FiltroContrato[]).map((item) => (
                <button
                  key={item}
                  className={`segmented__button${filtro === item ? ' segmented__button--active' : ''}`}
                  type="button"
                  onClick={() => setFiltro(item)}
                >
                  {item === 'ABERTOS' ? 'Abertos' : item === 'FINALIZADOS' ? 'Finalizados' : 'Todos'}
                </button>
              ))}
            </div>
            <div className="table-actions-toolbar">
              <button className="button button--ghost button--small" type="button" onClick={openNewModal}>Novo</button>
              <button className="button button--ghost button--small" type="button" disabled={!selectedContrato} onClick={() => selectedContrato && startEdit(selectedContrato)}>Editar</button>
              <button
                className="button button--small"
                type="button"
                disabled={!selectedContrato || !!selectedContrato.autentiqueDocId}
                title={selectedContrato?.autentiqueDocId ? 'Já enviado para assinatura' : 'Enviar para assinatura digital via Autentique'}
                onClick={() => selectedContrato && void handleEnviarAssinatura(selectedContrato)}
              >
                {selectedContrato?.statusAssinatura === 'ASSINADO' ? 'Assinado' : selectedContrato?.autentiqueDocId ? 'Aguardando assinatura' : 'Enviar para assinar'}
              </button>
              {selectedContrato?.autentiqueSignUrl && selectedContrato.statusAssinatura !== 'ASSINADO' ? (
                <>
                  <button
                    className="button button--ghost button--small"
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(selectedContrato.autentiqueSignUrl!);
                      setSuccess('Link copiado.');
                    }}
                  >
                    Copiar link
                  </button>
                  <button
                    className="button button--ghost button--small"
                    type="button"
                    onClick={() => void handleReenviarLink(selectedContrato)}
                  >
                    Reenviar por e-mail
                  </button>
                </>
              ) : null}
              {selectedContrato ? (
                <button
                  className="button button--ghost button--small"
                  type="button"
                  onClick={() => handleBaixarPdf(selectedContrato)}
                  title="Baixar PDF do contrato com variáveis preenchidas"
                >
                  Baixar PDF
                </button>
              ) : null}
              {selectedContrato && selectedContrato.statusAssinatura !== 'ASSINADO' ? (
                <button
                  className="button button--small"
                  type="button"
                  onClick={() => void handleAssinarEmpresa(selectedContrato)}
                  title="Registrar assinatura da empresa e enviar contrato ao cliente"
                >
                  Assinar pela empresa
                </button>
              ) : null}
              {selectedContrato?.pdfAssinadoUrl ? (
                <a className="button button--ghost button--small" href={selectedContrato.pdfAssinadoUrl} target="_blank" rel="noreferrer">PDF assinado</a>
              ) : null}
              <button className="button button--danger button--small" type="button" disabled={!selectedContrato} onClick={() => selectedContrato && void handleDelete(selectedContrato)}>Excluir</button>
            </div>
          </div>
        </div>

        {selectedContrato ? <div className="selection-note">Selecionado: <strong>{selectedContrato.titulo}</strong></div> : null}

        {loading ? <LoadingBlock label="Carregando contratos..." /> : null}
        {!loading && filteredContratos.length === 0 ? <EmptyState message="Nenhum contrato encontrado para este filtro." /> : null}
        {!loading && filteredContratos.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Cliente</th>
                  <th>Modelo</th>
                  <th>Assinatura</th>
                  <th>Vigência</th>
                  <th>Valor</th>
                  <th>Link assinatura</th>
                </tr>
              </thead>
              <tbody>
                {filteredContratos.map((contrato) => (
                  <tr key={contrato.id} className={selectedId === contrato.id ? 'table-row--selected' : ''} onClick={() => setSelectedId(contrato.id)}>
                    <td>
                      <strong>{contrato.titulo}</strong>
                      <div className="table-subline">{contrato.codigo || contrato.numeroContrato || 'Sem código'} · {labelize(contrato.status)}</div>
                    </td>
                    <td>{contrato.cliente?.razaoSocial || contrato.clienteRazaoSocial || '—'}</td>
                    <td>{contrato.modeloContratoNome || '—'}</td>
                    <td><span className={`status-pill status-pill--${contrato.statusAssinatura.toLowerCase()}`}>{labelize(contrato.statusAssinatura)}</span></td>
                    <td>{formatDate(contrato.dataInicio)} até {formatDate(contrato.dataFim)}</td>
                    <td>{formatCurrency(contrato.valor)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {contrato.autentiqueSignUrl ? (
                        <button
                          className="button button--ghost button--small"
                          type="button"
                          title={contrato.autentiqueSignUrl}
                          onClick={() => {
                            void navigator.clipboard.writeText(contrato.autentiqueSignUrl!);
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

      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar contrato' : 'Novo contrato'}
        subtitle={clienteAtual ? `Dados da parte contratante herdados automaticamente de ${clienteAtual.razaoSocial}.` : 'Selecione um cliente e estruture o contrato.'}
        onClose={closeModal}
      >
        <form className="form-grid form-grid--3 form-grid--compact" onSubmit={handleSubmit}>
          {/* Row: Cliente (1) + Produto/serviço (1) + Status (1) */}
          <div className="field">
            <label>Cliente</label>
            <select value={form.clienteId} onChange={(e) => handleClienteChange(e.target.value)} required>
              <option value="">Selecione</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.razaoSocial}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Produto/serviço</label>
            <select value={form.produtoServicoId} onChange={(e) => setForm((c) => ({ ...c, produtoServicoId: e.target.value }))}>
              <option value="">Selecione</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>{produto.nome}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as StatusContrato }))}>
              <option value="RASCUNHO">Rascunho</option>
              <option value="ATIVO">Ativo</option>
              <option value="SUSPENSO">Suspenso</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </div>

          {/* Row: Contato cliente (1) + E-mail (1) + Telefone (1) */}
          <div className="field">
            <label>Contato do cliente</label>
            <input value={form.contatoClienteNome} onChange={(e) => setForm((c) => ({ ...c, contatoClienteNome: e.target.value }))} placeholder="Nome do responsável" />
          </div>
          <div className="field">
            <label>E-mail do cliente</label>
            <input type="email" value={form.contatoClienteEmail} onChange={(e) => setForm((c) => ({ ...c, contatoClienteEmail: e.target.value }))} placeholder="email@cliente.com.br" />
          </div>
          <div className="field">
            <label>Telefone do cliente</label>
            <input value={form.contatoClienteTelefone} onChange={(e) => setForm((c) => ({ ...c, contatoClienteTelefone: e.target.value }))} placeholder="(11) 99999-9999" />
          </div>

          {/* Row: Título (3) */}
          <div className="field field--span-3">
            <label>Título</label>
            <input value={form.titulo} onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))} required />
          </div>

          {/* Row: Nº contrato (1) + Código interno (1) + Responsável interno (1) */}
          <div className="field">
            <label>Número do contrato</label>
            <input value={form.numeroContrato} onChange={(e) => setForm((c) => ({ ...c, numeroContrato: e.target.value }))} />
          </div>
          <div className="field">
            <label>Código interno</label>
            <input value={form.codigo} onChange={(e) => setForm((c) => ({ ...c, codigo: e.target.value }))} />
          </div>
          <div className="field">
            <label>Responsável interno</label>
            <input value={form.responsavelInterno} onChange={(e) => setForm((c) => ({ ...c, responsavelInterno: e.target.value }))} />
          </div>

          {/* Row: Objeto (2) + Tipo de contrato (1) */}
          <div className="field field--span-2">
            <label>Objeto</label>
            <input value={form.objeto} onChange={(e) => setForm((c) => ({ ...c, objeto: e.target.value }))} />
          </div>
          <div className="field">
            <label>Tipo de contrato</label>
            <input value={form.tipoContrato} onChange={(e) => setForm((c) => ({ ...c, tipoContrato: e.target.value }))} />
          </div>

          {/* Row: Valor total (1) + Forma de pagamento (1) + Periodicidade (1) */}
          <div className="field">
            <label>Valor total</label>
            <input value={form.valor} onChange={(e) => setForm((c) => ({ ...c, valor: maskCurrencyInputBRL(e.target.value) }))} placeholder="R$ 0,00" />
          </div>
          <div className="field">
            <label>Forma de pagamento</label>
            <input value={form.formaPagamento} onChange={(e) => setForm((c) => ({ ...c, formaPagamento: e.target.value }))} placeholder="Ex.: parcelado" />
          </div>
          <div className="field">
            <label>Periodicidade de cobrança</label>
            <select value={form.periodicidadeCobranca} onChange={(e) => setForm((c) => ({ ...c, periodicidadeCobranca: e.target.value }))}>
              {periodicidades.map((item) => (
                <option key={item} value={item}>{labelize(item)}</option>
              ))}
            </select>
          </div>

          {/* Row: Qtd parcelas (1) + Primeiro vencimento (1) + Valor por parcela (1) */}
          <div className="field">
            <label>Quantidade de parcelas</label>
            <input type="number" min={1} value={form.quantidadeParcelas} onChange={(e) => setForm((c) => ({ ...c, quantidadeParcelas: e.target.value }))} />
          </div>
          <div className="field">
            <label>Primeiro vencimento</label>
            <input type="date" value={form.primeiroVencimento} onChange={(e) => setForm((c) => ({ ...c, primeiroVencimento: e.target.value }))} />
          </div>
          <div className="field">
            <label>Valor sugerido por parcela</label>
            <input value={form.valorParcela} onChange={(e) => setForm((c) => ({ ...c, valorParcela: maskCurrencyInputBRL(e.target.value) }))} placeholder="R$ 0,00" />
          </div>

          {/* Row: Data início (1) + Data fim (1) + Grade de cobrança (1) */}
          <div className="field">
            <label>Data de início</label>
            <input type="date" value={form.dataInicio} onChange={(e) => setForm((c) => ({ ...c, dataInicio: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Data fim</label>
            <input type="date" value={form.dataFim} onChange={(e) => setForm((c) => ({ ...c, dataFim: e.target.value }))} />
          </div>
          <div className="field">
            <label>Grade de cobrança</label>
            <div className="selection-note" style={{ padding: '6px 10px' }}>
              {form.cobrancas.length ? `${form.cobrancas.length} cobrança(s)` : 'Nenhuma gerada'}
              <button className="button button--ghost button--small" type="button" style={{ marginLeft: 8 }} onClick={abrirModalCobrancas}>Configurar</button>
            </div>
          </div>

          {/* Row: Modelo (2) + Status assinatura (1) */}
          <div className="field field--span-2">
            <label>Modelo de contrato</label>
            <div className="table-actions-toolbar">
              <select value={form.modeloContratoId} onChange={(e) => {
                const modelo = modelos.find((item) => item.id === e.target.value) || null;
                setForm((c) => ({ ...c, modeloContratoId: e.target.value, modeloContratoNome: modelo?.nome || c.modeloContratoNome }));
              }}>
                <option value="">Selecione</option>
                {modelos.map((modelo) => (
                  <option key={modelo.id} value={modelo.id}>{modelo.nome}{modelo.padrao ? ' (padrão)' : ''}</option>
                ))}
              </select>
              <button className="button button--ghost button--small" type="button" onClick={openModelosModal}>Modelos</button>
            </div>
          </div>
          <div className="field">
            <label>Status da assinatura</label>
            <input
              value={form.statusAssinatura.replace(/_/g, ' ')}
              readOnly
              disabled
              title="O status é gerenciado automaticamente pelo fluxo de assinatura digital"
              style={{ background: 'var(--surface-soft)', color: 'var(--muted)', cursor: 'not-allowed' }}
            />
          </div>

          {/* Row: checkboxes (3) */}
          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.renovacaoAutomatica} onChange={(e) => setForm((c) => ({ ...c, renovacaoAutomatica: e.target.checked }))} />
              Renovação automática
            </label>
          </div>
          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.gerarProjetoAutomatico} onChange={(e) => setForm((c) => ({ ...c, gerarProjetoAutomatico: e.target.checked }))} />
              Gerar projeto automaticamente
            </label>
          </div>
          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.gerarFinanceiroAutomatico} onChange={(e) => setForm((c) => ({ ...c, gerarFinanceiroAutomatico: e.target.checked }))} />
              Gerar financeiro conforme grade
            </label>
          </div>

          {/* Row: Texto base (3) */}
          <div className="field field--span-3">
            <label>Texto base do contrato</label>
            <div className="table-actions-toolbar" style={{ marginBottom: 6 }}>
              <button className="button button--ghost button--small" type="button" onClick={aplicarTextoPadrao}>Aplicar modelo</button>
              <button className="button button--ghost button--small" type="button" onClick={() => baixarMinutaHtml(form.titulo, form.textoContratoBase || construirTextoPadrao(form, clienteAtual, user?.empresa ?? null))}>Baixar minuta editável</button>
            </div>
            <textarea value={form.textoContratoBase} onChange={(e) => setForm((c) => ({ ...c, textoContratoBase: e.target.value }))} rows={2} />
          </div>

          {/* Row: Observações (3) */}
          <div className="field field--span-3">
            <label>Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm((c) => ({ ...c, observacoes: e.target.value }))} rows={1} />
          </div>

          <div className="field field--span-3">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar contrato'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isCobrancasModalOpen}
        title="Configurar cobranças"
        subtitle="Revise e ajuste manualmente os vencimentos e valores. Esta grade será a base para o financeiro do contrato."
        onClose={() => setIsCobrancasModalOpen(false)}
      >
        <div className="page-stack">
          <div className="table-actions-toolbar">
            <button
              className="button button--ghost button--small"
              type="button"
              onClick={() => {
                const valor = parseCurrencyInputBRL(form.valor);
                const quantidadeParcelas = Number(form.quantidadeParcelas || '0');
                const valorParcela = parseCurrencyInputBRL(form.valorParcela);
                if (!valor || !quantidadeParcelas || !form.primeiroVencimento) {
                  setError('Preencha valor, quantidade de parcelas e primeiro vencimento antes de gerar a grade.');
                  return;
                }
                setForm((current) => ({
                  ...current,
                  cobrancas: gerarCobrancas({
                    valor,
                    periodicidadeCobranca: current.periodicidadeCobranca,
                    quantidadeParcelas,
                    primeiroVencimento: current.primeiroVencimento,
                    valorParcela: valorParcela || undefined,
                  }),
                }));
              }}
            >
              Regenerar grade
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {form.cobrancas.map((item, index) => (
                  <tr key={`${item.ordem}-${index}`}>
                    <td>{item.ordem}</td>
                    <td>
                      <input
                        type="date"
                        value={item.vencimento}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            cobrancas: current.cobrancas.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, vencimento: e.target.value } : row,
                            ),
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={maskCurrencyInputBRL(String(Math.round(item.valor * 100)))}
                        onChange={(e) => {
                          const parsed = parseCurrencyInputBRL(e.target.value) ?? 0;
                          setForm((current) => ({
                            ...current,
                            cobrancas: current.cobrancas.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, valor: parsed } : row,
                            ),
                          }));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        value={item.descricao || ''}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            cobrancas: current.cobrancas.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, descricao: e.target.value } : row,
                            ),
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-actions-toolbar">
            <button className="button button--ghost button--small" type="button" onClick={() => setIsCobrancasModalOpen(false)}>Concluir</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isModelosModalOpen}
        title={editingModeloId ? 'Editar modelo de contrato' : 'Modelos de contrato'}
        subtitle="Mantenha os textos base do contrato em um repositório próprio e aplique-os na minuta com preenchimento automático."
        onClose={() => {
          if (saving) return;
          setIsModelosModalOpen(false);
          setEditingModeloId(null);
        }}
      >
        <div className="page-stack">
          <div className="table-actions-toolbar">
            <button className="button button--ghost button--small" type="button" onClick={() => { setEditingModeloId(null); setModeloForm(initialModeloForm); }}>Novo modelo</button>
          </div>

          <div className="table-wrap">
            <table>
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
                {modelos.map((modelo) => (
                  <tr key={modelo.id}>
                    <td>{modelo.nome}</td>
                    <td>{modelo.descricao || '—'}</td>
                    <td>{modelo.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td>{modelo.padrao ? 'Sim' : 'Não'}</td>
                    <td>
                      <div className="table-actions-toolbar">
                        <button className="button button--ghost button--small" type="button" onClick={() => startEditModelo(modelo)}>Editar</button>
                        <button className="button button--danger button--small" type="button" onClick={() => void handleDeleteModelo(modelo)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className="form-grid" onSubmit={handleSaveModelo}>
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
                placeholder="Use variáveis como {{contratada_nome_razao_social}}, {{contratada_documento}}, {{contratante_nome_razao_social}}, {{objeto_contrato}}, {{valor_global_contrato}}, {{grade_parcelamento_contrato}}"
                required
              />
            </div>
            <div className="field field--span-2">
              <button className="button" type="submit" disabled={saving}>{saving ? 'Salvando...' : editingModeloId ? 'Salvar modelo' : 'Criar modelo'}</button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
