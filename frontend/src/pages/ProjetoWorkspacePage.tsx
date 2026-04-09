import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import type {
  Cliente,
  Documento,
  Entregavel,
  PrioridadeTarefa,
  Projeto,
  StatusDocumento,
  StatusEntregavel,
  StatusTarefa,
  Tarefa,
  TipoAtribuicaoTarefa,
  TipoDocumento,
  TipoEntregavel,
  UsuarioResumo,
} from '../types/api';
import { formatDate, labelize, nomeAtribuido } from '../utils/format';

type ProjetoDetalhado = Projeto & {
  tarefas: Tarefa[];
  entregaveis: Entregavel[];
  documentos: Documento[];
};

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

type EntregavelForm = {
  id?: string;
  titulo: string;
  tipo: TipoEntregavel;
  descricao: string;
  dataPrevista: string;
  status: StatusEntregavel;
  visivelCliente: boolean;
  observacaoInterna: string;
  observacaoCliente: string;
  anexoUrl: string;
  comentarioResumo: string;
};

type DocumentoForm = {
  id?: string;
  nome: string;
  tipo: TipoDocumento;
  descricao: string;
  arquivoUrl: string;
  versao: string;
  status: StatusDocumento;
  exigeAssinatura: boolean;
  exigeAprovacao: boolean;
  visivelCliente: boolean;
  observacaoInterna: string;
  observacaoCliente: string;
};

const taskInitialForm: TaskForm = {
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

const entregavelInitialForm: EntregavelForm = {
  titulo: '',
  tipo: 'RELATORIO',
  descricao: '',
  dataPrevista: '',
  status: 'PLANEJADO',
  visivelCliente: true,
  observacaoInterna: '',
  observacaoCliente: '',
  anexoUrl: '',
  comentarioResumo: '',
};

const documentoInitialForm: DocumentoForm = {
  nome: '',
  tipo: 'OUTRO',
  descricao: '',
  arquivoUrl: '',
  versao: '',
  status: 'RASCUNHO',
  exigeAssinatura: false,
  exigeAprovacao: false,
  visivelCliente: false,
  observacaoInterna: '',
  observacaoCliente: '',
};

const kanbanOrder: StatusTarefa[] = ['NAO_INICIADA', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDA', 'CANCELADA'];

export default function ProjetoWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<ProjetoDetalhado | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [taskForm, setTaskForm] = useState<TaskForm>(taskInitialForm);
  const [entregavelForm, setEntregavelForm] = useState<EntregavelForm>(entregavelInitialForm);
  const [documentoForm, setDocumentoForm] = useState<DocumentoForm>(documentoInitialForm);
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [savingEntregavel, setSavingEntregavel] = useState(false);
  const [savingDocumento, setSavingDocumento] = useState(false);
  const [arquivoDocumentoLocal, setArquivoDocumentoLocal] = useState<File | null>(null);
  const [uploadingDocumentoLocal, setUploadingDocumentoLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'tarefas' | 'entregaveis' | 'documentos'>('resumo');
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroAtribuidoA, setFiltroAtribuidoA] = useState('');
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [showEntregavelDrawer, setShowEntregavelDrawer] = useState(false);
  const [showDocumentoDrawer, setShowDocumentoDrawer] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [projetoResponse, usuariosResponse, clientesResponse] = await Promise.all([
        http.get<ProjetoDetalhado>(`/projetos/${id}`),
        http.get<UsuarioResumo[]>('/usuarios'),
        http.get<Cliente[]>('/clientes'),
      ]);
      setProjeto(projetoResponse.data);
      setUsuarios(usuariosResponse.data.filter((item) => item.ativo !== false));
      setClientes(clientesResponse.data);
    } catch (err) {
      handleApiError(err, 'Falha ao carregar o projeto.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [id]);

  const atribuidos = useMemo(
    () => [
      ...usuarios.map((item) => ({ id: item.id, nome: item.nome })),
      ...clientes.map((item) => ({ id: item.id, nome: item.razaoSocial })),
    ],
    [usuarios, clientes],
  );

  const tarefasFiltradas = useMemo(() => {
    const all = projeto?.tarefas ?? [];
    return all.filter((item) => {
      if (filtroStatus && item.status !== filtroStatus) return false;
      if (filtroAtribuidoA && item.responsavelUsuarioId !== filtroAtribuidoA && item.responsavelClienteId !== filtroAtribuidoA) {
        return false;
      }
      return true;
    });
  }, [projeto, filtroStatus, filtroAtribuidoA]);

  const tarefasPorStatus = useMemo(
    () => kanbanOrder.map((status) => ({ status, items: tarefasFiltradas.filter((item) => item.status === status) })),
    [tarefasFiltradas],
  );

  function resetTaskForm() {
    setTaskForm({ ...taskInitialForm, visivelCliente: projeto?.interno ? false : false });
  }

  function resetEntregavelForm() {
    setEntregavelForm({ ...entregavelInitialForm, visivelCliente: projeto?.interno ? false : true });
  }

  function resetDocumentoForm() {
    setDocumentoForm({ ...documentoInitialForm, visivelCliente: projeto?.interno ? false : false });
    setArquivoDocumentoLocal(null);
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setSavingTask(true);
    setError(null);
    setSuccess(null);

    try {
      await http.post('/tarefas', {
        projetoId: id,
        atribuicaoTipo: taskForm.atribuicaoTipo,
        responsavelUsuarioId: taskForm.atribuicaoTipo === 'ANALISTA' ? taskForm.responsavelUsuarioId || undefined : undefined,
        responsavelClienteId: taskForm.atribuicaoTipo === 'CLIENTE' ? taskForm.responsavelClienteId || undefined : undefined,
        titulo: taskForm.titulo,
        descricao: taskForm.descricao || undefined,
        anexoUrl: taskForm.anexoUrl || undefined,
        comentarioResumo: taskForm.comentarioResumo || undefined,
        checklistHabilitado: taskForm.checklistHabilitado,
        checklistJson: taskForm.checklistHabilitado ? taskForm.checklistJson.filter((item) => item.titulo.trim()) : [],
        subtarefasJson: taskForm.subtarefasJson.filter((item) => item.titulo.trim()),
        prioridade: taskForm.prioridade,
        prazo: taskForm.prazo || undefined,
        status: taskForm.status,
        visivelCliente: projeto?.interno ? false : taskForm.visivelCliente,
      });
      setSuccess('Tarefa criada dentro do projeto com sucesso.');
      resetTaskForm();
      setShowTaskDrawer(false);
      setActiveTab('tarefas');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao cadastrar tarefa.');
    } finally {
      setSavingTask(false);
    }
  }

  async function handleEntregavelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setSavingEntregavel(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        projetoId: id,
        titulo: entregavelForm.titulo,
        tipo: entregavelForm.tipo,
        descricao: entregavelForm.descricao || undefined,
        dataPrevista: entregavelForm.dataPrevista || undefined,
        status: entregavelForm.status,
        visivelCliente: projeto?.interno ? false : entregavelForm.visivelCliente,
        observacaoInterna: entregavelForm.observacaoInterna || undefined,
        observacaoCliente: entregavelForm.observacaoCliente || undefined,
        anexoUrl: entregavelForm.anexoUrl || undefined,
        comentarioResumo: entregavelForm.comentarioResumo || undefined,
      };
      if (entregavelForm.id) {
        await http.put(`/entregaveis/${entregavelForm.id}`, payload);
        setSuccess('Entregável atualizado com sucesso.');
      } else {
        await http.post('/entregaveis', payload);
        setSuccess('Entregável registrado com sucesso.');
      }
      resetEntregavelForm();
      setShowEntregavelDrawer(false);
      setActiveTab('entregaveis');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao salvar entregável.');
    } finally {
      setSavingEntregavel(false);
    }
  }

  async function handleDocumentoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setSavingDocumento(true);
    setError(null);
    setSuccess(null);
    try {
      let arquivoUrl = documentoForm.arquivoUrl || undefined;

      if (arquivoDocumentoLocal) {
        setUploadingDocumentoLocal(true);
        const formData = new FormData();
        formData.append('file', arquivoDocumentoLocal);
        const uploadResponse = await http.post<{ url: string; originalName: string }>('/documentos/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        arquivoUrl = uploadResponse.data.url;
      }

      const payload = {
        projetoId: id,
        nome: documentoForm.nome,
        tipo: documentoForm.tipo,
        descricao: documentoForm.descricao || undefined,
        arquivoUrl,
        versao: documentoForm.versao || undefined,
        status: documentoForm.status,
        exigeAssinatura: documentoForm.exigeAssinatura,
        exigeAprovacao: documentoForm.exigeAprovacao,
        visivelCliente: projeto?.interno ? false : documentoForm.visivelCliente,
        observacaoInterna: documentoForm.observacaoInterna || undefined,
        observacaoCliente: documentoForm.observacaoCliente || undefined,
      };
      if (documentoForm.id) {
        await http.put(`/documentos/${documentoForm.id}`, payload);
        setSuccess('Documento atualizado com sucesso.');
      } else {
        await http.post('/documentos', payload);
        setSuccess('Documento registrado com sucesso.');
      }
      resetDocumentoForm();
      setShowDocumentoDrawer(false);
      setActiveTab('documentos');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao salvar documento.');
    } finally {
      setUploadingDocumentoLocal(false);
      setSavingDocumento(false);
    }
  }

  function startEditEntregavel(item: Entregavel) {
    setEntregavelForm({
      id: item.id,
      titulo: item.titulo,
      tipo: item.tipo,
      descricao: item.descricao || '',
      dataPrevista: item.dataPrevista ? item.dataPrevista.slice(0, 10) : '',
      status: item.status,
      visivelCliente: item.visivelCliente,
      observacaoInterna: item.observacaoInterna || '',
      observacaoCliente: item.observacaoCliente || '',
      anexoUrl: item.anexoUrl || '',
      comentarioResumo: item.comentarioResumo || '',
    });
    setShowEntregavelDrawer(true);
  }

  function startEditDocumento(item: Documento) {
    setDocumentoForm({
      id: item.id,
      nome: item.nome,
      tipo: item.tipo,
      descricao: item.descricao || '',
      arquivoUrl: item.arquivoUrl || '',
      versao: item.versao || '',
      status: item.status,
      exigeAssinatura: item.exigeAssinatura,
      exigeAprovacao: item.exigeAprovacao,
      visivelCliente: item.visivelCliente,
      observacaoInterna: item.observacaoInterna || '',
      observacaoCliente: item.observacaoCliente || '',
    });
    setArquivoDocumentoLocal(null);
    setShowDocumentoDrawer(true);
  }


  async function handleMoveTask(item: Tarefa, status: StatusTarefa) {
    if (!id || item.status === status) return;
    try {
      await http.put(`/tarefas/${item.id}`, {
        projetoId: id,
        atribuicaoTipo: item.atribuicaoTipo,
        responsavelUsuarioId: item.responsavelUsuarioId || undefined,
        responsavelClienteId: item.responsavelClienteId || undefined,
        titulo: item.titulo,
        descricao: item.descricao || undefined,
        anexoUrl: item.anexoUrl || undefined,
        comentarioResumo: item.comentarioResumo || undefined,
        checklistHabilitado: item.checklistHabilitado,
        checklistJson: item.checklistJson || [],
        subtarefasJson: item.subtarefasJson || [],
        prioridade: item.prioridade,
        prazo: item.prazo ? item.prazo.slice(0, 10) : undefined,
        status,
        visivelCliente: item.visivelCliente,
      });
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao mover a tarefa.');
    }
  }

  async function handleDeleteTask(item: Tarefa) {
    const confirmed = window.confirm(`Excluir a tarefa "${item.titulo}"?`);
    if (!confirmed) return;
    try {
      await http.delete(`/tarefas/${item.id}`);
      setSuccess('Tarefa excluída com sucesso.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir tarefa.');
    }
  }

  async function handleDeleteEntregavel(item: Entregavel) {
    const confirmed = window.confirm(`Excluir o entregável "${item.titulo}"?`);
    if (!confirmed) return;
    try {
      await http.delete(`/entregaveis/${item.id}`);
      setSuccess('Entregável excluído com sucesso.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir entregável.');
    }
  }

  async function handleDeleteDocumento(item: Documento) {
    const confirmed = window.confirm(`Excluir o documento "${item.nome}"?`);
    if (!confirmed) return;
    try {
      await http.delete(`/documentos/${item.id}`);
      setSuccess('Documento excluído com sucesso.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir documento.');
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

  if (loading) return <LoadingBlock label="Carregando projeto..." />;
  if (!projeto) return <Feedback type="error" message="Projeto não encontrado." />;

  return (
    <div className="page-stack">
      <PageHeader
        title={projeto.nome}
        subtitle={`${projeto.interno ? 'Projeto interno' : projeto.cliente?.razaoSocial || 'Projeto'} · ${labelize(projeto.status)}`}
        actions={<Link className="button button--ghost" to="/projetos">Voltar aos projetos</Link>}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="hero-panel compact-gap">
        <div>
          <div className="eyebrow">Workspace do Projeto</div>
          <h3>{projeto.nome}</h3>
          <p>{projeto.descricao || 'Sem descrição cadastrada para este projeto.'}</p>
        </div>
        <div className="hero-panel__aside">
          <span>Contexto operacional</span>
          <ul>
            <li><strong>Cliente:</strong> {projeto.interno ? 'Projeto interno Raccolto' : projeto.cliente?.razaoSocial || '—'}</li>
            <li><strong>Status:</strong> {labelize(projeto.status)}</li>
            <li><strong>Prazo previsto:</strong> {formatDate(projeto.dataInicio)} até {formatDate(projeto.dataFimPrevista)}</li>
          </ul>
        </div>
      </section>

      <div className="project-summary-grid">
        <div className="stat-card"><span className="stat-card__label">Tarefas a iniciar</span><strong className="stat-card__value">{projeto.painel?.tarefasAIniciar ?? 0}</strong></div>
        <div className="stat-card"><span className="stat-card__label">Tarefas atrasadas</span><strong className="stat-card__value">{projeto.painel?.tarefasAtrasadas ?? 0}</strong></div>
        <div className="stat-card"><span className="stat-card__label">% concluída</span><strong className="stat-card__value">{projeto.painel?.percentualConclusao ?? 0}%</strong></div>
        <div className="stat-card"><span className="stat-card__label">Entregáveis</span><strong className="stat-card__value">{projeto.entregaveis.length}</strong></div>
        <div className="stat-card"><span className="stat-card__label">Documentos</span><strong className="stat-card__value">{projeto.documentos.length}</strong></div>
      </div>

      <div className="segmented segmented--tabs">
        {(['resumo', 'tarefas', 'entregaveis', 'documentos'] as const).map((tab) => (
          <button key={tab} type="button" className={`segmented__button${activeTab === tab ? ' segmented__button--active' : ''}`} onClick={() => setActiveTab(tab)}>
            {labelize(tab)}
          </button>
        ))}
      </div>

      {activeTab === 'resumo' ? (
        <section className="two-columns two-columns--left-wide">
          <div className="panel compact-gap">
            <div className="panel__header"><h3>Resumo executivo</h3><p>Visão rápida dos principais sinais do projeto.</p></div>
            <div className="table-wrap"><table><tbody>
              <tr><th>Cliente</th><td>{projeto.interno ? 'Projeto interno Raccolto' : projeto.cliente?.razaoSocial || '—'}</td></tr>
              <tr><th>Visível para cliente</th><td>{projeto.visivelCliente ? 'Sim' : 'Não'}</td></tr>
              <tr><th>Prioridade</th><td>{labelize(projeto.prioridade)}</td></tr>
              <tr><th>Andamento consolidado</th><td>{projeto.painel?.percentualConclusao ?? projeto.percentualAndamento ?? 0}%</td></tr>
            </tbody></table></div>
          </div>
          <div className="panel compact-gap">
            <div className="panel__header"><h3>Próximos passos sugeridos</h3><p>Feche o fluxo operacional do projeto usando tarefas, entregáveis e documentos.</p></div>
            <ul className="timeline-list">
              <li><span>1. Criar tarefas dentro do projeto</span><small>Elas já nascem no contexto correto, sem vínculo manual solto.</small></li>
              <li><span>2. Registrar entregáveis</span><small>Controle o que será efetivamente entregue ao cliente.</small></li>
              <li><span>3. Organizar documentos</span><small>Centralize contratos, relatórios, aprovações e anexos formais.</small></li>
            </ul>
          </div>
        </section>
      ) : null}

      {activeTab === 'tarefas' ? (
        <section className="workspace-full">
          <div className="panel workspace-panel">
            <div className="panel__header panel__header--row">
              <div><h3>Tarefas do projeto</h3><p>Lista ou kanban em tela cheia, com botão lateral para nova tarefa.</p></div>
              <div className="header-tools">
                <div className="segmented">
                  <button type="button" className={`segmented__button${viewMode === 'lista' ? ' segmented__button--active' : ''}`} onClick={() => setViewMode('lista')}>Lista</button>
                  <button type="button" className={`segmented__button${viewMode === 'kanban' ? ' segmented__button--active' : ''}`} onClick={() => setViewMode('kanban')}>Kanban</button>
                </div>
                <button className="button" type="button" onClick={() => setShowTaskDrawer(true)}>Nova tarefa</button>
              </div>
            </div>

            <div className="filter-bar">
              <div className="field"><label>Status</label><select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}><option value="">Todos</option>{kanbanOrder.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select></div>
              <div className="field"><label>Atribuído a</label><select value={filtroAtribuidoA} onChange={(e) => setFiltroAtribuidoA(e.target.value)}><option value="">Todos</option>{atribuidos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
            </div>

            {tarefasFiltradas.length === 0 ? <EmptyState message="Ainda não há tarefas neste projeto com os filtros escolhidos." /> : null}
            {tarefasFiltradas.length > 0 && viewMode === 'lista' ? (
              <div className="table-wrap table-wrap--full"><table><thead><tr><th>Tarefa</th><th>Atribuído a</th><th>Status</th><th>Prazo</th><th>Ações</th></tr></thead><tbody>
                {tarefasFiltradas.map((item) => (
                  <tr key={item.id} onDoubleClick={() => navigate(`/projetos/${id}/tarefas/${item.id}`)}><td><strong>{item.titulo}</strong><div className="table-subline">{item.descricao || 'Sem descrição'}</div></td><td>{nomeAtribuido(item)}</td><td><span className={`status-pill status-pill--${item.status.toLowerCase()}`}>{labelize(item.status)}</span></td><td>{formatDate(item.prazo)}</td><td><div className="table-actions"><Link className="button button--ghost button--small" to={`/projetos/${id}/tarefas/${item.id}`}>Abrir</Link><button className="button button--danger button--small" type="button" onClick={() => void handleDeleteTask(item)}>Excluir</button></div></td></tr>
                ))}
              </tbody></table></div>
            ) : null}
            {tarefasFiltradas.length > 0 && viewMode === 'kanban' ? (
              <div className="kanban-board kanban-board--wide">
                {tarefasPorStatus.map((column) => (
                  <section className="kanban-column" key={column.status} onDragOver={(event) => event.preventDefault()} onDrop={async () => { const moving = tarefasFiltradas.find((task) => task.id === draggingTaskId); if (moving) await handleMoveTask(moving, column.status); setDraggingTaskId(null); }}>
                    <div className="kanban-column__header"><h4>{labelize(column.status)}</h4><span>{column.items.length}</span></div>
                    <div className="kanban-column__body">
                      {column.items.length === 0 ? <div className="kanban-empty">Nenhuma tarefa neste status.</div> : null}
                      {column.items.map((item) => (
                        <article className="kanban-card" key={item.id} draggable onDragStart={() => setDraggingTaskId(item.id)} onDoubleClick={() => navigate(`/projetos/${id}/tarefas/${item.id}`)}>
                          <div className="kanban-card__top"><strong>{item.titulo}</strong><span className={`status-pill status-pill--${item.status.toLowerCase()}`}>{labelize(item.status)}</span></div>
                          <p>{item.descricao || 'Sem descrição.'}</p>
                          <div className="kanban-card__meta"><span>Responsável: {nomeAtribuido(item)}</span><span>Prazo: {formatDate(item.prazo)}</span></div>
                          <div className="table-actions"><Link className="button button--ghost button--small" to={`/projetos/${id}/tarefas/${item.id}`}>Abrir</Link><button className="button button--danger button--small" type="button" onClick={() => void handleDeleteTask(item)}>Excluir</button></div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>

          {showTaskDrawer ? (
            <aside className="side-drawer">
              <form className="panel form-grid form-grid--wide" onSubmit={handleTaskSubmit}>
                <div className="panel__header panel__header--row"><div><h3>Nova tarefa</h3><p>Crie a tarefa sem sair do fluxo do projeto.</p></div><button className="button button--ghost button--small" type="button" onClick={() => { setShowTaskDrawer(false); resetTaskForm(); }}>Fechar</button></div>
                <div className="field"><label>Atribuição</label><select value={taskForm.atribuicaoTipo} onChange={(e) => setTaskForm((current) => ({ ...current, atribuicaoTipo: e.target.value as TipoAtribuicaoTarefa }))}><option value="ANALISTA">Analista</option><option value="CLIENTE" disabled={projeto.interno}>Cliente</option></select></div>
                <div className="field"><label>{taskForm.atribuicaoTipo === 'ANALISTA' ? 'Analista responsável' : 'Cliente responsável'}</label>{taskForm.atribuicaoTipo === 'ANALISTA' ? <select value={taskForm.responsavelUsuarioId} onChange={(e) => setTaskForm((current) => ({ ...current, responsavelUsuarioId: e.target.value }))}><option value="">Não atribuído</option>{usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}</select> : <select value={taskForm.responsavelClienteId} onChange={(e) => setTaskForm((current) => ({ ...current, responsavelClienteId: e.target.value }))} disabled={projeto.interno}><option value="">Não atribuído</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.razaoSocial}</option>)}</select>}</div>
                <div className="field field--span-2"><label>Nome da tarefa</label><input value={taskForm.titulo} onChange={(e) => setTaskForm((c) => ({ ...c, titulo: e.target.value }))} required /></div>
                <div className="field field--span-2"><label>Descrição</label><textarea rows={3} value={taskForm.descricao} onChange={(e) => setTaskForm((c) => ({ ...c, descricao: e.target.value }))} /></div>
                <div className="field field--span-2"><label>Anexo (URL)</label><input value={taskForm.anexoUrl} onChange={(e) => setTaskForm((c) => ({ ...c, anexoUrl: e.target.value }))} placeholder="https://..." /></div>
                <div className="field field--span-2"><label>Comentário inicial</label><textarea rows={3} value={taskForm.comentarioResumo} onChange={(e) => setTaskForm((c) => ({ ...c, comentarioResumo: e.target.value }))} /></div>
                <div className="field"><label>Prioridade</label><select value={taskForm.prioridade} onChange={(e) => setTaskForm((c) => ({ ...c, prioridade: e.target.value as PrioridadeTarefa }))}><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="CRITICA">Crítica</option></select></div>
                <div className="field"><label>Status</label><select value={taskForm.status} onChange={(e) => setTaskForm((c) => ({ ...c, status: e.target.value as StatusTarefa }))}><option value="NAO_INICIADA">Não iniciada</option><option value="EM_ANDAMENTO">Em andamento</option><option value="AGUARDANDO">Aguardando</option><option value="CONCLUIDA">Concluída</option><option value="CANCELADA">Cancelada</option></select></div>
                <div className="field"><label>Prazo</label><input type="date" value={taskForm.prazo} onChange={(e) => setTaskForm((c) => ({ ...c, prazo: e.target.value }))} /></div>
                <div className="field field--checkbox"><label><input type="checkbox" checked={projeto.interno ? false : taskForm.visivelCliente} disabled={projeto.interno} onChange={(e) => setTaskForm((c) => ({ ...c, visivelCliente: e.target.checked }))} />Visível para cliente</label></div>
                <div className="field field--checkbox field--span-2"><label><input type="checkbox" checked={taskForm.checklistHabilitado} onChange={(e) => setTaskForm((c) => ({ ...c, checklistHabilitado: e.target.checked }))} />Habilitar checklist na tarefa</label></div>
                {taskForm.checklistHabilitado ? <div className="field field--span-2"><label>Checklist</label><div className="checklist-box">{taskForm.checklistJson.length === 0 ? <small>Nenhum item no checklist ainda.</small> : null}{taskForm.checklistJson.map((item, index) => <div className="checklist-row" key={`${index}-${item.titulo}`}><input type="checkbox" checked={item.concluido} onChange={(e) => setTaskForm((c) => ({ ...c, checklistJson: c.checklistJson.map((current, currentIndex) => currentIndex === index ? { ...current, concluido: e.target.checked } : current) }))} /><input value={item.titulo} onChange={(e) => setTaskForm((c) => ({ ...c, checklistJson: c.checklistJson.map((current, currentIndex) => currentIndex === index ? { ...current, titulo: e.target.value } : current) }))} placeholder="Item do checklist" /><button className="button button--ghost button--small" type="button" onClick={() => setTaskForm((c) => ({ ...c, checklistJson: c.checklistJson.filter((_, i) => i !== index) }))}>Remover</button></div>)}<button className="button button--ghost button--small" type="button" onClick={() => setTaskForm((c) => ({ ...c, checklistJson: [...c.checklistJson, { titulo: '', concluido: false }] }))}>Adicionar item</button></div></div> : null}
                <div className="field field--span-2"><label>Subtarefas</label><div className="checklist-box">{taskForm.subtarefasJson.length === 0 ? <small>Nenhuma subtarefa ainda.</small> : null}{taskForm.subtarefasJson.map((item, index) => <div className="checklist-row" key={`${index}-${item.titulo}`}><input type="checkbox" checked={item.concluida} onChange={(e) => setTaskForm((c) => ({ ...c, subtarefasJson: c.subtarefasJson.map((current, currentIndex) => currentIndex === index ? { ...current, concluida: e.target.checked } : current) }))} /><input value={item.titulo} onChange={(e) => setTaskForm((c) => ({ ...c, subtarefasJson: c.subtarefasJson.map((current, currentIndex) => currentIndex === index ? { ...current, titulo: e.target.value } : current) }))} placeholder="Subtarefa" /><button className="button button--ghost button--small" type="button" onClick={() => setTaskForm((c) => ({ ...c, subtarefasJson: c.subtarefasJson.filter((_, i) => i !== index) }))}>Remover</button></div>)}<button className="button button--ghost button--small" type="button" onClick={() => setTaskForm((c) => ({ ...c, subtarefasJson: [...c.subtarefasJson, { titulo: '', concluida: false }] }))}>Adicionar subtarefa</button></div></div>
                <button className="button" type="submit" disabled={savingTask}>{savingTask ? 'Salvando...' : 'Criar tarefa'}</button>
              </form>
            </aside>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'entregaveis' ? (
        <section className="workspace-full">
          <div className="panel workspace-panel">
            <div className="panel__header panel__header--row"><div><h3>Entregáveis do projeto</h3><p>Controle o que será entregue formalmente ao cliente dentro do contexto do projeto.</p></div><button className="button" type="button" onClick={() => setShowEntregavelDrawer(true)}>Novo entregável</button></div>
            {projeto.entregaveis.length === 0 ? <EmptyState message="Ainda não há entregáveis cadastrados neste projeto." /> : <div className="table-wrap table-wrap--full"><table><thead><tr><th>Título</th><th>Tipo</th><th>Status</th><th>Previsto</th><th>Ações</th></tr></thead><tbody>{projeto.entregaveis.map((item) => <tr key={item.id}><td><strong>{item.titulo}</strong><div className="table-subline">{item.descricao || item.comentarioResumo || 'Sem descrição'}</div></td><td>{labelize(item.tipo)}</td><td>{labelize(item.status)}</td><td>{formatDate(item.dataPrevista)}</td><td><div className="table-actions">{item.anexoUrl ? <a className="button button--ghost button--small" href={item.anexoUrl} target="_blank" rel="noreferrer">Abrir</a> : null}<button className="button button--ghost button--small" type="button" onClick={() => startEditEntregavel(item)}>Editar</button><button className="button button--danger button--small" type="button" onClick={() => void handleDeleteEntregavel(item)}>Excluir</button></div></td></tr>)}</tbody></table></div>}
          </div>

          {showEntregavelDrawer ? (
            <aside className="side-drawer">
              <form className="panel form-grid form-grid--wide" onSubmit={handleEntregavelSubmit}>
                <div className="panel__header panel__header--row"><div><h3>{entregavelForm.id ? 'Editar entregável' : 'Novo entregável'}</h3><p>Entregáveis também vivem dentro do projeto.</p></div><button className="button button--ghost button--small" type="button" onClick={() => { setShowEntregavelDrawer(false); resetEntregavelForm(); }}>Fechar</button></div>
                <div className="field field--span-2"><label>Título</label><input value={entregavelForm.titulo} onChange={(e) => setEntregavelForm((c) => ({ ...c, titulo: e.target.value }))} required /></div>
                <div className="field"><label>Tipo</label><select value={entregavelForm.tipo} onChange={(e) => setEntregavelForm((c) => ({ ...c, tipo: e.target.value as TipoEntregavel }))}><option value="RELATORIO">Relatório</option><option value="PLANILHA">Planilha</option><option value="APRESENTACAO">Apresentação</option><option value="PARECER">Parecer</option><option value="DIAGNOSTICO">Diagnóstico</option><option value="PLANO_DE_ACAO">Plano de ação</option><option value="ATA">Ata</option><option value="DOCUMENTO">Documento</option><option value="OUTRO">Outro</option></select></div>
                <div className="field"><label>Status</label><select value={entregavelForm.status} onChange={(e) => setEntregavelForm((c) => ({ ...c, status: e.target.value as StatusEntregavel }))}><option value="PLANEJADO">Planejado</option><option value="EM_PRODUCAO">Em produção</option><option value="EM_REVISAO">Em revisão</option><option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option><option value="CONCLUIDO">Concluído</option><option value="CANCELADO">Cancelado</option></select></div>
                <div className="field"><label>Data prevista</label><input type="date" value={entregavelForm.dataPrevista} onChange={(e) => setEntregavelForm((c) => ({ ...c, dataPrevista: e.target.value }))} /></div>
                <div className="field field--checkbox"><label><input type="checkbox" checked={projeto.interno ? false : entregavelForm.visivelCliente} disabled={projeto.interno} onChange={(e) => setEntregavelForm((c) => ({ ...c, visivelCliente: e.target.checked }))} />Visível para cliente</label></div>
                <div className="field field--span-2"><label>Descrição</label><textarea rows={3} value={entregavelForm.descricao} onChange={(e) => setEntregavelForm((c) => ({ ...c, descricao: e.target.value }))} /></div>
                <div className="field field--span-2"><label>Anexo (URL)</label><input value={entregavelForm.anexoUrl} onChange={(e) => setEntregavelForm((c) => ({ ...c, anexoUrl: e.target.value }))} placeholder="https://..." /></div>
                <div className="field field--span-2"><label>Comentário / histórico</label><textarea rows={3} value={entregavelForm.comentarioResumo} onChange={(e) => setEntregavelForm((c) => ({ ...c, comentarioResumo: e.target.value }))} /></div>
                <div className="field field--span-2"><label>Observação interna</label><textarea rows={2} value={entregavelForm.observacaoInterna} onChange={(e) => setEntregavelForm((c) => ({ ...c, observacaoInterna: e.target.value }))} /></div>
                <div className="field field--span-2"><label>Observação ao cliente</label><textarea rows={2} value={entregavelForm.observacaoCliente} onChange={(e) => setEntregavelForm((c) => ({ ...c, observacaoCliente: e.target.value }))} /></div>
                <button className="button" type="submit" disabled={savingEntregavel}>{savingEntregavel ? 'Salvando...' : entregavelForm.id ? 'Salvar entregável' : 'Criar entregável'}</button>
              </form>
            </aside>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'documentos' ? (
        <section className="workspace-full">
          <div className="panel workspace-panel">
            <div className="panel__header panel__header--row"><div><h3>Documentos do projeto</h3><p>Controle arquivos, versões, aprovações e base de assinatura dentro do projeto.</p></div><button className="button" type="button" onClick={() => { resetDocumentoForm(); setShowDocumentoDrawer(true); }}>Novo documento</button></div>
            {projeto.documentos.length === 0 ? <EmptyState message="Ainda não há documentos cadastrados neste projeto." /> : <div className="table-wrap table-wrap--full"><table><thead><tr><th>Documento</th><th>Tipo</th><th>Status</th><th>Versão</th><th>Ações</th></tr></thead><tbody>{projeto.documentos.map((item) => <tr key={item.id}><td><strong>{item.nome}</strong><div className="table-subline">{item.descricao || item.arquivoUrl || 'Sem descrição'}</div></td><td>{labelize(item.tipo)}</td><td>{labelize(item.status)}</td><td>{item.versao || '—'}</td><td><div className="table-actions">{item.arquivoUrl ? <a className="button button--ghost button--small" href={item.arquivoUrl} target="_blank" rel="noreferrer">Abrir</a> : null}<button className="button button--ghost button--small" type="button" onClick={() => startEditDocumento(item)}>Editar</button><button className="button button--danger button--small" type="button" onClick={() => void handleDeleteDocumento(item)}>Excluir</button></div></td></tr>)}</tbody></table></div>}
          </div>
          {showDocumentoDrawer ? (
            <aside className="side-drawer">
              <form className="panel form-grid form-grid--wide" onSubmit={handleDocumentoSubmit}>
                <div className="panel__header panel__header--row"><div><h3>{documentoForm.id ? 'Editar documento' : 'Novo documento'}</h3><p>Estruture o repositório documental do projeto e prepare a base para assinatura/aprovação.</p></div><button className="button button--ghost button--small" type="button" onClick={() => { setShowDocumentoDrawer(false); resetDocumentoForm(); }}>Fechar</button></div>
                <div className="field field--span-2"><label>Nome</label><input value={documentoForm.nome} onChange={(e) => setDocumentoForm((c) => ({ ...c, nome: e.target.value }))} required /></div>
                <div className="field"><label>Tipo</label><select value={documentoForm.tipo} onChange={(e) => setDocumentoForm((c) => ({ ...c, tipo: e.target.value as TipoDocumento }))}><option value="CONTRATO">Contrato</option><option value="RELATORIO_CONSULTORIA">Relatório consultoria</option><option value="RELATORIO_DESLOCAMENTO">Relatório deslocamento</option><option value="REEMBOLSO">Reembolso</option><option value="TERMO_ENTREGA">Termo de entrega</option><option value="APROVACAO">Aprovação</option><option value="ENTREGAVEL">Entregável</option><option value="OUTRO">Outro</option></select></div>
                <div className="field"><label>Status</label><select value={documentoForm.status} onChange={(e) => setDocumentoForm((c) => ({ ...c, status: e.target.value as StatusDocumento }))}><option value="RASCUNHO">Rascunho</option><option value="ENVIADO">Enviado</option><option value="AGUARDANDO_ASSINATURA">Aguardando assinatura</option><option value="APROVADO">Aprovado</option><option value="ASSINADO">Assinado</option><option value="ARQUIVADO">Arquivado</option><option value="CANCELADO">Cancelado</option></select></div>
                <div className="field field--span-2"><label>Descrição</label><textarea rows={3} value={documentoForm.descricao} onChange={(e) => setDocumentoForm((c) => ({ ...c, descricao: e.target.value }))} /></div>
                <div className="field field--span-2 file-upload-row">
                  <label>Anexo do documento</label>
                  <input type="file" onChange={(e) => setArquivoDocumentoLocal(e.target.files?.[0] || null)} />
                  {arquivoDocumentoLocal ? <div className="file-upload-meta">Arquivo selecionado: {arquivoDocumentoLocal.name}</div> : null}
                  {documentoForm.arquivoUrl ? (
                    <div className="file-upload-meta">
                      Arquivo atual: <a href={documentoForm.arquivoUrl} target="_blank" rel="noreferrer">abrir anexo</a>
                    </div>
                  ) : null}
                </div>
                <div className="field field--span-2"><label>Arquivo por URL (opcional)</label><input value={documentoForm.arquivoUrl} onChange={(e) => setDocumentoForm((c) => ({ ...c, arquivoUrl: e.target.value }))} placeholder="https://..." /></div>
                <div className="field"><label>Versão</label><input value={documentoForm.versao} onChange={(e) => setDocumentoForm((c) => ({ ...c, versao: e.target.value }))} /></div>
                <div className="field field--checkbox"><label><input type="checkbox" checked={projeto.interno ? false : documentoForm.visivelCliente} disabled={projeto.interno} onChange={(e) => setDocumentoForm((c) => ({ ...c, visivelCliente: e.target.checked }))} />Visível para cliente</label></div>
                <div className="field field--checkbox"><label><input type="checkbox" checked={documentoForm.exigeAssinatura} onChange={(e) => setDocumentoForm((c) => ({ ...c, exigeAssinatura: e.target.checked }))} />Exige assinatura</label></div>
                <div className="field field--checkbox"><label><input type="checkbox" checked={documentoForm.exigeAprovacao} onChange={(e) => setDocumentoForm((c) => ({ ...c, exigeAprovacao: e.target.checked }))} />Exige aprovação</label></div>
                <div className="field field--span-2"><label>Observação interna</label><textarea rows={2} value={documentoForm.observacaoInterna} onChange={(e) => setDocumentoForm((c) => ({ ...c, observacaoInterna: e.target.value }))} /></div>
                <div className="field field--span-2"><label>Observação ao cliente</label><textarea rows={2} value={documentoForm.observacaoCliente} onChange={(e) => setDocumentoForm((c) => ({ ...c, observacaoCliente: e.target.value }))} /></div>
                <button className="button" type="submit" disabled={savingDocumento || uploadingDocumentoLocal}>{savingDocumento || uploadingDocumentoLocal ? 'Salvando...' : documentoForm.id ? 'Salvar documento' : 'Criar documento'}</button>
              </form>
            </aside>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
