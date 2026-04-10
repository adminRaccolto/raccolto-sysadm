import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { Cliente, Deslocamento, Documento, Projeto, UsuarioResumo } from '../types/api';
import { formatCurrency, formatDate } from '../utils/format';

const initialForm = {
  projetoId: '',
  clienteId: '',
  responsavelId: '',
  data: '',
  distanciaKm: '',
  precoKm: '',
  descricao: '',
  docFiscal: '',
  pedagios: '',
  refeicao: '',
  reembolsado: false,
};

const initialRelatorioForm = {
  projetoId: '',
  dataInicio: '',
  dataFim: '',
  adiantamento: '',
  anotacoes: '',
};

const initialAssinarForm = {
  signatarioNome: '',
  signatarioEmail: '',
};

type DeslocamentoForm = typeof initialForm;
type RelatorioForm = typeof initialRelatorioForm;

function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    return typeof msg === 'string' ? msg : fallback;
  }
  return fallback;
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    RASCUNHO: 'badge--muted',
    AGUARDANDO_ASSINATURA: 'badge--warning',
    ASSINADO: 'badge--success',
    ARQUIVADO: 'badge--muted',
  };
  return `badge ${map[status] ?? 'badge--muted'}`;
}

export default function DeslocamentosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [deslocamentos, setDeslocamentos] = useState<Deslocamento[]>([]);
  const [relatorios, setRelatorios] = useState<Documento[]>([]);
  const [filtroProjeto, setFiltroProjeto] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRelatorioOpen, setIsRelatorioOpen] = useState(false);
  const [isAssinarOpen, setIsAssinarOpen] = useState<string | null>(null); // documentoId
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeslocamentoForm>(initialForm);
  const [relatorioForm, setRelatorioForm] = useState<RelatorioForm>(initialRelatorioForm);
  const [assinarForm, setAssinarForm] = useState(initialAssinarForm);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [projetosRes, clientesRes, usuariosRes, deslocamentosRes, relatoriosRes] = await Promise.all([
        http.get<Projeto[]>('/projetos'),
        http.get<Cliente[]>('/clientes'),
        http.get<UsuarioResumo[]>('/usuarios'),
        http.get<Deslocamento[]>('/deslocamentos'),
        http.get<Documento[]>('/documentos?tipo=RELATORIO_DESLOCAMENTO'),
      ]);
      setProjetos(projetosRes.data);
      setClientes(clientesRes.data);
      setUsuarios(usuariosRes.data);
      setDeslocamentos(deslocamentosRes.data);
      setRelatorios(relatoriosRes.data);
    } catch (err) {
      setError(getApiError(err, 'Falha ao carregar deslocamentos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const filtered = useMemo(() =>
    filtroProjeto ? deslocamentos.filter((d) => d.projetoId === filtroProjeto) : deslocamentos,
    [deslocamentos, filtroProjeto],
  );

  const totalKm = useMemo(() => filtered.reduce((s, d) => s + d.distanciaKm, 0), [filtered]);
  const totalValor = useMemo(() => filtered.reduce((s, d) => s + d.valorTotal, 0), [filtered]);

  function openNew() {
    setForm(initialForm);
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function openEdit(d: Deslocamento) {
    setForm({
      projetoId: d.projetoId,
      clienteId: d.clienteId,
      responsavelId: d.responsavelId || '',
      data: d.data.slice(0, 10),
      distanciaKm: String(d.distanciaKm),
      precoKm: String(d.precoKm),
      descricao: d.descricao || '',
      docFiscal: d.docFiscal || '',
      pedagios: d.pedagios != null ? String(d.pedagios) : '',
      refeicao: d.refeicao != null ? String(d.refeicao) : '',
      reembolsado: d.reembolsado,
    });
    setEditingId(d.id);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  }

  function handleProjetoChange(projetoId: string) {
    const projeto = projetos.find((p) => p.id === projetoId);
    const clienteId = projeto?.clienteId || '';
    const cliente = clientes.find((c) => c.id === clienteId);
    setForm((f) => ({
      ...f,
      projetoId,
      clienteId,
      distanciaKm: cliente?.distanciaKm != null ? String(cliente.distanciaKm) : f.distanciaKm,
      precoKm: cliente?.precoKmReembolso != null ? String(cliente.precoKmReembolso) : f.precoKm,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        projetoId: form.projetoId,
        clienteId: form.clienteId,
        responsavelId: form.responsavelId || undefined,
        data: form.data,
        distanciaKm: parseFloat(form.distanciaKm),
        precoKm: parseFloat(form.precoKm),
        descricao: form.descricao || undefined,
        docFiscal: form.docFiscal || undefined,
        pedagios: form.pedagios ? parseFloat(form.pedagios) : undefined,
        refeicao: form.refeicao ? parseFloat(form.refeicao) : undefined,
        reembolsado: form.reembolsado,
      };
      if (editingId) {
        await http.put(`/deslocamentos/${editingId}`, payload);
        setSuccess('Deslocamento atualizado.');
      } else {
        await http.post('/deslocamentos', payload);
        setSuccess('Deslocamento registrado.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao salvar deslocamento.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d: Deslocamento) {
    if (!confirm('Excluir este deslocamento?')) return;
    setError(null);
    try {
      await http.delete(`/deslocamentos/${d.id}`);
      setSuccess('Deslocamento excluído.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao excluir deslocamento.'));
    }
  }

  async function toggleReembolsado(d: Deslocamento) {
    try {
      await http.put(`/deslocamentos/${d.id}`, { reembolsado: !d.reembolsado });
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao atualizar reembolso.'));
    }
  }

  async function handleGerarRelatorio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGerando(true);
    setError(null);
    try {
      await http.post('/deslocamentos/relatorio/gerar', {
        projetoId: relatorioForm.projetoId,
        dataInicio: relatorioForm.dataInicio,
        dataFim: relatorioForm.dataFim,
        adiantamento: relatorioForm.adiantamento ? parseFloat(relatorioForm.adiantamento) : 0,
        anotacoes: relatorioForm.anotacoes || '',
      });
      setSuccess('Relatório gerado e salvo no Repositório.');
      setIsRelatorioOpen(false);
      setRelatorioForm(initialRelatorioForm);
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao gerar relatório.'));
    } finally {
      setGerando(false);
    }
  }

  async function handleEnviarAssinatura(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAssinarOpen) return;
    setSaving(true);
    setError(null);
    try {
      const res = await http.post<{ signUrl: string }>(
        `/deslocamentos/relatorio/${isAssinarOpen}/assinar`,
        assinarForm,
      );
      setSuccess(`Documento enviado! Link de assinatura: ${res.data.signUrl}`);
      setIsAssinarOpen(null);
      setAssinarForm(initialAssinarForm);
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao enviar para assinatura.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSincronizar(documentoId: string) {
    setError(null);
    try {
      const res = await http.post<{ assinado: boolean; signedUrl?: string }>(
        `/deslocamentos/relatorio/${documentoId}/sincronizar`,
      );
      if (res.data.assinado) {
        setSuccess('Documento assinado! Conta a receber criada automaticamente.');
      } else {
        setSuccess('Documento ainda não foi assinado.');
      }
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao sincronizar assinatura.'));
    }
  }

  const valorTotal = parseFloat(form.distanciaKm || '0') * parseFloat(form.precoKm || '0');

  return (
    <div className="page-stack">
      <PageHeader
        title="Deslocamentos"
        subtitle="Registro de visitas a clientes para controle de quilometragem e solicitação de reembolso."
        chips={loading ? [] : [
          { label: `${deslocamentos.length} registro(s)` },
          { label: `${deslocamentos.filter((d) => !d.reembolsado).length} pendente(s)` },
        ]}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      {/* ── DESLOCAMENTOS ───────────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={filtroProjeto}
              onChange={(e) => setFiltroProjeto(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">Todos os projetos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            {filtroProjeto && (
              <small style={{ color: 'var(--color-muted)' }}>
                {filtered.length} registro(s) · {totalKm.toFixed(1)} km · {formatCurrency(totalValor)}
              </small>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button button--ghost button--small" type="button" onClick={() => { setRelatorioForm(initialRelatorioForm); setIsRelatorioOpen(true); }}>
              Gerar Relatório
            </button>
            <button className="button button--ghost button--small" type="button" onClick={openNew}>
              Registrar
            </button>
          </div>
        </div>

        {loading ? <LoadingBlock label="Carregando deslocamentos..." /> : null}

        {!loading && filtered.length === 0 ? (
          <EmptyState message="Nenhum deslocamento registrado." />
        ) : null}

        {!loading && filtered.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Projeto</th>
                  <th>Cliente / Fazenda</th>
                  <th>km</th>
                  <th>Valor</th>
                  <th>Pedágios</th>
                  <th>Refeição</th>
                  <th>Reembolso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>{formatDate(d.data)}</td>
                    <td>
                      <strong>{d.projeto?.nome || '—'}</strong>
                      {d.responsavel ? <div className="table-subline">{d.responsavel.nome}</div> : null}
                    </td>
                    <td>
                      {d.cliente?.nomeFantasia || d.cliente?.razaoSocial || '—'}
                      {d.cliente?.nomeFazenda ? <div className="table-subline">{d.cliente.nomeFazenda}</div> : null}
                    </td>
                    <td>{d.distanciaKm.toFixed(1)} km</td>
                    <td>{formatCurrency(d.valorTotal)}</td>
                    <td>{d.pedagios ? formatCurrency(d.pedagios) : '—'}</td>
                    <td>{d.refeicao ? formatCurrency(d.refeicao) : '—'}</td>
                    <td>
                      <button
                        type="button"
                        className={`badge ${d.reembolsado ? 'badge--success' : 'badge--muted'}`}
                        style={{ cursor: 'pointer', border: 'none', background: 'none' }}
                        onClick={() => void toggleReembolsado(d)}
                        title="Clique para alternar"
                      >
                        {d.reembolsado ? 'Reembolsado' : 'Pendente'}
                      </button>
                    </td>
                    <td>
                      <div className="table-actions-toolbar">
                        <button className="button button--ghost button--small" type="button" onClick={() => openEdit(d)}>
                          Editar
                        </button>
                        <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(d)}>
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

      {/* ── RELATÓRIOS GERADOS ──────────────────────────────────────────── */}
      {relatorios.length > 0 && (
        <section className="panel">
          <div className="panel__header">
            <h3 className="panel__title">Relatórios de Deslocamento</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Relatório</th>
                  <th>Projeto</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {relatorios.map((rel) => (
                  <tr key={rel.id}>
                    <td>
                      {rel.arquivoUrl ? (
                        <a href={rel.arquivoUrl} target="_blank" rel="noopener noreferrer" className="button button--ghost button--small">
                          Abrir PDF
                        </a>
                      ) : <span className="table-subline">—</span>}
                    </td>
                    <td>{rel.projeto?.nome || '—'}</td>
                    <td><small>{rel.descricao || '—'}</small></td>
                    <td><span className={statusBadgeClass(rel.status)}>{rel.status.replace(/_/g, ' ')}</span></td>
                    <td>{formatDate(rel.createdAt)}</td>
                    <td>
                      <div className="table-actions-toolbar">
                        {rel.status === 'RASCUNHO' && (
                          <button
                            className="button button--ghost button--small"
                            type="button"
                            onClick={() => { setAssinarForm(initialAssinarForm); setIsAssinarOpen(rel.id); }}
                          >
                            Enviar p/ Assinatura
                          </button>
                        )}
                        {rel.status === 'AGUARDANDO_ASSINATURA' && (
                          <button
                            className="button button--ghost button--small"
                            type="button"
                            onClick={() => void handleSincronizar(rel.id)}
                          >
                            Verificar Assinatura
                          </button>
                        )}
                        {rel.status === 'ASSINADO' && rel.arquivoUrl && (
                          <a href={rel.arquivoUrl} target="_blank" rel="noopener noreferrer" className="button button--ghost button--small">
                            PDF Assinado
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── MODAL: REGISTRAR/EDITAR DESLOCAMENTO ────────────────────────── */}
      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar deslocamento' : 'Registrar deslocamento'}
        subtitle="Ao selecionar o projeto, o cliente e a distância padrão são preenchidos automaticamente."
        onClose={closeModal}
      >
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
          <div className="field field--span-2">
            <label>Projeto</label>
            <select value={form.projetoId} onChange={(e) => handleProjetoChange(e.target.value)} required>
              <option value="">Selecione o projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="field field--span-2">
            <label>Cliente</label>
            <select value={form.clienteId} onChange={(e) => setForm((c) => ({ ...c, clienteId: e.target.value }))} required>
              <option value="">Selecione o cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}{c.nomeFazenda ? ` — ${c.nomeFazenda}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field field--span-2">
            <label>Responsável pela visita</label>
            <select value={form.responsavelId} onChange={(e) => setForm((c) => ({ ...c, responsavelId: e.target.value }))}>
              <option value="">Não informado</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Data da visita</label>
            <input type="date" value={form.data} onChange={(e) => setForm((c) => ({ ...c, data: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Doc. Fiscal</label>
            <input value={form.docFiscal} onChange={(e) => setForm((c) => ({ ...c, docFiscal: e.target.value }))} placeholder="Número do documento fiscal" />
          </div>

          <div className="field">
            <label>Distância (km)</label>
            <input type="number" min="0" step="0.1" value={form.distanciaKm} onChange={(e) => setForm((c) => ({ ...c, distanciaKm: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Preço por km (R$)</label>
            <input type="number" min="0" step="0.01" value={form.precoKm} onChange={(e) => setForm((c) => ({ ...c, precoKm: e.target.value }))} required />
          </div>

          <div className="field">
            <label>Pedágios (R$)</label>
            <input type="number" min="0" step="0.01" value={form.pedagios} onChange={(e) => setForm((c) => ({ ...c, pedagios: e.target.value }))} placeholder="0,00" />
          </div>
          <div className="field">
            <label>Refeição (R$)</label>
            <input type="number" min="0" step="0.01" value={form.refeicao} onChange={(e) => setForm((c) => ({ ...c, refeicao: e.target.value }))} placeholder="0,00" />
          </div>

          <div className="field">
            <label>Valor total calculado</label>
            <input value={isNaN(valorTotal) ? '—' : formatCurrency(valorTotal)} readOnly style={{ background: 'var(--color-surface-2, #f3f4f6)', cursor: 'default' }} />
          </div>

          <div className="field field--span-2">
            <label>Descrição / observação</label>
            <input value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} placeholder="Ex.: visita de diagnóstico inicial" />
          </div>

          <div className="field">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.reembolsado} onChange={(e) => setForm((c) => ({ ...c, reembolsado: e.target.checked }))} />
              Já foi reembolsado
            </label>
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Registrar deslocamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: GERAR RELATÓRIO ───────────────────────────────────────── */}
      <Modal
        open={isRelatorioOpen}
        title="Gerar Relatório de Deslocamento"
        subtitle="Selecione o projeto e o período. O relatório será gerado em PDF e salvo no Repositório."
        onClose={() => { if (!gerando) { setIsRelatorioOpen(false); setError(null); } }}
      >
        <form className="form-grid" onSubmit={(e) => void handleGerarRelatorio(e)}>
          <div className="field field--span-2">
            <label>Projeto</label>
            <select value={relatorioForm.projetoId} onChange={(e) => setRelatorioForm((f) => ({ ...f, projetoId: e.target.value }))} required>
              <option value="">Selecione o projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Data início do período</label>
            <input type="date" value={relatorioForm.dataInicio} onChange={(e) => setRelatorioForm((f) => ({ ...f, dataInicio: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Data fim do período</label>
            <input type="date" value={relatorioForm.dataFim} onChange={(e) => setRelatorioForm((f) => ({ ...f, dataFim: e.target.value }))} required />
          </div>

          <div className="field">
            <label>Adiantamentos recebidos (R$)</label>
            <input type="number" min="0" step="0.01" value={relatorioForm.adiantamento} onChange={(e) => setRelatorioForm((f) => ({ ...f, adiantamento: e.target.value }))} placeholder="0,00" />
          </div>
          <div className="field field--span-2">
            <label>Anotações</label>
            <input value={relatorioForm.anotacoes} onChange={(e) => setRelatorioForm((f) => ({ ...f, anotacoes: e.target.value }))} placeholder="Observações adicionais" />
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={gerando}>
              {gerando ? 'Gerando PDF...' : 'Gerar Relatório'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ENVIAR PARA ASSINATURA ────────────────────────────────── */}
      <Modal
        open={!!isAssinarOpen}
        title="Enviar para Assinatura"
        subtitle="O relatório será enviado ao Autentique. O signatário receberá um link por e-mail."
        onClose={() => { if (!saving) { setIsAssinarOpen(null); setError(null); } }}
      >
        <form className="form-grid" onSubmit={(e) => void handleEnviarAssinatura(e)}>
          <div className="field field--span-2">
            <label>Nome do signatário</label>
            <input
              value={assinarForm.signatarioNome}
              onChange={(e) => setAssinarForm((f) => ({ ...f, signatarioNome: e.target.value }))}
              placeholder="Nome do cliente ou responsável"
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
    </div>
  );
}
