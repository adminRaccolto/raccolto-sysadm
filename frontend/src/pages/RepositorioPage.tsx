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

const TIPOS: { value: TipoDocumento; label: string }[] = [
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'RELATORIO_CONSULTORIA', label: 'Rel. Consultoria' },
  { value: 'RELATORIO_DESLOCAMENTO', label: 'Rel. Deslocamento' },
  { value: 'REEMBOLSO', label: 'Reembolso' },
  { value: 'TERMO_ENTREGA', label: 'Termo de Entrega' },
  { value: 'APROVACAO', label: 'Aprovação' },
  { value: 'ENTREGAVEL', label: 'Entregável' },
  { value: 'OUTRO', label: 'Outro' },
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

const initialForm = {
  nome: '',
  tipo: 'OUTRO' as TipoDocumento,
  descricao: '',
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
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroProjeto, setFiltroProjeto] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [busca, setBusca] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filtered = useMemo(() => {
    let list = documentos;
    if (filtroTipo) list = list.filter((d) => d.tipo === filtroTipo);
    if (filtroProjeto) list = list.filter((d) => d.projeto?.id === filtroProjeto);
    if (filtroCliente) {
      list = list.filter((d) =>
        (d.projeto as unknown as { clienteId?: string } | undefined)?.clienteId === filtroCliente ||
        (d.contrato as unknown as { clienteId?: string } | undefined)?.clienteId === filtroCliente,
      );
    }
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter((d) =>
        d.nome.toLowerCase().includes(q) ||
        d.descricao?.toLowerCase().includes(q) ||
        (d as unknown as { arquivoNomeOriginal?: string }).arquivoNomeOriginal?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [documentos, filtroTipo, filtroProjeto, filtroCliente, busca]);

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

  function openNew() {
    setForm(initialForm);
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

  return (
    <div className="page-stack">
      <PageHeader
        title="Repositório de documentos"
        subtitle="Armazenamento centralizado de arquivos da empresa no R2. Vincule a projetos, contratos ou mantenha como documentos gerais."
        chips={loading ? [] : [
          { label: `${documentos.length} documento(s)` },
        ]}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <input
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ minWidth: 180 }}
            />
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ minWidth: 160 }}>
              <option value="">Todos os tipos</option>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filtroProjeto} onChange={(e) => setFiltroProjeto(e.target.value)} style={{ minWidth: 160 }}>
              <option value="">Todos os projetos</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} style={{ minWidth: 160 }}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.razaoSocial}</option>)}
            </select>
          </div>
          <button className="button button--ghost button--small" type="button" onClick={openNew}>
            + Novo documento
          </button>
        </div>

        {loading ? <LoadingBlock label="Carregando repositório..." /> : null}

        {!loading && filtered.length === 0 ? (
          <EmptyState message="Nenhum documento encontrado. Faça upload do primeiro arquivo." />
        ) : null}

        {!loading && filtered.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Tipo</th>
                  <th>Vínculo</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const mime = (d as unknown as { arquivoMimeType?: string }).arquivoMimeType;
                  const nomeOriginal = (d as unknown as { arquivoNomeOriginal?: string }).arquivoNomeOriginal;
                  const tamanho = (d as unknown as { arquivoTamanho?: number }).arquivoTamanho;
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
                      <td>{TIPOS.find((t) => t.value === d.tipo)?.label ?? d.tipo}</td>
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
                            <a
                              href={d.arquivoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="button button--ghost button--small"
                            >
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
      </section>

      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar documento' : 'Novo documento'}
        subtitle="Faça upload do arquivo e preencha os metadados para organizar o repositório."
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
                  onClick={() => { setForm((f) => ({ ...f, arquivoUrl: '', arquivoNomeOriginal: '', arquivoMimeType: '', arquivoTamanho: 0 })); }}
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

          <div className="field field--span-2">
            <label>Nome do documento</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          </div>

          <div className="field">
            <label>Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoDocumento }))}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Versão</label>
            <input value={form.versao} onChange={(e) => setForm((f) => ({ ...f, versao: e.target.value }))} placeholder="v1.0" />
          </div>

          <div className="field field--span-2">
            <label>Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>

          <div className="field">
            <label>Vincular a projeto</label>
            <select value={form.projetoId} onChange={(e) => setForm((f) => ({ ...f, projetoId: e.target.value }))}>
              <option value="">Nenhum (documento geral)</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
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
