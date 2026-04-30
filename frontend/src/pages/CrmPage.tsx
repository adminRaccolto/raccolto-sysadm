import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Settings, X } from 'lucide-react';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type {
  Cliente,
  CrmEtapa,
  HistoricoComentario,
  OportunidadeCrm,
  ProdutoServico,
  UsuarioResumo,
} from '../types/api';
import { formatCurrency, formatDate, toDateInputValue } from '../utils/format';

const initialForm = {
  titulo: '',
  empresaNome: '',
  contatoNome: '',
  email: '',
  telefone: '',
  whatsapp: '',
  origemLead: '',
  produtoServicoId: '',
  responsavelId: '',
  clienteId: '',
  valorEstimado: '',
  etapa: 'LEAD_RECEBIDO',
  probabilidade: '10',
  previsaoFechamento: '',
  proximaAcao: '',
  dataProximaAcao: '',
  motivoPerda: '',
  observacoes: '',
  tagsInput: '',
};

type OportunidadeForm = typeof initialForm;
type ViewMode = 'KANBAN' | 'LISTA';

export default function CrmPage() {
  const [oportunidades, setOportunidades] = useState<OportunidadeCrm[]>([]);
  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isEtapasModalOpen, setIsEtapasModalOpen] = useState(false);
  const [form, setForm] = useState<OportunidadeForm>(initialForm);
  const [novoComentario, setNovoComentario] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [convertOptions, setConvertOptions] = useState({ criarContrato: true, criarProjeto: true });

  // Stage manager state
  const [etapaForm, setEtapaForm] = useState({ nome: '', cor: '#6366f1' });
  const [editingEtapaId, setEditingEtapaId] = useState<string | null>(null);
  const [savingEtapa, setSavingEtapa] = useState(false);

  const selected = useMemo(() => oportunidades.find((item) => item.id === selectedId) || null, [oportunidades, selectedId]);
  const comentarios = selected?.comentarios ?? [];

  const etapaMap = useMemo(() => {
    const m: Record<string, CrmEtapa> = {};
    etapas.forEach((e) => { m[e.chave] = e; });
    return m;
  }, [etapas]);

  function etapaNome(chave: string) { return etapaMap[chave]?.nome ?? chave; }
  function etapaCor(chave: string) { return etapaMap[chave]?.cor ?? '#6b7280'; }

  async function loadEtapas() {
    try {
      const res = await http.get<CrmEtapa[]>('/crm/etapas');
      setEtapas(res.data);
    } catch { /* noop */ }
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [opResponse, clientesResponse, produtosResponse] = await Promise.all([
        http.get<OportunidadeCrm[]>('/crm/oportunidades', {
          params: {
            etapa: filtroEtapa || undefined,
            responsavelId: filtroResponsavel || undefined,
            produtoServicoId: filtroProduto || undefined,
          },
        }),
        http.get<Cliente[]>('/clientes'),
        http.get<ProdutoServico[]>('/produtos-servicos'),
      ]);

      let usuariosData: UsuarioResumo[] = [];
      try {
        const usuariosResponse = await http.get<UsuarioResumo[]>('/usuarios');
        usuariosData = usuariosResponse.data;
      } catch { usuariosData = []; }

      setOportunidades(opResponse.data);
      setClientes(clientesResponse.data);
      setProdutos(produtosResponse.data);
      setUsuarios(usuariosData);
      setSelectedId((current) => {
        if (!opResponse.data.length) return null;
        if (current && opResponse.data.some((item) => item.id === current)) return current;
        return opResponse.data[0].id;
      });
    } catch (err) {
      handleApiError(err, 'Falha ao carregar o CRM.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadEtapas(); }, []);
  useEffect(() => { void loadData(); }, [filtroEtapa, filtroResponsavel, filtroProduto]);

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
    setNovoComentario('');
    setConvertOptions({ criarContrato: true, criarProjeto: true });
  }

  function openNewModal() {
    resetForm();
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeModal() {
    if (saving || commenting) return;
    resetForm();
    setIsModalOpen(false);
  }

  function startEdit(item: OportunidadeCrm) {
    setSelectedId(item.id);
    setEditingId(item.id);
    setForm({
      titulo: item.titulo,
      empresaNome: item.empresaNome,
      contatoNome: item.contatoNome || '',
      email: item.email || '',
      telefone: item.telefone || '',
      whatsapp: item.whatsapp || '',
      origemLead: item.origemLead || '',
      produtoServicoId: item.produtoServicoId || '',
      responsavelId: item.responsavelId || '',
      clienteId: item.clienteId || '',
      valorEstimado: item.valorEstimado ? String(item.valorEstimado) : '',
      etapa: item.etapa,
      probabilidade: String(item.probabilidade ?? 10),
      previsaoFechamento: toDateInputValue(item.previsaoFechamento),
      proximaAcao: item.proximaAcao || '',
      dataProximaAcao: toDateInputValue(item.dataProximaAcao),
      motivoPerda: item.motivoPerda || '',
      observacoes: item.observacoes || '',
      tagsInput: (item.tags ?? []).join(', '),
    });
    setNovoComentario('');
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const tags = form.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        titulo: form.titulo.trim(),
        empresaNome: form.empresaNome.trim(),
        ...(form.contatoNome ? { contatoNome: form.contatoNome.trim() } : {}),
        ...(form.email ? { email: form.email.trim() } : {}),
        ...(form.telefone ? { telefone: form.telefone.trim() } : {}),
        ...(form.whatsapp ? { whatsapp: form.whatsapp.trim() } : {}),
        ...(form.origemLead ? { origemLead: form.origemLead.trim() } : {}),
        ...(form.produtoServicoId ? { produtoServicoId: form.produtoServicoId } : {}),
        ...(form.responsavelId ? { responsavelId: form.responsavelId } : {}),
        ...(form.clienteId ? { clienteId: form.clienteId } : {}),
        ...(form.valorEstimado ? { valorEstimado: Number(form.valorEstimado) } : {}),
        etapa: form.etapa,
        ...(form.probabilidade ? { probabilidade: Number(form.probabilidade) } : {}),
        ...(form.previsaoFechamento ? { previsaoFechamento: form.previsaoFechamento } : {}),
        ...(form.proximaAcao ? { proximaAcao: form.proximaAcao.trim() } : {}),
        ...(form.dataProximaAcao ? { dataProximaAcao: form.dataProximaAcao } : {}),
        ...(form.motivoPerda ? { motivoPerda: form.motivoPerda.trim() } : {}),
        ...(form.observacoes ? { observacoes: form.observacoes.trim() } : {}),
        tags,
      };

      if (editingId) {
        await http.put(`/crm/oportunidades/${editingId}`, payload);
        setSuccess('Oportunidade atualizada com sucesso.');
      } else {
        await http.post('/crm/oportunidades', payload);
        setSuccess('Oportunidade cadastrada com sucesso.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      handleApiError(err, editingId ? 'Falha ao atualizar oportunidade.' : 'Falha ao cadastrar oportunidade.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item?: OportunidadeCrm) {
    const target = item ?? selected;
    if (!target) return;
    const confirmed = window.confirm(`Excluir a oportunidade "${target.titulo}"?`);
    if (!confirmed) return;
    try {
      await http.delete(`/crm/oportunidades/${target.id}`);
      setSuccess('Oportunidade excluída com sucesso.');
      if (editingId === target.id) closeModal();
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir oportunidade.');
    }
  }

  async function handleConvert() {
    if (!selected) return;
    setConvertendo(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await http.post(`/crm/oportunidades/${selected.id}/converter`, convertOptions);
      const data = response.data as { clienteId?: string; contratoId?: string; projetoId?: string; message?: string };
      const partes = [data.message || 'Oportunidade convertida com sucesso.'];
      if (data.clienteId) partes.push('Cliente criado/vinculado.');
      if (data.contratoId) partes.push('Contrato criado.');
      if (data.projetoId) partes.push('Projeto criado.');
      setSuccess(partes.join(' '));
      setIsConvertModalOpen(false);
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao converter oportunidade.');
    } finally {
      setConvertendo(false);
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !novoComentario.trim()) return;
    setCommenting(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post(`/crm/oportunidades/${selected.id}/comentarios`, { mensagem: novoComentario.trim() });
      setNovoComentario('');
      setSuccess('Comentário registrado com sucesso.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao registrar comentário.');
    } finally {
      setCommenting(false);
    }
  }

  async function handleMove(item: OportunidadeCrm, etapa: string) {
    if (item.etapa === etapa) return;
    try {
      await http.put(`/crm/oportunidades/${item.id}`, { etapa });
      setSelectedId(item.id);
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao mover a oportunidade.');
    }
  }

  // Stage manager handlers
  async function handleSaveEtapa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingEtapa(true);
    try {
      if (editingEtapaId) {
        await http.put(`/crm/etapas/${editingEtapaId}`, { nome: etapaForm.nome, cor: etapaForm.cor });
      } else {
        const chave = etapaForm.nome.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
        await http.post('/crm/etapas', { chave, nome: etapaForm.nome, cor: etapaForm.cor });
      }
      setEtapaForm({ nome: '', cor: '#6366f1' });
      setEditingEtapaId(null);
      await loadEtapas();
    } catch (err) {
      handleApiError(err, 'Falha ao salvar etapa.');
    } finally {
      setSavingEtapa(false);
    }
  }

  async function handleDeleteEtapa(etapa: CrmEtapa) {
    if (!window.confirm(`Excluir a etapa "${etapa.nome}"? As oportunidades nesta etapa não serão excluídas.`)) return;
    try {
      await http.delete(`/crm/etapas/${etapa.id}`);
      await loadEtapas();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir etapa.');
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

  const kanbanGroups = useMemo(
    () => etapas.map((etapa) => ({ etapa, itens: oportunidades.filter((item) => item.etapa === etapa.chave) })),
    [oportunidades, etapas],
  );

  return (
    <div className="page-stack page-stack--wide compact-gap">
      <PageHeader
        title="CRM"
        subtitle="Pipeline comercial clássico, com kanban em tela cheia, drag-and-drop e histórico de comentários por lead."
        actions={
          <div className="header-tools">
            <button className="button button--ghost button--small" type="button" onClick={openNewModal}>Nova</button>
            <button className="button button--ghost button--small" type="button" onClick={() => selected && startEdit(selected)} disabled={!selected}>Editar</button>
            <button className="button button--ghost button--small" type="button" onClick={() => setIsConvertModalOpen(true)} disabled={!selected}>Converter</button>
            <button className="button button--danger button--small" type="button" onClick={() => void handleDelete()} disabled={!selected}>Excluir</button>
            <button className="button button--ghost button--small crm-settings-btn" type="button" onClick={() => setIsEtapasModalOpen(true)} title="Configurar etapas do funil">
              <Settings size={14} strokeWidth={2} />
            </button>
          </div>
        }
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="page-stack">
        <div className="workspace-panel panel panel--tight">
          <div className="panel__header panel__header--row panel__header--sticky">
            <div>
              <h3>Pipeline comercial</h3>
              <p>{oportunidades.length} oportunidade(s) no CRM.</p>
            </div>
            <div className="header-tools">
              <select className="compact-select" value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)}>
                <option value="">Todas as etapas</option>
                {etapas.map((etapa) => <option key={etapa.chave} value={etapa.chave}>{etapa.nome}</option>)}
              </select>
              <select className="compact-select" value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
                <option value="">Todos os responsáveis</option>
                {usuarios.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
              <select className="compact-select" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)}>
                <option value="">Todos os serviços</option>
                {produtos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
              <div className="segmented">
                <button type="button" className={`segmented__button${viewMode === 'LISTA' ? ' segmented__button--active' : ''}`} onClick={() => setViewMode('LISTA')}>Lista</button>
                <button type="button" className={`segmented__button${viewMode === 'KANBAN' ? ' segmented__button--active' : ''}`} onClick={() => setViewMode('KANBAN')}>Kanban</button>
              </div>
            </div>
          </div>

          {selected ? (
            <div className="selection-note compact-selection-note">
              Selecionado: <strong>{selected.titulo}</strong> · {selected.empresaNome}
              <span>Responsável: {selected.responsavel?.nome || 'Não definido'}</span>
              <span>Valor: {formatCurrency(selected.valorEstimado)}</span>
              <span>Comentários: {comentarios.length}</span>
            </div>
          ) : null}

          {loading ? <LoadingBlock label="Carregando CRM..." /> : null}
          {!loading && oportunidades.length === 0 ? <EmptyState message="Nenhuma oportunidade cadastrada ainda." /> : null}

          {!loading && oportunidades.length > 0 && viewMode === 'KANBAN' ? (
            <div className="kanban-board kanban-board--wide crm-kanban crm-kanban--fullscreen">
              {kanbanGroups.map((group) => (
                <div
                  className="kanban-column"
                  key={group.etapa.chave}
                  style={{ '--col-color': group.etapa.cor } as React.CSSProperties}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={async () => {
                    const moving = oportunidades.find((item) => item.id === draggingId);
                    if (moving) await handleMove(moving, group.etapa.chave);
                    setDraggingId(null);
                  }}
                >
                  <div className="kanban-column__header crm-column__header">
                    <div className="crm-column__dot" style={{ background: group.etapa.cor }} />
                    <h4>{group.etapa.nome}</h4>
                    <span className="crm-column__count">{group.itens.length}</span>
                  </div>
                  <div className="kanban-column__body">
                    {group.itens.length === 0 ? <div className="kanban-empty">Sem oportunidades nesta etapa.</div> : null}
                    {group.itens.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDraggingId(item.id)}
                        className={`kanban-card crm-card${selectedId === item.id ? ' crm-card--selected' : ''}`}
                        style={{ '--card-color': etapaCor(item.etapa) } as React.CSSProperties}
                        onClick={() => setSelectedId(item.id)}
                        onDoubleClick={() => startEdit(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') startEdit(item); }}
                      >
                        <div className="crm-card__stripe" style={{ background: etapaCor(item.etapa) }} />
                        <div className="crm-card__body">
                          <div className="kanban-card__top">
                            <strong>{item.titulo}</strong>
                            <button
                              type="button"
                              className="crm-card__delete"
                              title="Excluir"
                              onClick={(e) => { e.stopPropagation(); void handleDelete(item); }}
                            >
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                          <p className="crm-card__company">{item.empresaNome}</p>
                          <div className="kanban-card__meta">
                            <span>{item.responsavel?.nome || 'Sem responsável'}</span>
                            <span>{item.probabilidade}%</span>
                            {item.valorEstimado ? <span>{formatCurrency(item.valorEstimado)}</span> : null}
                            {item.previsaoFechamento ? <span>{formatDate(item.previsaoFechamento)}</span> : null}
                          </div>
                          {item.tags && item.tags.length > 0 ? (
                            <div className="crm-card__tags">
                              {item.tags.map((tag) => (
                                <span key={tag} className="crm-tag">{tag}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && oportunidades.length > 0 && viewMode === 'LISTA' ? (
            <div className="table-wrap table-wrap--full">
              <table>
                <thead>
                  <tr>
                    <th>Oportunidade</th>
                    <th>Etapa</th>
                    <th>Tags</th>
                    <th>Responsável</th>
                    <th>Valor</th>
                    <th>Previsão</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {oportunidades.map((item) => (
                    <tr
                      key={item.id}
                      className={selectedId === item.id ? 'table-row--selected' : ''}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => startEdit(item)}
                    >
                      <td>
                        <strong>{item.titulo}</strong>
                        <div className="table-subline">{item.empresaNome} · {item.contatoNome || item.email || 'Sem contato principal'}</div>
                      </td>
                      <td>
                        <span className="crm-etapa-badge" style={{ background: etapaCor(item.etapa) + '22', color: etapaCor(item.etapa), borderColor: etapaCor(item.etapa) + '44' }}>
                          {etapaNome(item.etapa)}
                        </span>
                      </td>
                      <td>
                        <div className="crm-card__tags crm-card__tags--inline">
                          {(item.tags ?? []).map((tag) => <span key={tag} className="crm-tag">{tag}</span>)}
                        </div>
                      </td>
                      <td>{item.responsavel?.nome || 'Não definido'}</td>
                      <td>{formatCurrency(item.valorEstimado)}</td>
                      <td>{formatDate(item.previsaoFechamento)}</td>
                      <td>
                        <button type="button" className="crm-card__delete crm-card__delete--table" onClick={(e) => { e.stopPropagation(); void handleDelete(item); }} title="Excluir">
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>

      {/* Oportunidade form modal */}
      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar oportunidade' : 'Nova oportunidade'}
        subtitle="Use o funil clássico e registre comentários sequenciais para cada ação do lead."
        onClose={closeModal}
      >
        <div className="crm-modal-layout">
          <form className="form-grid form-grid--wide compact-form" onSubmit={handleSubmit}>
            <div className="field field--span-2"><label>Título</label><input value={form.titulo} onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))} required /></div>
            <div className="field field--span-2"><label>Empresa / lead</label><input value={form.empresaNome} onChange={(e) => setForm((c) => ({ ...c, empresaNome: e.target.value }))} required /></div>
            <div className="field"><label>Contato</label><input value={form.contatoNome} onChange={(e) => setForm((c) => ({ ...c, contatoNome: e.target.value }))} /></div>
            <div className="field"><label>E-mail</label><input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} /></div>
            <div className="field"><label>Telefone</label><input value={form.telefone} onChange={(e) => setForm((c) => ({ ...c, telefone: e.target.value }))} /></div>
            <div className="field"><label>WhatsApp</label><input value={form.whatsapp} onChange={(e) => setForm((c) => ({ ...c, whatsapp: e.target.value }))} /></div>
            <div className="field"><label>Origem do lead</label><input value={form.origemLead} onChange={(e) => setForm((c) => ({ ...c, origemLead: e.target.value }))} placeholder="Indicação, site, evento..." /></div>
            <div className="field"><label>Serviço de interesse</label>
              <select value={form.produtoServicoId} onChange={(e) => setForm((c) => ({ ...c, produtoServicoId: e.target.value }))}>
                <option value="">Selecione</option>
                {produtos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </div>
            <div className="field"><label>Responsável</label>
              <select value={form.responsavelId} onChange={(e) => setForm((c) => ({ ...c, responsavelId: e.target.value }))}>
                <option value="">Selecione</option>
                {usuarios.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </div>
            <div className="field"><label>Cliente já existente</label>
              <select value={form.clienteId} onChange={(e) => setForm((c) => ({ ...c, clienteId: e.target.value }))}>
                <option value="">Criar cliente na conversão</option>
                {clientes.map((item) => <option key={item.id} value={item.id}>{item.razaoSocial}</option>)}
              </select>
            </div>
            <div className="field"><label>Etapa</label>
              <select value={form.etapa} onChange={(e) => setForm((c) => ({ ...c, etapa: e.target.value }))}>
                {etapas.map((item) => <option key={item.chave} value={item.chave}>{item.nome}</option>)}
              </select>
            </div>
            <div className="field"><label>Valor estimado (R$)</label><input type="number" step="0.01" value={form.valorEstimado} onChange={(e) => setForm((c) => ({ ...c, valorEstimado: e.target.value }))} /></div>
            <div className="field"><label>Probabilidade (%)</label><input type="number" min="0" max="100" value={form.probabilidade} onChange={(e) => setForm((c) => ({ ...c, probabilidade: e.target.value }))} /></div>
            <div className="field"><label>Previsão de fechamento</label><input type="date" value={form.previsaoFechamento} onChange={(e) => setForm((c) => ({ ...c, previsaoFechamento: e.target.value }))} /></div>
            <div className="field field--span-2"><label>Próxima ação</label><input value={form.proximaAcao} onChange={(e) => setForm((c) => ({ ...c, proximaAcao: e.target.value }))} /></div>
            <div className="field"><label>Data da próxima ação</label><input type="date" value={form.dataProximaAcao} onChange={(e) => setForm((c) => ({ ...c, dataProximaAcao: e.target.value }))} /></div>
            <div className="field"><label>Motivo de perda</label><input value={form.motivoPerda} onChange={(e) => setForm((c) => ({ ...c, motivoPerda: e.target.value }))} /></div>
            <div className="field field--span-2">
              <label>Tags / segmentos <small>(separados por vírgula)</small></label>
              <input value={form.tagsInput} onChange={(e) => setForm((c) => ({ ...c, tagsInput: e.target.value }))} placeholder="Ex: pecuária, irrigação, soja" />
            </div>
            <div className="field field--span-2"><label>Observações</label><textarea rows={4} value={form.observacoes} onChange={(e) => setForm((c) => ({ ...c, observacoes: e.target.value }))} /></div>
            <div className="field field--span-2"><button className="button button--small" type="submit" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar oportunidade'}</button></div>
          </form>

          {editingId && selected ? (
            <div className="panel panel--compact crm-comments-panel">
              <div className="panel__header">
                <h3>Histórico de comentários</h3>
                <p>Registro sequencial das interações do lead.</p>
              </div>
              <div className="comment-timeline">
                {comentarios.length === 0 ? <div className="comment-empty">Nenhum comentário registrado ainda.</div> : null}
                {comentarios.map((comentario: HistoricoComentario) => (
                  <article key={comentario.id} className="comment-card">
                    <div className="comment-card__header">
                      <strong>{comentario.autorUsuario?.nome || comentario.autorNome}</strong>
                      <span>{formatDate(comentario.createdAt)}</span>
                    </div>
                    <p>{comentario.mensagem}</p>
                  </article>
                ))}
              </div>
              <form className="comment-form" onSubmit={handleAddComment}>
                <label>Novo comentário</label>
                <textarea rows={4} value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} placeholder="Registre a interação, decisão ou próximo passo deste lead." />
                <button className="button button--small" type="submit" disabled={commenting || !novoComentario.trim()}>
                  {commenting ? 'Salvando...' : 'Adicionar comentário'}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Convert modal */}
      <Modal
        open={isConvertModalOpen}
        title="Converter oportunidade"
        subtitle="Faça a conversão sem ocupar espaço do pipeline."
        onClose={() => setIsConvertModalOpen(false)}
      >
        <div className="panel panel--compact">
          <div className="checklist-box compact-checklist">
            <label className="checklist-row">
              <input type="checkbox" checked={convertOptions.criarContrato} onChange={(e) => setConvertOptions((c) => ({ ...c, criarContrato: e.target.checked }))} />
              <span>Criar contrato</span>
            </label>
            <label className="checklist-row">
              <input type="checkbox" checked={convertOptions.criarProjeto} onChange={(e) => setConvertOptions((c) => ({ ...c, criarProjeto: e.target.checked }))} />
              <span>Criar projeto</span>
            </label>
            <button className="button button--small" type="button" onClick={() => void handleConvert()} disabled={convertendo || !selected}>
              {convertendo ? 'Convertendo...' : 'Converter oportunidade'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Stage manager modal */}
      <Modal
        open={isEtapasModalOpen}
        title="Configurar etapas do funil"
        subtitle="Personalize os rótulos, cores e ordem das etapas do seu CRM."
        onClose={() => { setIsEtapasModalOpen(false); setEditingEtapaId(null); setEtapaForm({ nome: '', cor: '#6366f1' }); }}
      >
        <div className="crm-etapas-manager">
          <div className="crm-etapas-list">
            {etapas.map((etapa) => (
              <div key={etapa.id} className="crm-etapa-row">
                <div className="crm-etapa-row__swatch" style={{ background: etapa.cor }} />
                <span className="crm-etapa-row__nome">{etapa.nome}</span>
                <span className="crm-etapa-row__chave">{etapa.chave}</span>
                <div className="crm-etapa-row__actions">
                  <button type="button" className="button button--ghost button--tiny" onClick={() => { setEditingEtapaId(etapa.id); setEtapaForm({ nome: etapa.nome, cor: etapa.cor }); }}>Editar</button>
                  <button type="button" className="button button--danger button--tiny" onClick={() => void handleDeleteEtapa(etapa)}>
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form className="crm-etapa-form compact-form" onSubmit={(e) => void handleSaveEtapa(e)}>
            <h4>{editingEtapaId ? 'Editar etapa' : 'Nova etapa'}</h4>
            <div className="crm-etapa-form__row">
              <div className="field" style={{ flex: 1 }}>
                <label>Nome</label>
                <input value={etapaForm.nome} onChange={(e) => setEtapaForm((c) => ({ ...c, nome: e.target.value }))} required />
              </div>
              <div className="field crm-etapa-form__color">
                <label>Cor</label>
                <input type="color" value={etapaForm.cor} onChange={(e) => setEtapaForm((c) => ({ ...c, cor: e.target.value }))} />
              </div>
            </div>
            <div className="crm-etapa-form__btns">
              <button className="button button--small" type="submit" disabled={savingEtapa || !etapaForm.nome.trim()}>
                {savingEtapa ? 'Salvando...' : editingEtapaId ? 'Salvar' : 'Adicionar etapa'}
              </button>
              {editingEtapaId ? (
                <button type="button" className="button button--ghost button--small" onClick={() => { setEditingEtapaId(null); setEtapaForm({ nome: '', cor: '#6366f1' }); }}>
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
