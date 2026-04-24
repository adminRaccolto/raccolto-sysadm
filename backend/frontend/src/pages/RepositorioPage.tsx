import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { Cliente, Documento, Projeto, TipoDocumento } from '../types/api';
import { formatDate } from '../utils/format';

// ─── Constantes ─────────────────────────────────────────────────────────────

const AREAS: { value: TipoDocumento | 'TODOS'; label: string; icon: string }[] = [
  { value: 'TODOS',                   label: 'Todos',                  icon: '📂' },
  { value: 'CONTRATO',                label: 'Contratos',              icon: '📃' },
  { value: 'RELATORIO_CONSULTORIA',   label: 'Rel. Consultoria',       icon: '📊' },
  { value: 'RELATORIO_DESLOCAMENTO',  label: 'Rel. Deslocamento',      icon: '🚗' },
  { value: 'REEMBOLSO',               label: 'Reembolsos',             icon: '💰' },
  { value: 'TERMO_ENTREGA',           label: 'Termos de Entrega',      icon: '✅' },
  { value: 'APROVACAO',               label: 'Aprovações',             icon: '👍' },
  { value: 'ENTREGAVEL',              label: 'Entregáveis',            icon: '📦' },
  { value: 'OUTRO',                   label: 'Outros',                 icon: '📄' },
];

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  AGUARDANDO_ASSINATURA: 'Ag. Assinatura',
  APROVADO: 'Aprovado',
  ASSINADO: 'Assinado',
  ARQUIVADO: 'Arquivado',
  CANCELADO: 'Cancelado',
};

const initialForm = {
  nome: '',
  tipo: 'OUTRO' as TipoDocumento,
  descricao: '',
  clienteId: '',
  projetoId: '',
  contratoId: '',
  versao: '',
  visivelCliente: false,
  arquivoUrl: '',
  arquivoNomeOriginal: '',
  arquivoMimeType: '',
  arquivoTamanho: 0,
};

type DocForm = typeof initialForm;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    return typeof msg === 'string' ? msg : fallback;
  }
  return fallback;
}

function fileIcon(mime?: string | null): string {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return '📊';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📑';
  if (mime.includes('zip') || mime.includes('compressed')) return '🗜️';
  return '📄';
}

// Resolve o clienteId efetivo de um documento (direto, via projeto, ou via contrato)
function resolveClienteId(d: Documento): string | null {
  const direct = (d as unknown as { clienteId?: string }).clienteId;
  if (direct) return direct;
  const viaProjeto = (d.projeto as unknown as { clienteId?: string } | undefined)?.clienteId;
  if (viaProjeto) return viaProjeto;
  const viaContrato = (d.contrato as unknown as { clienteId?: string } | undefined)?.clienteId;
  return viaContrato ?? null;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function RepositorioPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DocForm>(initialForm);

  // Navegação por pastas
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null); // null = "Geral"
  const [areaSelecionada, setAreaSelecionada] = useState<TipoDocumento | 'TODOS'>('TODOS');
  const [busca, setBusca] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Carregamento ──────────────────────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [docsRes, projRes, cliRes] = await Promise.all([
        http.get<Documento[]>('/documentos'),
        http.get<Projeto[]>('/projetos'),
        http.get<Cliente[]>('/clientes'),
      ]);
      setDocumentos(docsRes.data);
      setProjetos(projRes.data);
      setClientes(cliRes.data);
    } catch (err) {
      setError(getApiError(err, 'Falha ao carregar repositório.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  // ── Agrupamento por cliente ────────────────────────────────────────────────
  // Monta mapa: clienteId (ou 'GERAL') → documentos[]
  const docsPorCliente = useMemo(() => {
    const mapa = new Map<string, Documento[]>();
    for (const d of documentos) {
      const cid = resolveClienteId(d) ?? 'GERAL';
      if (!mapa.has(cid)) mapa.set(cid, []);
      mapa.get(cid)!.push(d);
    }
    return mapa;
  }, [documentos]);

  // Lista de clientes que têm documentos (ordenada por nome)
  const clientesComDocs = useMemo(() => {
    const ids = [...docsPorCliente.keys()].filter((k) => k !== 'GERAL');
    const lista = clientes.filter((c) => ids.includes(c.id));
    lista.sort((a, b) => (a.nomeFantasia || a.razaoSocial).localeCompare(b.nomeFantasia || b.razaoSocial));
    return lista;
  }, [clientes, docsPorCliente]);

  const temGeral = docsPorCliente.has('GERAL');

  // ── Documentos visíveis no painel direito ─────────────────────────────────
  const docsVisiveis = useMemo(() => {
    const base = clienteSelecionado === null
      ? (docsPorCliente.get('GERAL') ?? [])
      : (docsPorCliente.get(clienteSelecionado) ?? []);

    let lista = areaSelecionada === 'TODOS' ? base : base.filter((d) => d.tipo === areaSelecionada);

    if (busca) {
      const q = busca.toLowerCase();
      lista = lista.filter((d) =>
        d.nome.toLowerCase().includes(q) ||
        d.descricao?.toLowerCase().includes(q) ||
        (d as unknown as { arquivoNomeOriginal?: string }).arquivoNomeOriginal?.toLowerCase().includes(q),
      );
    }
    return lista;
  }, [documentos, clienteSelecionado, areaSelecionada, busca, docsPorCliente]);

  // Contagem por área dentro do cliente selecionado
  const contagemPorArea = useMemo(() => {
    const base = clienteSelecionado === null
      ? (docsPorCliente.get('GERAL') ?? [])
      : (docsPorCliente.get(clienteSelecionado) ?? []);
    const cnt: Record<string, number> = { TODOS: base.length };
    for (const d of base) {
      cnt[d.tipo] = (cnt[d.tipo] ?? 0) + 1;
    }
    return cnt;
  }, [documentos, clienteSelecionado, docsPorCliente]);

  // Projetos filtrados pelo cliente selecionado no form
  const projetosFiltrados = useMemo(() => {
    if (!form.clienteId) return projetos;
    return projetos.filter((p) => (p as unknown as { clienteId?: string }).clienteId === form.clienteId);
  }, [projetos, form.clienteId]);

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await http.post<{ url: string; originalName: string; mimeType: string; tamanho: number }>(
        '/documentos/upload',
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setForm((f) => ({
        ...f,
        arquivoUrl: res.data.url,
        arquivoNomeOriginal: res.data.originalName,
        arquivoMimeType: res.data.mimeType,
        arquivoTamanho: res.data.tamanho,
        nome: f.nome || res.data.originalName.replace(/\.[^/.]+$/, ''),
      }));
      setSuccess('Arquivo enviado. Preencha os metadados e salve.');
    } catch (err) {
      setError(getApiError(err, 'Falha no upload do arquivo.'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openNew() {
    setForm({
      ...initialForm,
      // pré-preenche cliente da pasta aberta
      clienteId: clienteSelecionado ?? '',
      tipo: areaSelecionada !== 'TODOS' ? areaSelecionada as TipoDocumento : 'OUTRO',
    });
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function openEdit(d: Documento) {
    setForm({
      nome: d.nome,
      tipo: d.tipo as TipoDocumento,
      descricao: d.descricao || '',
      clienteId: (d as unknown as { clienteId?: string }).clienteId || '',
      projetoId: d.projeto?.id || '',
      contratoId: d.contrato?.id || '',
      versao: d.versao || '',
      visivelCliente: d.visivelCliente,
      arquivoUrl: d.arquivoUrl || '',
      arquivoNomeOriginal: (d as unknown as { arquivoNomeOriginal?: string }).arquivoNomeOriginal || '',
      arquivoMimeType: (d as unknown as { arquivoMimeType?: string }).arquivoMimeType || '',
      arquivoTamanho: (d as unknown as { arquivoTamanho?: number }).arquivoTamanho || 0,
    });
    setEditingId(d.id);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving || uploading) return;
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.arquivoUrl && !editingId) {
      setError('Faça o upload de um arquivo antes de salvar.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nome: form.nome,
        tipo: form.tipo,
        descricao: form.descricao || undefined,
        clienteId: form.clienteId || undefined,
        projetoId: form.projetoId || undefined,
        contratoId: form.contratoId || undefined,
        versao: form.versao || undefined,
        visivelCliente: form.visivelCliente,
        arquivoUrl: form.arquivoUrl || undefined,
        arquivoNomeOriginal: form.arquivoNomeOriginal || undefined,
        arquivoMimeType: form.arquivoMimeType || undefined,
        arquivoTamanho: form.arquivoTamanho || undefined,
        status: 'APROVADO',
      };
      if (editingId) {
        await http.put(`/documentos/${editingId}`, payload);
        setSuccess('Documento atualizado.');
      } else {
        await http.post('/documentos', payload);
        setSuccess('Documento salvo no repositório.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao salvar documento.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d: Documento) {
    if (!confirm(`Excluir "${d.nome}" do repositório?`)) return;
    setError(null);
    try {
      await http.delete(`/documentos/${d.id}`);
      setSuccess('Documento excluído.');
      await loadData();
    } catch (err) {
      setError(getApiError(err, 'Falha ao excluir documento.'));
    }
  }

  // Nome de exibição do cliente selecionado
  const clienteAtual = clienteSelecionado
    ? clientes.find((c) => c.id === clienteSelecionado)
    : null;
  const nomeClienteAtual = clienteAtual
    ? (clienteAtual.nomeFantasia || clienteAtual.razaoSocial)
    : 'Documentos Gerais';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-stack">
      <PageHeader
        title="Repositório de documentos"
        subtitle="Arquivos organizados por cliente e área. Vincule a projetos, contratos ou mantenha como documentos gerais."
        chips={loading ? [] : [{ label: `${documentos.length} documento(s)` }]}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      {loading ? <LoadingBlock label="Carregando repositório..." /> : null}

      {!loading && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* ── Sidebar de clientes ───────────────────────────────────────── */}
          <div style={{
            width: 220,
            flexShrink: 0,
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--muted)',
            }}>
              Clientes
            </div>

            {clientesComDocs.length === 0 && !temGeral ? (
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>
                Nenhum documento ainda.
              </div>
            ) : null}

            {clientesComDocs.map((c) => {
              const count = (docsPorCliente.get(c.id) ?? []).length;
              const ativo = clienteSelecionado === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setClienteSelecionado(c.id); setAreaSelecionada('TODOS'); setBusca(''); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    border: 'none',
                    borderLeft: ativo ? '3px solid var(--primary)' : '3px solid transparent',
                    background: ativo ? 'rgba(var(--primary-rgb, 10,61,85), 0.07)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: ativo ? 'var(--primary)' : 'var(--text)', fontWeight: ativo ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📁 {c.nomeFantasia || c.razaoSocial}
                  </span>
                  <span style={{
                    fontSize: 11,
                    background: ativo ? 'var(--primary)' : 'var(--border)',
                    color: ativo ? '#fff' : 'var(--muted)',
                    borderRadius: 20,
                    padding: '1px 7px',
                    flexShrink: 0,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}

            {temGeral ? (
              <button
                type="button"
                onClick={() => { setClienteSelecionado(null); setAreaSelecionada('TODOS'); setBusca(''); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  border: 'none',
                  borderLeft: clienteSelecionado === null ? '3px solid var(--primary)' : '3px solid transparent',
                  borderTop: '1px solid var(--border)',
                  background: clienteSelecionado === null ? 'rgba(var(--primary-rgb, 10,61,85), 0.07)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, color: clienteSelecionado === null ? 'var(--primary)' : 'var(--muted)', fontWeight: clienteSelecionado === null ? 600 : 400 }}>
                  📂 Documentos Gerais
                </span>
                <span style={{
                  fontSize: 11,
                  background: clienteSelecionado === null ? 'var(--primary)' : 'var(--border)',
                  color: clienteSelecionado === null ? '#fff' : 'var(--muted)',
                  borderRadius: 20,
                  padding: '1px 7px',
                  flexShrink: 0,
                }}>
                  {(docsPorCliente.get('GERAL') ?? []).length}
                </span>
              </button>
            ) : null}
          </div>

          {/* ── Painel direito ─────────────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="panel">

              {/* Cabeçalho do painel com nome do cliente e botão */}
              <div className="panel__header panel__header--row panel__header--sticky">
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {nomeClienteAtual}
                  </div>
                  {clienteAtual?.razaoSocial && clienteAtual.nomeFantasia ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {clienteAtual.razaoSocial}
                    </div>
                  ) : null}
                </div>
                <button className="button button--ghost button--small" type="button" onClick={openNew}>
                  + Novo documento
                </button>
              </div>

              {/* Abas de área */}
              <div style={{
                display: 'flex',
                gap: 4,
                padding: '8px 16px',
                borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}>
                {AREAS.map((a) => {
                  const count = contagemPorArea[a.value] ?? 0;
                  if (a.value !== 'TODOS' && count === 0) return null;
                  const ativa = areaSelecionada === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAreaSelecionada(a.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: '1px solid',
                        borderColor: ativa ? 'var(--primary)' : 'var(--border)',
                        background: ativa ? 'var(--primary)' : 'transparent',
                        color: ativa ? '#fff' : 'var(--muted)',
                        fontSize: 12,
                        fontWeight: ativa ? 600 : 400,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{a.icon}</span>
                      <span>{a.label}</span>
                      {count > 0 ? <span style={{ opacity: 0.7 }}>({count})</span> : null}
                    </button>
                  );
                })}

                <input
                  placeholder="Buscar..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  style={{ marginLeft: 'auto', width: 160, fontSize: 12 }}
                />
              </div>

              {/* Estado vazio */}
              {docsVisiveis.length === 0 ? (
                <EmptyState message={
                  clienteSelecionado === null && !temGeral
                    ? 'Selecione um cliente na barra lateral ou faça upload do primeiro documento.'
                    : 'Nenhum documento nesta área. Clique em "+ Novo documento" para adicionar.'
                } />
              ) : null}

              {/* Tabela de documentos */}
              {docsVisiveis.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Arquivo</th>
                        <th>Área</th>
                        <th>Vínculo</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {docsVisiveis.map((d) => {
                        const mime = (d as unknown as { arquivoMimeType?: string }).arquivoMimeType;
                        const nomeOriginal = (d as unknown as { arquivoNomeOriginal?: string }).arquivoNomeOriginal;
                        const tamanho = (d as unknown as { arquivoTamanho?: number }).arquivoTamanho;
                        const area = AREAS.find((a) => a.value === d.tipo);
                        return (
                          <tr key={d.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 20 }}>{fileIcon(mime)}</span>
                                <div>
                                  <strong>{d.nome}</strong>
                                  {nomeOriginal && nomeOriginal !== d.nome ? (
                                    <div className="table-subline">{nomeOriginal} {tamanho ? `· ${formatBytes(tamanho)}` : ''}</div>
                                  ) : tamanho ? (
                                    <div className="table-subline">{formatBytes(tamanho)}</div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: 12 }}>{area?.icon} {area?.label ?? d.tipo}</span>
                            </td>
                            <td>
                              {d.projeto ? <span className="badge badge--info">{d.projeto.nome}</span> : null}
                              {d.contrato ? <span className="badge badge--muted">{d.contrato.titulo}</span> : null}
                              {!d.projeto && !d.contrato ? <span className="table-subline">Geral</span> : null}
                            </td>
                            <td>
                              <span className={`badge ${d.status === 'APROVADO' || d.status === 'ASSINADO' ? 'badge--success' : d.status === 'ARQUIVADO' || d.status === 'CANCELADO' ? 'badge--muted' : 'badge--accent'}`}>
                                {STATUS_LABELS[d.status] ?? d.status}
                              </span>
                            </td>
                            <td>{formatDate(d.createdAt)}</td>
                            <td>
                              <div className="table-actions-toolbar">
                                {d.arquivoUrl ? (
                                  <a href={d.arquivoUrl} target="_blank" rel="noopener noreferrer" className="button button--ghost button--small">
                                    Abrir
                                  </a>
                                ) : null}
                                <button className="button button--ghost button--small" type="button" onClick={() => openEdit(d)}>
                                  Editar
                                </button>
                                <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(d)}>
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de upload / edição ──────────────────────────────────────── */}
      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar documento' : 'Novo documento'}
        subtitle="Faça upload do arquivo, selecione o cliente e a área para organizar no repositório."
        onClose={closeModal}
      >
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>

          {/* Upload */}
          <div className="field field--span-2">
            <label>Arquivo</label>
            {form.arquivoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{fileIcon(form.arquivoMimeType)}</span>
                <div>
                  <strong>{form.arquivoNomeOriginal || 'Arquivo enviado'}</strong>
                  {form.arquivoTamanho ? <div className="table-subline">{formatBytes(form.arquivoTamanho)}</div> : null}
                </div>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => setForm((f) => ({ ...f, arquivoUrl: '', arquivoNomeOriginal: '', arquivoMimeType: '', arquivoTamanho: 0 }))}
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="doc-file-input"
                  style={{ display: 'none' }}
                  onChange={(e) => void handleUpload(e)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip"
                />
                <label
                  htmlFor="doc-file-input"
                  className="button button--ghost button--small file-upload-button"
                  style={{ cursor: uploading ? 'wait' : 'pointer' }}
                >
                  {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                </label>
                <div className="table-subline" style={{ marginTop: 4 }}>PDF, Word, Excel, imagens, ZIP — máx. 50 MB</div>
              </div>
            )}
          </div>

          {/* Nome */}
          <div className="field field--span-2">
            <label>Nome do documento</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          </div>

          {/* Tipo e Versão */}
          <div className="field">
            <label>Área / Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoDocumento }))}>
              {AREAS.filter((a) => a.value !== 'TODOS').map((a) => (
                <option key={a.value} value={a.value}>{a.icon} {a.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Versão</label>
            <input value={form.versao} onChange={(e) => setForm((f) => ({ ...f, versao: e.target.value }))} placeholder="v1.0" />
          </div>

          {/* Descrição */}
          <div className="field field--span-2">
            <label>Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>

          {/* Cliente */}
          <div className="field field--span-2">
            <label>Cliente</label>
            <select
              value={form.clienteId}
              onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value, projetoId: '', contratoId: '' }))}
            >
              <option value="">Sem cliente (documento geral)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
              ))}
            </select>
          </div>

          {/* Projeto */}
          <div className="field">
            <label>Vincular a projeto</label>
            <select value={form.projetoId} onChange={(e) => setForm((f) => ({ ...f, projetoId: e.target.value }))}>
              <option value="">Nenhum</option>
              {projetosFiltrados.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          {/* Visível para cliente */}
          <div className="field">
            <label className="checkbox-label" style={{ marginTop: 24 }}>
              <input type="checkbox" checked={form.visivelCliente} onChange={(e) => setForm((f) => ({ ...f, visivelCliente: e.target.checked }))} />
              Visível para o cliente
            </label>
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving || uploading}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar no repositório'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
