import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { http } from '../api/http';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import type {
  Cliente,
  HistoricoComentario,
  PrioridadeTarefa,
  StatusTarefa,
  Tarefa,
  TipoAtribuicaoTarefa,
  UsuarioResumo,
} from '../types/api';
import { formatDate, labelize, nomeAtribuido } from '../utils/format';

type TaskForm = {
  atribuicaoTipo: TipoAtribuicaoTarefa;
  responsavelUsuarioId: string;
  responsavelClienteId: string;
  titulo: string;
  descricao: string;
  anexoUrl: string;
  comentarioResumo: string;
  checklistHabilitado: boolean;
  checklistJson: Array<{ titulo: string; concluido: boolean }>;
  subtarefasJson: Array<{ titulo: string; concluida: boolean }>;
  prioridade: PrioridadeTarefa;
  prazo: string;
  status: StatusTarefa;
  visivelCliente: boolean;
};

const initialForm: TaskForm = {
  atribuicaoTipo: 'ANALISTA',
  responsavelUsuarioId: '',
  responsavelClienteId: '',
  titulo: '',
  descricao: '',
  anexoUrl: '',
  comentarioResumo: '',
  checklistHabilitado: false,
  checklistJson: [],
  subtarefasJson: [],
  prioridade: 'ALTA',
  prazo: '',
  status: 'NAO_INICIADA',
  visivelCliente: false,
};

export default function TaskDetailPage() {
  const { id, tarefaId } = useParams<{ id: string; tarefaId: string }>();
  const navigate = useNavigate();
  const [tarefa, setTarefa] = useState<Tarefa | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState<TaskForm>(initialForm);
  const [comentarioNovo, setComentarioNovo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isInterno = tarefa?.projeto?.interno ?? false;
  const comentarios = tarefa?.comentarios ?? [];

  async function loadData() {
    if (!tarefaId) return;
    setLoading(true);
    setError(null);
    try {
      const [tarefaResponse, usuariosResponse, clientesResponse] = await Promise.all([
        http.get<Tarefa>(`/tarefas/${tarefaId}`),
        http.get<UsuarioResumo[]>('/usuarios'),
        http.get<Cliente[]>('/clientes'),
      ]);
      const tarefaData = tarefaResponse.data;
      setTarefa(tarefaData);
      setUsuarios(usuariosResponse.data.filter((item) => item.ativo !== false));
      setClientes(clientesResponse.data);
      setForm({
        atribuicaoTipo: tarefaData.atribuicaoTipo,
        responsavelUsuarioId: tarefaData.responsavelUsuarioId || '',
        responsavelClienteId: tarefaData.responsavelClienteId || '',
        titulo: tarefaData.titulo,
        descricao: tarefaData.descricao || '',
        anexoUrl: tarefaData.anexoUrl || '',
        comentarioResumo: tarefaData.comentarioResumo || '',
        checklistHabilitado: tarefaData.checklistHabilitado,
        checklistJson: (tarefaData.checklistJson || []).map((item) => ({
          titulo: item.titulo || '',
          concluido: Boolean(item.concluido),
        })),
        subtarefasJson: (tarefaData.subtarefasJson || []).map((item) => ({
          titulo: item.titulo || '',
          concluida: Boolean(item.concluida),
        })),
        prioridade: tarefaData.prioridade,
        prazo: tarefaData.prazo?.slice(0, 10) || '',
        status: tarefaData.status,
        visivelCliente: tarefaData.visivelCliente,
      });
    } catch (err) {
      handleApiError(err, 'Falha ao carregar a tarefa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [tarefaId]);

  const atribuicaoLabel = useMemo(
    () => (form.atribuicaoTipo === 'ANALISTA' ? 'Analista responsável' : 'Cliente responsável'),
    [form.atribuicaoTipo],
  );

  function updateChecklist(index: number, patch: Partial<{ titulo: string; concluido: boolean }>) {
    setForm((current) => ({
      ...current,
      checklistJson: current.checklistJson.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateSubtarefa(index: number, patch: Partial<{ titulo: string; concluida: boolean }>) {
    setForm((current) => ({
      ...current,
      subtarefasJson: current.subtarefasJson.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tarefaId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await http.put(`/tarefas/${tarefaId}`, {
        projetoId: id,
        atribuicaoTipo: form.atribuicaoTipo,
        responsavelUsuarioId:
          form.atribuicaoTipo === 'ANALISTA' ? form.responsavelUsuarioId || undefined : undefined,
        responsavelClienteId:
          form.atribuicaoTipo === 'CLIENTE' ? form.responsavelClienteId || undefined : undefined,
        titulo: form.titulo,
        descricao: form.descricao || undefined,
        anexoUrl: form.anexoUrl || undefined,
        comentarioResumo: form.comentarioResumo || undefined,
        checklistHabilitado: form.checklistHabilitado,
        checklistJson: form.checklistHabilitado ? form.checklistJson.filter((item) => item.titulo.trim()) : [],
        subtarefasJson: form.subtarefasJson.filter((item) => item.titulo.trim()),
        prioridade: form.prioridade,
        prazo: form.prazo || undefined,
        status: form.status,
        visivelCliente: isInterno ? false : form.visivelCliente,
      });
      setSuccess('Tarefa atualizada com sucesso.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao salvar a tarefa.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tarefaId || !comentarioNovo.trim()) return;
    setCommenting(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post(`/tarefas/${tarefaId}/comentarios`, { mensagem: comentarioNovo.trim() });
      setComentarioNovo('');
      setSuccess('Comentário registrado com sucesso.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao registrar comentário.');
    } finally {
      setCommenting(false);
    }
  }

  async function handleDelete() {
    if (!tarefaId) return;
    const confirmed = window.confirm('Excluir esta tarefa?');
    if (!confirmed) return;
    try {
      await http.delete(`/tarefas/${tarefaId}`);
      navigate(`/projetos/${id}`);
    } catch (err) {
      handleApiError(err, 'Falha ao excluir a tarefa.');
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

  if (loading) return <LoadingBlock label="Carregando tarefa..." />;
  if (!tarefa) return <Feedback type="error" message="Tarefa não encontrada." />;

  return (
    <div className="page-stack compact-gap">
      <PageHeader
        title={tarefa.titulo}
        subtitle={`Responsável atual: ${nomeAtribuido(tarefa)} · Status ${labelize(tarefa.status)}.`}
        actions={
          <div className="header-tools">
            <Link className="button button--ghost button--small" to={`/projetos/${id}`}>
              Voltar ao projeto
            </Link>
            <button className="button button--danger button--small" type="button" onClick={() => void handleDelete()}>
              Excluir tarefa
            </button>
          </div>
        }
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="project-summary-grid compact-grid">
        <div className="stat-card"><span className="stat-card__label">Projeto</span><strong className="stat-card__value">{tarefa.projeto?.nome || '—'}</strong></div>
        <div className="stat-card"><span className="stat-card__label">Status</span><strong className="stat-card__value">{labelize(tarefa.status)}</strong></div>
        <div className="stat-card"><span className="stat-card__label">Prioridade</span><strong className="stat-card__value">{labelize(tarefa.prioridade)}</strong></div>
        <div className="stat-card"><span className="stat-card__label">Prazo</span><strong className="stat-card__value">{formatDate(tarefa.prazo)}</strong></div>
      </section>

      <section className="two-columns two-columns--left-wide compact-layout">
        <form className="panel form-grid form-grid--wide compact-form" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>Detalhe da tarefa</h3>
            <p>Edite a execução, subtarefas, checklist e parâmetros da tarefa.</p>
          </div>

          <div className="field">
            <label>Atribuição</label>
            <select value={form.atribuicaoTipo} onChange={(e) => setForm((c) => ({ ...c, atribuicaoTipo: e.target.value as TipoAtribuicaoTarefa }))}>
              <option value="ANALISTA">Analista</option>
              <option value="CLIENTE" disabled={isInterno}>Cliente</option>
            </select>
          </div>
          <div className="field">
            <label>{atribuicaoLabel}</label>
            {form.atribuicaoTipo === 'ANALISTA' ? (
              <select value={form.responsavelUsuarioId} onChange={(e) => setForm((c) => ({ ...c, responsavelUsuarioId: e.target.value }))}>
                <option value="">Não atribuído</option>
                {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
              </select>
            ) : (
              <select value={form.responsavelClienteId} onChange={(e) => setForm((c) => ({ ...c, responsavelClienteId: e.target.value }))} disabled={isInterno}>
                <option value="">Não atribuído</option>
                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.razaoSocial}</option>)}
              </select>
            )}
          </div>

          <div className="field field--span-2">
            <label>Nome da tarefa</label>
            <input value={form.titulo} onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))} required />
          </div>
          <div className="field field--span-2">
            <label>Descrição</label>
            <textarea rows={3} value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} />
          </div>
          <div className="field field--span-2">
            <label>Resumo operacional</label>
            <textarea rows={2} value={form.comentarioResumo} onChange={(e) => setForm((c) => ({ ...c, comentarioResumo: e.target.value }))} />
          </div>
          <div className="field field--span-2">
            <label>Anexo (URL)</label>
            <input value={form.anexoUrl} onChange={(e) => setForm((c) => ({ ...c, anexoUrl: e.target.value }))} placeholder="https://..." />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as StatusTarefa }))}>
              <option value="NAO_INICIADA">Não iniciada</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="AGUARDANDO">Aguardando</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div className="field">
            <label>Prioridade</label>
            <select value={form.prioridade} onChange={(e) => setForm((c) => ({ ...c, prioridade: e.target.value as PrioridadeTarefa }))}>
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>
          <div className="field">
            <label>Prazo</label>
            <input type="date" value={form.prazo} onChange={(e) => setForm((c) => ({ ...c, prazo: e.target.value }))} />
          </div>
          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={isInterno ? false : form.visivelCliente} disabled={isInterno} onChange={(e) => setForm((c) => ({ ...c, visivelCliente: e.target.checked }))} />
              Visível para cliente
            </label>
          </div>

          <div className="field field--checkbox field--span-2">
            <label>
              <input type="checkbox" checked={form.checklistHabilitado} onChange={(e) => setForm((c) => ({ ...c, checklistHabilitado: e.target.checked }))} />
              Habilitar checklist desta tarefa
            </label>
          </div>

          {form.checklistHabilitado ? (
            <div className="field field--span-2">
              <label>Checklist</label>
              <div className="checklist-box compact-checklist">
                {form.checklistJson.length === 0 ? <small>Nenhum item no checklist ainda.</small> : null}
                {form.checklistJson.map((item, index) => (
                  <div className="checklist-row" key={`${index}-${item.titulo}`}>
                    <input type="checkbox" checked={item.concluido} onChange={(e) => updateChecklist(index, { concluido: e.target.checked })} />
                    <input value={item.titulo} onChange={(e) => updateChecklist(index, { titulo: e.target.value })} placeholder="Item do checklist" />
                    <button className="button button--ghost button--small" type="button" onClick={() => setForm((c) => ({ ...c, checklistJson: c.checklistJson.filter((_, i) => i !== index) }))}>Remover</button>
                  </div>
                ))}
                <button className="button button--ghost button--small" type="button" onClick={() => setForm((c) => ({ ...c, checklistJson: [...c.checklistJson, { titulo: '', concluido: false }] }))}>
                  Adicionar item
                </button>
              </div>
            </div>
          ) : null}

          <div className="field field--span-2">
            <label>Subtarefas</label>
            <div className="checklist-box compact-checklist">
              {form.subtarefasJson.length === 0 ? <small>Nenhuma subtarefa ainda.</small> : null}
              {form.subtarefasJson.map((item, index) => (
                <div className="checklist-row" key={`${index}-${item.titulo}`}>
                  <input type="checkbox" checked={item.concluida} onChange={(e) => updateSubtarefa(index, { concluida: e.target.checked })} />
                  <input value={item.titulo} onChange={(e) => updateSubtarefa(index, { titulo: e.target.value })} placeholder="Subtarefa" />
                  <button className="button button--ghost button--small" type="button" onClick={() => setForm((c) => ({ ...c, subtarefasJson: c.subtarefasJson.filter((_, i) => i !== index) }))}>Remover</button>
                </div>
              ))}
              <button className="button button--ghost button--small" type="button" onClick={() => setForm((c) => ({ ...c, subtarefasJson: [...c.subtarefasJson, { titulo: '', concluida: false }] }))}>
                Adicionar subtarefa
              </button>
            </div>
          </div>

          <button className="button button--small" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar tarefa'}
          </button>
        </form>

        <div className="panel panel--compact">
          <div className="panel__header">
            <h3>Histórico de comentários</h3>
            <p>Registro sequencial das interações e decisões da tarefa.</p>
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
            <textarea rows={4} value={comentarioNovo} onChange={(e) => setComentarioNovo(e.target.value)} placeholder="Registre aqui a próxima ação, decisão ou observação relevante." />
            <button className="button button--small" type="submit" disabled={commenting || !comentarioNovo.trim()}>
              {commenting ? 'Salvando...' : 'Adicionar comentário'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
