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
  ItemReembolso,
  Projeto,
  RelatorioReembolso,
  TipoItemReembolso,
  UsuarioResumo,
} from '../types/api';
import { formatCurrency, formatDate } from '../utils/format';

type StatusRelatorio = RelatorioReembolso['status'];

function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    return typeof msg === 'string' ? msg : fallback;
  }
  return fallback;
}

const TIPO_LABELS: Record<TipoItemReembolso, string> = {
  KM: 'Quilometragem',
  PEDAGIO: 'Pedágio',
  ALIMENTACAO: 'Alimentação',
  HOSPEDAGEM: 'Hospedagem',
  OUTRO: 'Outro',
};

const STATUS_LABELS: Record<StatusRelatorio, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  FINANCEIRO_GERADO: 'Financeiro Gerado',
};

const STATUS_CLASS: Record<StatusRelatorio, string> = {
  RASCUNHO: 'badge--muted',
  AGUARDANDO_APROVACAO: 'badge--warning',
  APROVADO: 'badge--success',
  REPROVADO: 'badge--danger',
  FINANCEIRO_GERADO: 'badge--info',
};

interface ItemForm {
  _key: string;
  tipo: TipoItemReembolso;
  data: string;
  descricao: string;
  km: string;
  precoKm: string;
  valor: string;
}

interface ClienteRateioForm {
  _key: string;
  clienteId: string;
  percentual: string;
}

interface RelatorioForm {
  titulo: string;
  projetoId: string;
  responsavelId: string;
  dataInicio: string;
  dataFim: string;
  observacoes: string;
  itens: ItemForm[];
  clientesRateio: ClienteRateioForm[];
}

const newItemKey = () => Math.random().toString(36).slice(2);

const emptyItem = (): ItemForm => ({
  _key: newItemKey(),
  tipo: 'KM',
  data: '',
  descricao: '',
  km: '',
  precoKm: '',
  valor: '',
});

const emptyRateio = (): ClienteRateioForm => ({
  _key: newItemKey(),
  clienteId: '',
  percentual: '',
});

const emptyForm = (): RelatorioForm => ({
  titulo: '',
  projetoId: '',
  responsavelId: '',
  dataInicio: '',
  dataFim: '',
  observacoes: '',
  itens: [emptyItem()],
  clientesRateio: [emptyRateio()],
});

function relatorioToForm(r: RelatorioReembolso): RelatorioForm {
  return {
    titulo: r.titulo,
    projetoId: r.projetoId ?? '',
    responsavelId: r.responsavelId ?? '',
    dataInicio: r.dataInicio.slice(0, 10),
    dataFim: r.dataFim.slice(0, 10),
    observacoes: r.observacoes ?? '',
    itens: r.itens.map((i) => ({
      _key: newItemKey(),
      tipo: i.tipo,
      data: i.data ? i.data.slice(0, 10) : '',
      descricao: i.descricao,
      km: i.km != null ? String(i.km) : '',
      precoKm: i.precoKm != null ? String(i.precoKm) : '',
      valor: String(i.valor),
    })),
    clientesRateio: r.clientes.map((c) => ({
      _key: newItemKey(),
      clienteId: c.clienteId,
      percentual: String(c.percentual),
    })),
  };
}

export default function RelatorioReembolsoPage() {
  const [relatorios, setRelatorios] = useState<RelatorioReembolso[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RelatorioForm>(emptyForm());

  const [isAprovacaoOpen, setIsAprovacaoOpen] = useState<string | null>(null);
  const [assinarForm, setAssinarForm] = useState({ signatarioNome: '', signatarioEmail: '' });

  const [isFinanceiroOpen, setIsFinanceiroOpen] = useState<string | null>(null);
  const [financeiroForm, setFinanceiroForm] = useState({ vencimentoPagar: '', vencimentoReceber: '' });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [rRes, pRes, cRes, uRes] = await Promise.all([
        http.get<RelatorioReembolso[]>('/relatorios-reembolso'),
        http.get<Projeto[]>('/projetos'),
        http.get<Cliente[]>('/clientes'),
        http.get<UsuarioResumo[]>('/usuarios'),
      ]);
      setRelatorios(rRes.data);
      setProjetos(pRes.data);
      setClientes(cRes.data);
      setUsuarios(uRes.data);
    } catch (err) {
      setError(getApiError(err, 'Falha ao carregar dados.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  // ── Cálculo de totais em tempo real ─────────────────────────────────────
  const totalItens = useMemo(() =>
    form.itens.reduce((s, i) => s + (parseFloat(i.valor) || 0), 0),
    [form.itens],
  );

  const totalPercentual = useMemo(() =>
    form.clientesRateio.reduce((s, c) => s + (parseFloat(c.percentual) || 0), 0),
    [form.clientesRateio],
  );

  // ── Funções de Item ──────────────────────────────────────────────────────
  function updateItem(key: string, field: Partial<ItemForm>) {
    setForm((f) => ({
      ...f,
      itens: f.itens.map((i) => {
        if (i._key !== key) return i;
        const updated = { ...i, ...field };
        // Auto-calcular valor para KM
        if ((field.km !== undefined || field.precoKm !== undefined) && updated.tipo === 'KM') {
          const km = parseFloat(updated.km) || 0;
          const preco = parseFloat(updated.precoKm) || 0;
          updated.valor = km > 0 && preco > 0 ? String(Math.round(km * preco * 100) / 100) : updated.valor;
        }
        return updated;
      }),
    }));
  }

  function changeItemTipo(key: string, tipo: TipoItemReembolso) {
    setForm((f) => ({
      ...f,
      itens: f.itens.map((i) => {
        if (i._key !== key) return i;
        return { ...i, tipo, km: tipo !== 'KM' ? '' : i.km, precoKm: tipo !== 'KM' ? '' : i.precoKm };
      }),
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, itens: [...f.itens, emptyItem()] }));
  }

  function removeItem(key: string) {
    setForm((f) => ({ ...f, itens: f.itens.filter((i) => i._key !== key) }));
  }

  // Auto-fill km/precoKm ao selecionar projeto (pega do primeiro cliente do projeto)
  function handleProjetoChange(projetoId: string) {
    const projeto = projetos.find((p) => p.id === projetoId);
    const clienteId = projeto?.clienteId ?? '';
    const cliente = clientes.find((c) => c.id === clienteId);
    setForm((f) => {
      const novosItens = f.itens.map((item) => {
        if (item.tipo !== 'KM') return item;
        const km = cliente?.distanciaKm != null ? String(cliente.distanciaKm) : item.km;
        const precoKm = cliente?.precoKmReembolso != null ? String(cliente.precoKmReembolso) : item.precoKm;
        const kmN = parseFloat(km) || 0;
        const precoN = parseFloat(precoKm) || 0;
        return {
          ...item,
          km,
          precoKm,
          valor: kmN > 0 && precoN > 0 ? String(Math.round(kmN * precoN * 100) / 100) : item.valor,
        };
      });
      // Pre-fill rateio com o cliente do projeto se não houver rateio
      const novoRateio = f.clientesRateio.length === 1 && !f.clientesRateio[0].clienteId && clienteId
        ? [{ ...f.clientesRateio[0], clienteId, percentual: '100' }]
        : f.clientesRateio;
      return { ...f, projetoId, itens: novosItens, clientesRateio: novoRateio };
    });
  }

  // ── Funções de Rateio ────────────────────────────────────────────────────
  function updateRateio(key: string, field: Partial<ClienteRateioForm>) {
    setForm((f) => ({
      ...f,
      clientesRateio: f.clientesRateio.map((c) => c._key === key ? { ...c, ...field } : c),
    }));
  }

  // Ao selecionar cliente no rateio, pre-fill km/precoKm do item KM se ainda vazio
  function handleRateioClienteChange(key: string, clienteId: string) {
    const cliente = clientes.find((c) => c.id === clienteId);
    updateRateio(key, { clienteId });
    if (cliente && form.clientesRateio.length === 1) {
      setForm((f) => ({
        ...f,
        itens: f.itens.map((item) => {
          if (item.tipo !== 'KM' || item.km) return item;
          const km = cliente.distanciaKm != null ? String(cliente.distanciaKm) : '';
          const precoKm = cliente.precoKmReembolso != null ? String(cliente.precoKmReembolso) : '';
          const kmN = parseFloat(km) || 0;
          const precoN = parseFloat(precoKm) || 0;
          return {
            ...item,
            km,
            precoKm,
            valor: kmN > 0 && precoN > 0 ? String(Math.round(kmN * precoN * 100) / 100) : item.valor,
          };
        }),
      }));
    }
  }

  function addRateio() {
    setForm((f) => ({ ...f, clientesRateio: [...f.clientesRateio, emptyRateio()] }));
  }

  function removeRateio(key: string) {
    setForm((f) => ({ ...f, clientesRateio: f.clientesRateio.filter((c) => c._key !== key) }));
  }

  // ── Salvar ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.itens.length === 0) { setError('Adicione ao menos um item de custo.'); return; }
    const clientes = form.clientesRateio.filter((c) => c.clienteId);
    if (clientes.length > 0) {
      const total = clientes.reduce((s, c) => s + (parseFloat(c.percentual) || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        setError(`O rateio deve somar 100% (atual: ${total.toFixed(1)}%).`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        titulo: form.titulo,
        projetoId: form.projetoId || undefined,
        responsavelId: form.responsavelId || undefined,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
        observacoes: form.observacoes || undefined,
        itens: form.itens.map((i) => ({
          tipo: i.tipo,
          data: i.data || undefined,
          descricao: i.descricao,
          km: i.km ? parseFloat(i.km) : undefined,
          precoKm: i.precoKm ? parseFloat(i.precoKm) : undefined,
          valor: parseFloat(i.valor) || 0,
        })),
        clientes: clientes.map((c) => ({
          clienteId: c.clienteId,
          percentual: parseFloat(c.percentual) || 0,
        })),
      };
      if (editingId) {
        await http.put(`/relatorios-reembolso/${editingId}`, payload);
        setSuccess('Relatório atualizado.');
      } else {
        await http.post('/relatorios-reembolso', payload);
        setSuccess('Relatório criado.');
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao salvar relatório.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: RelatorioReembolso) {
    if (!confirm(`Excluir "${r.titulo}"?`)) return;
    setError(null);
    try {
      await http.delete(`/relatorios-reembolso/${r.id}`);
      setSuccess('Relatório excluído.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao excluir.'));
    }
  }

  async function handleGerarPdf(r: RelatorioReembolso) {
    setError(null);
    try {
      const res = await http.post<{ documentoUrl: string }>(`/relatorios-reembolso/${r.id}/gerar-documento`);
      setSuccess('PDF gerado com sucesso.');
      window.open(res.data.documentoUrl, '_blank');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao gerar PDF.'));
    }
  }

  async function handleEnviarAprovacao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAprovacaoOpen) return;
    setSaving(true);
    setError(null);
    try {
      const res = await http.post<{ signUrl: string }>(
        `/relatorios-reembolso/${isAprovacaoOpen}/enviar-aprovacao`,
        assinarForm,
      );
      setSuccess(`Enviado! Link de assinatura: ${res.data.signUrl}`);
      setIsAprovacaoOpen(null);
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao enviar para aprovação.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSincronizar(id: string) {
    setError(null);
    try {
      const res = await http.post<{ aprovado: boolean }>(`/relatorios-reembolso/${id}/sincronizar`);
      setSuccess(res.data.aprovado ? 'Documento aprovado!' : 'Ainda aguardando aprovação.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao sincronizar.'));
    }
  }

  async function handleGerarFinanceiro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isFinanceiroOpen) return;
    setSaving(true);
    setError(null);
    try {
      const res = await http.post<{ message: string; valorTotal: number }>(
        `/relatorios-reembolso/${isFinanceiroOpen}/gerar-financeiro`,
        {
          vencimentoPagar: financeiroForm.vencimentoPagar || undefined,
          vencimentoReceber: financeiroForm.vencimentoReceber || undefined,
        },
      );
      setSuccess(`${res.data.message} Total: ${formatCurrency(res.data.valorTotal)}`);
      setIsFinanceiroOpen(null);
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao gerar financeiro.'));
    } finally {
      setSaving(false);
    }
  }

  function openNew() {
    setForm(emptyForm());
    setEditingId(null);
    setError(null);
    setIsFormOpen(true);
  }

  function openEdit(r: RelatorioReembolso) {
    setForm(relatorioToForm(r));
    setEditingId(r.id);
    setError(null);
    setIsFormOpen(true);
  }

  const clienteNome = (c: RelatorioReembolso['clientes'][0]) =>
    c.cliente.nomeFantasia || c.cliente.razaoSocial;

  return (
    <div className="page-stack">
      <PageHeader
        title="Relatórios de Reembolso"
        subtitle="Relatórios de deslocamento para aprovação do cliente e geração de financeiro."
        chips={loading ? [] : [
          { label: `${relatorios.length} relatório(s)` },
          { label: `${relatorios.filter((r) => r.status === 'AGUARDANDO_APROVACAO').length} aguardando aprovação` },
        ]}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <h3 className="panel__title">Relatórios</h3>
          <button className="button button--ghost button--small" type="button" onClick={openNew}>
            Novo Relatório
          </button>
        </div>

        {loading ? <LoadingBlock label="Carregando..." /> : null}

        {!loading && relatorios.length === 0 ? (
          <EmptyState message="Nenhum relatório de reembolso criado." />
        ) : null}

        {!loading && relatorios.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Período</th>
                  <th>Clientes / Rateio</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {relatorios.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.titulo}</strong>
                      {r.projeto ? <div className="table-subline">{r.projeto.nome}</div> : null}
                      {r.responsavel ? <div className="table-subline">{r.responsavel.nome}</div> : null}
                    </td>
                    <td>
                      {formatDate(r.dataInicio)}<br />
                      <small className="table-subline">a {formatDate(r.dataFim)}</small>
                    </td>
                    <td>
                      {r.clientes.length === 0 ? <span className="table-subline">—</span> : (
                        r.clientes.map((c) => (
                          <div key={c.id} style={{ fontSize: 12 }}>
                            {clienteNome(c)}
                            {r.clientes.length > 1 ? <span className="table-subline"> {c.percentual}%</span> : null}
                          </div>
                        ))
                      )}
                    </td>
                    <td><strong>{formatCurrency(r.valorTotal)}</strong></td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-toolbar">
                        {r.documentoUrl ? (
                          <a href={r.documentoUrl} target="_blank" rel="noopener noreferrer" className="button button--ghost button--small">
                            Ver PDF
                          </a>
                        ) : null}
                        {r.status === 'RASCUNHO' || r.status === 'REPROVADO' ? (
                          <button className="button button--ghost button--small" type="button" onClick={() => void handleGerarPdf(r)}>
                            Gerar PDF
                          </button>
                        ) : null}
                        {r.documentoUrl && !r.autentiqueDocId && r.status !== 'FINANCEIRO_GERADO' ? (
                          <button
                            className="button button--ghost button--small"
                            type="button"
                            onClick={() => { setAssinarForm({ signatarioNome: '', signatarioEmail: '' }); setIsAprovacaoOpen(r.id); }}
                          >
                            Enviar p/ Aprovação
                          </button>
                        ) : null}
                        {r.status === 'AGUARDANDO_APROVACAO' ? (
                          <button className="button button--ghost button--small" type="button" onClick={() => void handleSincronizar(r.id)}>
                            Verificar Assinatura
                          </button>
                        ) : null}
                        {(r.status === 'APROVADO' || r.status === 'RASCUNHO') && r.clientes.length > 0 && r.status !== 'FINANCEIRO_GERADO' ? (
                          <button
                            className="button button--ghost button--small"
                            type="button"
                            onClick={() => { setFinanceiroForm({ vencimentoPagar: '', vencimentoReceber: '' }); setIsFinanceiroOpen(r.id); }}
                          >
                            Gerar Financeiro
                          </button>
                        ) : null}
                        {r.status !== 'FINANCEIRO_GERADO' ? (
                          <button className="button button--ghost button--small" type="button" onClick={() => openEdit(r)}>
                            Editar
                          </button>
                        ) : null}
                        <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(r)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* ── MODAL: CRIAR / EDITAR ────────────────────────────────────────── */}
      <Modal
        open={isFormOpen}
        title={editingId ? 'Editar relatório de reembolso' : 'Novo relatório de reembolso'}
        subtitle="Preencha os dados, adicione itens de custo e distribua entre clientes se necessário."
        onClose={() => { if (!saving) { setIsFormOpen(false); setError(null); } }}
      >
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
          {/* Dados gerais */}
          <div className="field field--span-2">
            <label>Título do relatório</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex.: Visita Fazenda São João — Abril/2026"
              required
            />
          </div>

          <div className="field field--span-2">
            <label>Projeto (opcional)</label>
            <select value={form.projetoId} onChange={(e) => handleProjetoChange(e.target.value)}>
              <option value="">Nenhum</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div className="field field--span-2">
            <label>Responsável pelo deslocamento</label>
            <select value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}>
              <option value="">Não informado</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Data início</label>
            <input type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Data fim</label>
            <input type="date" value={form.dataFim} onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))} required />
          </div>

          <div className="field field--span-2">
            <label>Observações</label>
            <input value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Opcional" />
          </div>

          {/* Itens de custo */}
          <div className="field field--span-2" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ fontSize: 13 }}>Itens de Custo</strong>
              <button className="button button--ghost button--tiny" type="button" onClick={addItem}>+ Adicionar item</button>
            </div>

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: 120 }}>Tipo</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: 100 }}>Data</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descrição</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 60 }}>KM</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 70 }}>R$/km</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 80 }}>Valor (R$)</th>
                    <th style={{ width: 28 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.itens.map((item) => (
                    <tr key={item._key} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '4px 6px' }}>
                        <select
                          value={item.tipo}
                          onChange={(e) => changeItemTipo(item._key, e.target.value as TipoItemReembolso)}
                          style={{ width: '100%', fontSize: 11 }}
                        >
                          {(Object.keys(TIPO_LABELS) as TipoItemReembolso[]).map((t) => (
                            <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="date"
                          value={item.data}
                          onChange={(e) => updateItem(item._key, { data: e.target.value })}
                          style={{ width: '100%', fontSize: 11 }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          value={item.descricao}
                          onChange={(e) => updateItem(item._key, { descricao: e.target.value })}
                          placeholder="Descrição"
                          required
                          style={{ width: '100%', fontSize: 11 }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.km}
                          onChange={(e) => updateItem(item._key, { km: e.target.value })}
                          disabled={item.tipo !== 'KM'}
                          style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                          placeholder="0"
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precoKm}
                          onChange={(e) => updateItem(item._key, { precoKm: e.target.value })}
                          disabled={item.tipo !== 'KM'}
                          style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                          placeholder="0,00"
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valor}
                          onChange={(e) => updateItem(item._key, { valor: e.target.value })}
                          required
                          style={{ width: '100%', fontSize: 11, textAlign: 'right', fontWeight: 600 }}
                          placeholder="0,00"
                        />
                      </td>
                      <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                        {form.itens.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeItem(item._key)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                            title="Remover"
                          >×</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={5} style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12, fontWeight: 600 }}>Total</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>
                      {formatCurrency(totalItens)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Rateio de clientes */}
          <div className="field field--span-2" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ fontSize: 13 }}>
                Rateio por Cliente
                {form.clientesRateio.filter((c) => c.clienteId).length > 1 ? (
                  <span style={{ marginLeft: 8, fontSize: 11, color: Math.abs(totalPercentual - 100) < 0.01 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 400 }}>
                    {totalPercentual.toFixed(1)}% {Math.abs(totalPercentual - 100) < 0.01 ? '✓' : '— deve somar 100%'}
                  </span>
                ) : null}
              </strong>
              <button className="button button--ghost button--tiny" type="button" onClick={addRateio}>+ Adicionar cliente</button>
            </div>

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 100 }}>% Rateio</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 90 }}>Valor</th>
                    <th style={{ width: 28 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.clientesRateio.map((rc) => {
                    const pct = parseFloat(rc.percentual) || 0;
                    const valor = Math.round(totalItens * pct / 100 * 100) / 100;
                    return (
                      <tr key={rc._key} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '4px 6px' }}>
                          <select
                            value={rc.clienteId}
                            onChange={(e) => handleRateioClienteChange(rc._key, e.target.value)}
                            style={{ width: '100%', fontSize: 11 }}
                            required
                          >
                            <option value="">Selecione o cliente</option>
                            {clientes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.razaoSocial}{c.nomeFazenda ? ` — ${c.nomeFazenda}` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={rc.percentual}
                            onChange={(e) => updateRateio(rc._key, { percentual: e.target.value })}
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            placeholder="100"
                          />
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                          {pct > 0 ? formatCurrency(valor) : '—'}
                        </td>
                        <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                          {form.clientesRateio.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeRateio(rc._key)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                              title="Remover"
                            >×</button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <small style={{ color: 'var(--color-muted)', marginTop: 4, display: 'block' }}>
              Se houver apenas um cliente, ele recebe 100% do valor. Para rateio entre clientes, distribua os percentuais somando 100%.
            </small>
          </div>

          {error ? <div className="field field--span-2"><Feedback type="error" message={error} /></div> : null}

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar relatório'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ENVIAR PARA APROVAÇÃO ─────────────────────────────────── */}
      <Modal
        open={!!isAprovacaoOpen}
        title="Enviar para Aprovação"
        subtitle="O PDF será enviado ao Autentique. O signatário receberá um link de assinatura por e-mail."
        onClose={() => { if (!saving) setIsAprovacaoOpen(null); }}
      >
        <form className="form-grid" onSubmit={(e) => void handleEnviarAprovacao(e)}>
          <div className="field field--span-2">
            <label>Nome do signatário</label>
            <input
              value={assinarForm.signatarioNome}
              onChange={(e) => setAssinarForm((f) => ({ ...f, signatarioNome: e.target.value }))}
              placeholder="Nome do responsável pelo cliente"
              required
            />
          </div>
          <div className="field field--span-2">
            <label>E-mail do signatário</label>
            <input
              type="email"
              value={assinarForm.signatarioEmail}
              onChange={(e) => setAssinarForm((f) => ({ ...f, signatarioEmail: e.target.value }))}
              placeholder="email@cliente.com.br"
              required
            />
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Enviando...' : 'Enviar para Assinatura'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: GERAR FINANCEIRO ──────────────────────────────────────── */}
      <Modal
        open={!!isFinanceiroOpen}
        title="Gerar Financeiro"
        subtitle="Isso criará uma Conta a Pagar (reembolso interno) e uma Conta a Receber por cliente (cobrança proporcional)."
        onClose={() => { if (!saving) setIsFinanceiroOpen(null); }}
      >
        <form className="form-grid" onSubmit={(e) => void handleGerarFinanceiro(e)}>
          <div className="field field--span-2">
            <label>Vencimento da Conta a Pagar (reembolso ao responsável)</label>
            <input
              type="date"
              value={financeiroForm.vencimentoPagar}
              onChange={(e) => setFinanceiroForm((f) => ({ ...f, vencimentoPagar: e.target.value }))}
              placeholder="Padrão: 30 dias"
            />
          </div>
          <div className="field field--span-2">
            <label>Vencimento da Conta a Receber (cobrança ao cliente)</label>
            <input
              type="date"
              value={financeiroForm.vencimentoReceber}
              onChange={(e) => setFinanceiroForm((f) => ({ ...f, vencimentoReceber: e.target.value }))}
              placeholder="Padrão: 30 dias"
            />
          </div>
          <div className="field field--span-2">
            <small style={{ color: 'var(--color-muted)' }}>
              Deixe em branco para usar o vencimento padrão de 30 dias a partir de hoje.
            </small>
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Gerando...' : 'Gerar Financeiro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
