import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { Cliente } from '../types/api';
import { formatCurrency, formatDate, maskCurrencyInputBRL, parseCurrencyInputBRL } from '../utils/format';

type StatusFaturamento = 'PENDENTE' | 'EMITINDO' | 'EMITIDO' | 'CANCELADO' | 'ERRO';

type FaturamentoItem = {
  id: string;
  competencia: string;
  dataVencimento: string;
  valor: number;
  descricao: string | null;
  status: StatusFaturamento;
  erroEmissao: string | null;
  nfseNumero: string | null;
  nfseLinkPdf: string | null;
  nfseLinkXml: string | null;
  enotasId: string | null;
  dataEmissao: string | null;
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null; email: string | null } | null;
  contrato: { id: string; titulo: string } | null;
  contratoCobranca: { id: string; ordem: number; vencimento: string } | null;
};

type FaturavelItem = {
  id: string;
  ordem: number;
  vencimento: string;
  valor: number;
  descricao: string | null;
  contrato: {
    id: string;
    titulo: string;
    clienteId: string;
    clienteRazaoSocial: string | null;
    objeto: string | null;
  };
};

type InfoDiaUtil = {
  competencia: string;
  primeiroDiaUtil: string;
  ehDiaFaturamento: boolean;
  hoje: string;
};

type Tab = 'faturavel' | 'emitidos';

function labelStatus(s: StatusFaturamento) {
  const map: Record<StatusFaturamento, string> = {
    PENDENTE: 'Pendente',
    EMITINDO: 'Processando',
    EMITIDO: 'Emitida',
    CANCELADO: 'Cancelada',
    ERRO: 'Erro',
  };
  return map[s] ?? s;
}

function pillClass(s: StatusFaturamento) {
  if (s === 'EMITIDO') return 'status-pill status-pill--assinado';
  if (s === 'EMITINDO') return 'status-pill status-pill--aguardando_assinatura';
  if (s === 'ERRO') return 'status-pill status-pill--recusado';
  if (s === 'CANCELADO') return 'status-pill status-pill--cancelado';
  return 'status-pill status-pill--pendente';
}

function mesLabel(competencia: string) {
  const [ano, mes] = competencia.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(mes) - 1]}/${ano}`;
}

function competenciaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function competencias() {
  const result: string[] = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return result;
}

function getApiError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    return typeof msg === 'string' ? msg : fallback;
  }
  return fallback;
}

export default function FaturamentoPage() {
  const [tab, setTab] = useState<Tab>('faturavel');
  const [competencia, setCompetencia] = useState(competenciaAtual);
  const [info, setInfo] = useState<InfoDiaUtil | null>(null);
  const [faturavel, setFaturavel] = useState<FaturavelItem[]>([]);
  const [faturamentos, setFaturamentos] = useState<FaturamentoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [avulsoModal, setAvulsoModal] = useState(false);
  const [avulsoForm, setAvulsoForm] = useState({
    clienteId: '',
    descricao: '',
    valor: '',
    vencimento: '',
    observacoes: '',
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [infoRes, faturavelRes, faturamentosRes, clientesRes] = await Promise.all([
        http.get<InfoDiaUtil>(`/faturamento/info?competencia=${competencia}`),
        http.get<{ competencia: string; itens: FaturavelItem[] }>(`/faturamento/faturavel?competencia=${competencia}`),
        http.get<FaturamentoItem[]>(`/faturamento?competencia=${competencia}`),
        http.get<Cliente[]>('/clientes'),
      ]);
      setInfo(infoRes.data);
      setFaturavel(faturavelRes.data.itens);
      setFaturamentos(faturamentosRes.data);
      setClientes(clientesRes.data);
      setSelectedIds(new Set());
    } catch (err) {
      setError(getApiError(err, 'Falha ao carregar dados de faturamento.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [competencia]);

  const totalFaturavel = useMemo(
    () => faturavel.reduce((acc, c) => acc + c.valor, 0),
    [faturavel],
  );

  const totalEmitido = useMemo(
    () => faturamentos.filter((f) => f.status === 'EMITIDO').reduce((acc, f) => acc + f.valor, 0),
    [faturamentos],
  );

  const allSelected = faturavel.length > 0 && selectedIds.size === faturavel.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(faturavel.map((c) => c.id)));
    }
  }

  async function handleFaturarUm(cobrancaId: string) {
    setActionLoading(true);
    setError(null);
    try {
      await http.post(`/faturamento/cobranca/${cobrancaId}`);
      setSuccess('Parcela faturada com sucesso.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro ao faturar parcela.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFaturarSelecionados() {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    setError(null);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        http.post(`/faturamento/cobranca/${id}`).catch((e) => e),
      );
      const results = await Promise.allSettled(promises);
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      setSuccess(`${ok} de ${selectedIds.size} parcela(s) faturada(s).`);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFaturarTodos() {
    if (!confirm(`Faturar todas as ${faturavel.length} parcelas do mês ${mesLabel(competencia)}?`)) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await http.post<{ total: number; sucesso: number; falha: number }>(
        `/faturamento/faturar-todos?competencia=${competencia}`,
      );
      setSuccess(`Faturamento em lote: ${res.data.sucesso} sucesso, ${res.data.falha} falha(s).`);
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro no faturamento em lote.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEmitirNfse(id: string) {
    setActionLoading(true);
    try {
      await http.post(`/faturamento/${id}/emitir-nfse`);
      setSuccess('Solicitação de emissão enviada ao eNotas.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro ao emitir NFS-e.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSincronizar(id: string) {
    setActionLoading(true);
    try {
      await http.post(`/faturamento/${id}/sincronizar`);
      setSuccess('Status sincronizado com eNotas.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro ao sincronizar.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelar(id: string) {
    if (!confirm('Cancelar este faturamento / NFS-e?')) return;
    setActionLoading(true);
    try {
      await http.post(`/faturamento/${id}/cancelar`);
      setSuccess('Faturamento cancelado.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro ao cancelar.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFaturarAvulso(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await http.post('/faturamento/avulso', {
        clienteId: avulsoForm.clienteId,
        descricao: avulsoForm.descricao,
        valor: parseCurrencyInputBRL(avulsoForm.valor),
        vencimento: avulsoForm.vencimento,
        observacoes: avulsoForm.observacoes || undefined,
      });
      setSuccess('Faturamento avulso criado com sucesso.');
      setAvulsoModal(false);
      setAvulsoForm({ clienteId: '', descricao: '', valor: '', vencimento: '', observacoes: '' });
      setTab('emitidos');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Erro ao criar faturamento avulso.'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Faturamento"
        subtitle="Gerencie o faturamento mensal de contratos e a emissão de NFS-e via eNotas."
      />

      {error ? <Feedback type="error" message={error} onClose={() => setError(null)} /> : null}
      {success ? <Feedback type="success" message={success} onClose={() => setSuccess(null)} /> : null}

      {/* Seletor de competência + alerta de dia de faturamento */}
      <section className="panel">
        <div className="panel__header panel__header--row">
          <div>
            <h3>Competência</h3>
            {info && (
              <p>
                Primeiro dia útil: <strong>{formatDate(info.primeiroDiaUtil)}</strong>
                {info.ehDiaFaturamento
                  ? ' — ✅ Hoje é o dia de faturamento!'
                  : ` — Hoje: ${formatDate(info.hoje)}`}
              </p>
            )}
          </div>
          <div className="header-tools">
            <select
              className="input"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              style={{ minWidth: 120 }}
            >
              {competencias().map((c) => (
                <option key={c} value={c}>{mesLabel(c)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="stats-grid stats-grid--compact" style={{ marginTop: 12 }}>
          <div className="stat-card">
            <span className="stat-card__label">A faturar</span>
            <strong>{faturavel.length} parcela(s)</strong>
            <span className="stat-card__helper">{formatCurrency(totalFaturavel)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">NFS-e emitidas</span>
            <strong>{faturamentos.filter((f) => f.status === 'EMITIDO').length}</strong>
            <span className="stat-card__helper">{formatCurrency(totalEmitido)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Em processamento</span>
            <strong>{faturamentos.filter((f) => f.status === 'EMITINDO').length}</strong>
            <span className="stat-card__helper">Aguardando eNotas</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Com erro</span>
            <strong>{faturamentos.filter((f) => f.status === 'ERRO').length}</strong>
            <span className="stat-card__helper">Requer atenção</span>
          </div>
        </div>
      </section>

      {/* Abas */}
      <section className="panel">
        <div className="panel__header panel__header--row">
          <div className="segmented">
            <button
              className={`segmented__button${tab === 'faturavel' ? ' segmented__button--active' : ''}`}
              type="button"
              onClick={() => setTab('faturavel')}
            >
              A faturar ({faturavel.length})
            </button>
            <button
              className={`segmented__button${tab === 'emitidos' ? ' segmented__button--active' : ''}`}
              type="button"
              onClick={() => setTab('emitidos')}
            >
              Faturamentos ({faturamentos.length})
            </button>
          </div>
          <div className="table-actions-toolbar">
            <button
              className="button button--ghost button--small"
              type="button"
              onClick={() => {
                setAvulsoForm({ clienteId: clientes[0]?.id || '', descricao: '', valor: '', vencimento: new Date().toISOString().slice(0, 10), observacoes: '' });
                setAvulsoModal(true);
              }}
            >
              + Faturamento avulso
            </button>
          </div>
          {tab === 'faturavel' && faturavel.length > 0 && (
            <div className="table-actions-toolbar">
              {selectedIds.size > 0 && (
                <button
                  className="button button--small"
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void handleFaturarSelecionados()}
                >
                  Faturar selecionados ({selectedIds.size})
                </button>
              )}
              <button
                className="button button--small"
                type="button"
                disabled={actionLoading || faturavel.length === 0}
                onClick={() => void handleFaturarTodos()}
              >
                Faturar todos ({faturavel.length})
              </button>
            </div>
          )}
        </div>

        {loading ? <LoadingBlock label="Carregando..." /> : null}

        {/* Tab: A faturar */}
        {!loading && tab === 'faturavel' && (
          <>
            {faturavel.length === 0 ? (
              <EmptyState message="Nenhuma parcela pendente de faturamento para este mês." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                      </th>
                      <th>Contrato</th>
                      <th>Cliente</th>
                      <th>Parcela</th>
                      <th>Vencimento</th>
                      <th>Valor</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faturavel.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                          />
                        </td>
                        <td>
                          <strong>{c.contrato.titulo}</strong>
                          {c.contrato.objeto ? <div className="table-subline">{c.contrato.objeto}</div> : null}
                        </td>
                        <td>{c.contrato.clienteRazaoSocial || '—'}</td>
                        <td>{c.descricao || `Parcela ${c.ordem}`}</td>
                        <td>{formatDate(c.vencimento)}</td>
                        <td><strong>{formatCurrency(c.valor)}</strong></td>
                        <td>
                          <button
                            className="button button--small"
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void handleFaturarUm(c.id)}
                          >
                            Faturar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tab: Faturamentos emitidos */}
        {!loading && tab === 'emitidos' && (
          <>
            {faturamentos.length === 0 ? (
              <EmptyState message="Nenhum faturamento registrado para este mês." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Contrato</th>
                      <th>Descrição</th>
                      <th>Vencimento</th>
                      <th>Valor</th>
                      <th>NFS-e</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faturamentos.map((f) => (
                      <tr key={f.id}>
                        <td>{f.cliente?.razaoSocial || '—'}</td>
                        <td>{f.contrato?.titulo || '—'}</td>
                        <td>
                          {f.descricao || '—'}
                          {f.erroEmissao ? (
                            <div className="table-subline" style={{ color: 'var(--danger)' }}>
                              {f.erroEmissao}
                            </div>
                          ) : null}
                        </td>
                        <td>{formatDate(f.dataVencimento)}</td>
                        <td><strong>{formatCurrency(f.valor)}</strong></td>
                        <td>
                          {f.nfseNumero ? (
                            <span>
                              Nº {f.nfseNumero}
                              {f.nfseLinkPdf ? (
                                <>
                                  {' · '}
                                  <a href={f.nfseLinkPdf} target="_blank" rel="noreferrer">PDF</a>
                                </>
                              ) : null}
                              {f.nfseLinkXml ? (
                                <>
                                  {' · '}
                                  <a href={f.nfseLinkXml} target="_blank" rel="noreferrer">XML</a>
                                </>
                              ) : null}
                            </span>
                          ) : f.enotasId ? (
                            <span className="muted">ID: {f.enotasId.slice(0, 8)}…</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={pillClass(f.status)}>{labelStatus(f.status)}</span>
                        </td>
                        <td>
                          <div className="table-actions-toolbar">
                            {f.status === 'PENDENTE' && (
                              <button
                                className="button button--ghost button--small"
                                type="button"
                                disabled={actionLoading}
                                onClick={() => void handleEmitirNfse(f.id)}
                              >
                                Emitir NFS-e
                              </button>
                            )}
                            {f.status === 'EMITINDO' && (
                              <button
                                className="button button--ghost button--small"
                                type="button"
                                disabled={actionLoading}
                                onClick={() => void handleSincronizar(f.id)}
                              >
                                Sincronizar
                              </button>
                            )}
                            {f.status === 'ERRO' && (
                              <button
                                className="button button--ghost button--small"
                                type="button"
                                disabled={actionLoading}
                                onClick={() => void handleEmitirNfse(f.id)}
                              >
                                Retentar
                              </button>
                            )}
                            {(f.status === 'EMITIDO' || f.status === 'PENDENTE') && (
                              <button
                                className="button button--danger button--small"
                                type="button"
                                disabled={actionLoading}
                                onClick={() => void handleCancelar(f.id)}
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Modal: Faturamento avulso */}
      <Modal
        open={avulsoModal}
        title="Novo faturamento avulso"
        subtitle="Emita uma NFS-e sem vínculo com contrato — ideal para cobranças pontuais."
        onClose={() => setAvulsoModal(false)}
      >
        <form className="form-grid" onSubmit={(e) => void handleFaturarAvulso(e)}>
          <div className="field field--span-2">
            <label>Cliente *</label>
            <select
              required
              value={avulsoForm.clienteId}
              onChange={(e) => setAvulsoForm((f) => ({ ...f, clienteId: e.target.value }))}
            >
              <option value="">Selecione</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.razaoSocial}</option>
              ))}
            </select>
          </div>
          <div className="field field--span-2">
            <label>Descrição do serviço *</label>
            <input
              required
              value={avulsoForm.descricao}
              placeholder="Ex.: Consultoria estratégica — Abril/2026"
              onChange={(e) => setAvulsoForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Valor (R$) *</label>
            <input
              required
              value={avulsoForm.valor}
              onChange={(e) => setAvulsoForm((f) => ({ ...f, valor: maskCurrencyInputBRL(e.target.value) }))}
            />
          </div>
          <div className="field">
            <label>Data de vencimento *</label>
            <input
              type="date"
              required
              value={avulsoForm.vencimento}
              onChange={(e) => setAvulsoForm((f) => ({ ...f, vencimento: e.target.value }))}
            />
          </div>
          <div className="field field--span-2">
            <label>Observações</label>
            <textarea
              rows={2}
              value={avulsoForm.observacoes}
              onChange={(e) => setAvulsoForm((f) => ({ ...f, observacoes: e.target.value }))}
            />
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={actionLoading}>
              {actionLoading ? 'Criando...' : 'Criar faturamento avulso'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
