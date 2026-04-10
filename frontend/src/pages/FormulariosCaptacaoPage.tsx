import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { Copy, ExternalLink } from 'lucide-react';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { EtapaCrm, FormularioCaptacao, FormularioSubmissao, ProdutoServico } from '../types/api';

const ORIGENS = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'OUTRO', label: 'Outro' },
];

const ETAPAS: { value: EtapaCrm; label: string }[] = [
  { value: 'LEAD_RECEBIDO', label: 'Lead recebido' },
  { value: 'CONTATO_INICIADO', label: 'Contato iniciado' },
  { value: 'DIAGNOSTICO', label: 'Diagnóstico' },
  { value: 'PROPOSTA_ENVIADA', label: 'Proposta enviada' },
  { value: 'NEGOCIACAO', label: 'Negociação' },
];

const initialForm = {
  nome: '',
  slug: '',
  origemLead: 'WHATSAPP',
  etapaInicial: 'LEAD_RECEBIDO' as EtapaCrm,
  titulo: '',
  descricao: '',
  produtoServicoId: '',
  ativo: true,
};

function toSlug(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function publicUrl(slug: string) {
  const base = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
  return `${base}/captacao/${slug}`;
}


export default function FormulariosCaptacaoPage() {
  const [formularios, setFormularios] = useState<FormularioCaptacao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...initialForm });
  const [detailFormulario, setDetailFormulario] = useState<(FormularioCaptacao & { submissoes?: FormularioSubmissao[] }) | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        http.get<FormularioCaptacao[]>('/captacao/formularios'),
        http.get<{ itens: ProdutoServico[] }>('/produtos-servicos'),
      ]);
      setFormularios(fRes.data ?? []);
      setProdutos(pRes.data.itens ?? []);
    } catch {
      setFormularios([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...initialForm });
    setError(null);
    setSuccess(null);
    setShowModal(true);
  }

  function openEdit(f: FormularioCaptacao) {
    setEditingId(f.id);
    setForm({
      nome: f.nome,
      slug: f.slug,
      origemLead: f.origemLead,
      etapaInicial: f.etapaInicial,
      titulo: f.titulo,
      descricao: f.descricao ?? '',
      produtoServicoId: f.produtoServicoId ?? '',
      ativo: f.ativo,
    });
    setError(null);
    setSuccess(null);
    setShowModal(true);
  }

  async function openDetail(f: FormularioCaptacao) {
    setDetailFormulario(f);
    setLoadingDetail(true);
    try {
      const res = await http.get<FormularioCaptacao & { submissoes?: FormularioSubmissao[] }>(`/captacao/formularios/${f.id}`);
      setDetailFormulario(res.data);
    } catch {
      // keep current
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        produtoServicoId: form.produtoServicoId || undefined,
      };
      if (editingId) {
        await http.put(`/captacao/formularios/${editingId}`, payload);
        setSuccess('Formulário atualizado.');
      } else {
        await http.post('/captacao/formularios', payload);
        setSuccess('Formulário criado.');
      }
      setShowModal(false);
      await load();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data?.message;
        setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Erro ao salvar.');
      } else {
        setError('Erro ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir formulário? Submissões relacionadas também serão removidas.')) return;
    try {
      await http.delete(`/captacao/formularios/${id}`);
      await load();
      if (detailFormulario?.id === id) setDetailFormulario(null);
    } catch {
      alert('Erro ao excluir.');
    }
  }

  function handleCopy(slug: string) {
    const url = publicUrl(slug);
    void navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  }

  function handleNomeChange(nome: string) {
    setForm((c) => ({
      ...c,
      nome,
      slug: c.slug === toSlug(c.nome) || c.slug === '' ? toSlug(nome) : c.slug,
    }));
  }

  const origemLabel = (v: string) => ORIGENS.find((o) => o.value === v)?.label ?? v;
  const etapaLabel = (v: string) => ETAPAS.find((e) => e.value === v)?.label ?? v;

  return (
    <div className="page-stack">
      <PageHeader
        title="Formulários de Captação"
        subtitle="Crie formulários públicos por canal de origem para capturar leads diretamente no CRM."
        actions={<button className="button" onClick={openCreate}>+ Novo formulário</button>}
      />

      {success && !showModal ? <Feedback type="success" message={success} /> : null}

      <div className="split-layout">
        {/* List */}
        <div className="split-layout__main">
          {loading ? <LoadingBlock /> : null}
          {!loading && formularios.length === 0 ? (
            <EmptyState message="Nenhum formulário. Crie um para cada campanha ou canal de captação." />
          ) : null}
          {!loading && formularios.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Origem</th>
                    <th>Produto</th>
                    <th>Leads</th>
                    <th>Status</th>
                    <th>Link público</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {formularios.map((f) => (
                    <tr key={f.id} className="table-row--clickable" onClick={() => void openDetail(f)}>
                      <td>
                        <strong>{f.nome}</strong>
                        <div className="muted text-sm">{f.titulo}</div>
                      </td>
                      <td>{origemLabel(f.origemLead)}</td>
                      <td>{f.produtoServico?.nome ?? <span className="muted">—</span>}</td>
                      <td>{f._count?.submissoes ?? 0}</td>
                      <td>
                        <span className={`badge badge--${f.ativo ? 'success' : 'muted'}`}>
                          {f.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Copiar link"
                            onClick={() => handleCopy(f.slug)}
                          >
                            <Copy size={14} />
                            {copied === f.slug ? <span className="muted text-sm">Copiado!</span> : null}
                          </button>
                          <a
                            className="icon-btn"
                            href={publicUrl(f.slug)}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir formulário"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-btn" onClick={() => openEdit(f)}>Editar</button>
                          <button className="icon-btn icon-btn--danger" onClick={() => void handleDelete(f.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* Detail panel */}
        {detailFormulario ? (
          <div className="split-layout__side panel">
            <div className="panel__header panel__header--row">
              <div>
                <h3>{detailFormulario.nome}</h3>
                <p className="muted">{origemLabel(detailFormulario.origemLead)} · {detailFormulario.submissoes?.length ?? 0} lead(s)</p>
              </div>
              <button className="icon-btn" onClick={() => setDetailFormulario(null)}>✕</button>
            </div>

            <div className="field-row">
              <label>Link público</label>
              <div className="input-copy">
                <input readOnly value={publicUrl(detailFormulario.slug)} />
                <button className="icon-btn" onClick={() => handleCopy(detailFormulario.slug)} title="Copiar">
                  <Copy size={13} />
                  {copied === detailFormulario.slug ? ' Copiado!' : ''}
                </button>
              </div>
            </div>

            {loadingDetail ? <LoadingBlock /> : null}

            {!loadingDetail && (detailFormulario.submissoes?.length ?? 0) === 0 ? (
              <p className="muted">Nenhum lead capturado ainda.</p>
            ) : null}

            {!loadingDetail && (detailFormulario.submissoes?.length ?? 0) > 0 ? (
              <div className="submissoes-list">
                {detailFormulario.submissoes!.map((s) => (
                  <div key={s.id} className="submissao-card">
                    <strong>{s.nomeContato}</strong>
                    {s.empresaNome ? <span>{s.empresaNome}</span> : null}
                    {s.email ? <span>{s.email}</span> : null}
                    {s.telefone ? <span>{s.telefone}</span> : null}
                    {s.mensagem ? <p className="muted text-sm">{s.mensagem}</p> : null}
                    {s.oportunidade ? (
                      <span className="badge badge--info">
                        CRM: {etapaLabel(s.oportunidade.etapa)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} title={editingId ? 'Editar formulário' : 'Novo formulário de captação'} onClose={() => setShowModal(false)}>
          {error ? <Feedback type="error" message={error} /> : null}
          <form className="form-grid" onSubmit={(e) => void handleSave(e)}>
            <div className="field">
              <label htmlFor="fc-nome">Nome interno</label>
              <input
                id="fc-nome"
                value={form.nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: Captação WhatsApp Consultoria"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="fc-slug">Slug (URL)</label>
              <input
                id="fc-slug"
                value={form.slug}
                onChange={(e) => setForm((c) => ({ ...c, slug: toSlug(e.target.value) }))}
                placeholder="captacao-whatsapp"
                required
              />
              <small className="muted">{publicUrl(form.slug || 'seu-slug')}</small>
            </div>

            <div className="field">
              <label htmlFor="fc-titulo">Título público</label>
              <input
                id="fc-titulo"
                value={form.titulo}
                onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))}
                placeholder="Ex: Fale conosco pelo WhatsApp"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="fc-descricao">Descrição (opcional)</label>
              <textarea
                id="fc-descricao"
                value={form.descricao}
                onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))}
                rows={3}
                placeholder="Texto exibido abaixo do título no formulário público."
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="fc-origem">Origem do lead</label>
                <select
                  id="fc-origem"
                  value={form.origemLead}
                  onChange={(e) => setForm((c) => ({ ...c, origemLead: e.target.value }))}
                >
                  {ORIGENS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="fc-etapa">Etapa inicial no CRM</label>
                <select
                  id="fc-etapa"
                  value={form.etapaInicial}
                  onChange={(e) => setForm((c) => ({ ...c, etapaInicial: e.target.value as EtapaCrm }))}
                >
                  {ETAPAS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="fc-produto">Produto / serviço (opcional)</label>
              <select
                id="fc-produto"
                value={form.produtoServicoId}
                onChange={(e) => setForm((c) => ({ ...c, produtoServicoId: e.target.value }))}
              >
                <option value="">Nenhum</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="field field--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((c) => ({ ...c, ativo: e.target.checked }))}
                />
                Formulário ativo (aceita submissões)
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="button button--ghost" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="button" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar formulário'}
              </button>
            </div>
          </form>
        </Modal>
    </div>
  );
}
