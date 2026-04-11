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
  ProjetoEtapa,
  StatusDocumento,
  StatusEntregavel,
  StatusEtapa,
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
  etapaId: string;
  estimativaHoras: string;
};

type EtapaForm = {
  id?: string;
  nome: string;
  meta: string;
  dataInicio: string;
  dataFim: string;
  status: StatusEtapa;
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
  etapaId: '',
  estimativaHoras: '',
};

const etapaInitialForm: EtapaForm = {
  nome: '',
  meta: '',
  dataInicio: '',
  dataFim: '',
  status: 'PLANEJADA',
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

const kanbanOrder: StatusTarefa[] = ['NAO_INICIADA', 'INICIADA', 'AGUARDANDO_APROVACAO', 'CONCLUIDA', 'CANCELADA'];

const STATUS_TAREFA_LABELS: Record<StatusTarefa, string> = {
  NAO_INICIADA: 'Não Iniciada',
  INICIADA: 'Iniciada',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const PRIORIDADE_COR: Record<string, string> = {
  CRITICA: '#ef4444',
  ALTA: '#f97316',
  MEDIA: '#eab308',
  BAIXA: '#22c55e',
};

const STATUS_ETAPA_LABELS: Record<StatusEtapa, string> = {
  PLANEJADA: 'Planejada',
  ATIVA: 'Ativa',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

function PrioridadeDot({ p }: { p: string }) {
  return (
    <span
      title={p}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: PRIORIDADE_COR[p] ?? '#94a3b8',
        flexShrink: 0,
        marginRight: 4,
      }}
    />
  );
}

export default function ProjetoWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<ProjetoDetalhado | null>(null);
  const [etapas, setEtapas] = useState<ProjetoEtapa[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [taskForm, setTaskForm] = useState<TaskForm>(taskInitialForm);
  const [etapaForm, setEtapaForm] = useState<EtapaForm>(etapaInitialForm);
  const [entregavelForm, setEntregavelForm] = useState<EntregavelForm>(entregavelInitialForm);
  const [documentoForm, setDocumentoForm] = useState<DocumentoForm>(documentoInitialForm);
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [savingEtapa, setSavingEtapa] = useState(false);
  const [savingEntregavel, setSavingEntregavel] = useState(false);
  const [savingDocumento, setSavingDocumento] = useState(false);
  const [arquivoDocumentoLocal, setArquivoDocumentoLocal] = useState<File | null>(null);
  const [uploadingDocumentoLocal, setUploadingDocumentoLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'fases' | 'backlog' | 'tarefas' | 'entregaveis' | 'documentos'>('resumo');
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroAtribuidoA, setFiltroAtribuidoA] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [showEtapaDrawer, setShowEtapaDrawer] = useState(false);
  const [showEntregavelDrawer, setShowEntregavelDrawer] = useState(false);
  const [showDocumentoDrawer, setShowDocumentoDrawer] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  // pre-fill etapaId when adding task from backlog group
  const [, setTaskDrawerEtapaId] = useState<string>('');

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [projetoResponse, usuariosResponse, clientesResponse, etapasResponse] = await Promise.all([
        http.get<ProjetoDetalhado>(`/projetos/${id}`),
        http.get<UsuarioResumo[]>('/usuarios'),
        http.get<Cliente[]>('/clientes'),
        http.get<ProjetoEtapa[]>(`/projetos/${id}/etapas`),
      ]);
      setProjeto(projetoResponse.data);
      setUsuarios(usuariosResponse.data.filter((item) => item.ativo !== false));
      setClientes(clientesResponse.data);
      setEtapas(etapasResponse.data);
    } catch (err) {
      handleApiError(err, 'Falha ao carregar o projeto.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [id]);

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
      if (filtroAtribuidoA && item.responsavelUsuarioId !== filtroAtribuidoA && item.responsavelClienteId !== filtroAtribuidoA) return false;
      if (filtroEtapa === '__backlog') { if (item.etapaId) return false; }
      else if (filtroEtapa && item.etapaId !== filtroEtapa) return false;
      return true;
    });
  }, [projeto, filtroStatus, filtroAtribuidoA, filtroEtapa]);

  const tarefasPorStatus = useMemo(
    () => kanbanOrder.map((status) => ({ status, items: tarefasFiltradas.filter((item) => item.status === status) })),
    [tarefasFiltradas],
  );

  // For backlog view: group by etapa
  const backlogGrupos = useMemo(() => {
    const all = projeto?.tarefas ?? [];
    const grupos: Array<{ etapa: ProjetoEtapa | null; tarefas: Tarefa[] }> = [];
    // Ordered etapas first
    for (const etapa of etapas) {
      const ts = all.filter((t) => t.etapaId === etapa.id);
      grupos.push({ etapa, tarefas: ts });
    }
    // Tasks with no etapa
    const semFase = all.filter((t) => !t.etapaId);
    grupos.push({ etapa: null, tarefas: semFase });
    return grupos;
  }, [projeto, etapas]);

  function resetTaskForm(preEtapaId = '') {
    setTaskForm({ ...taskInitialForm, etapaId: preEtapaId, visivelCliente: false });
    setTaskDrawerEtapaId(preEtapaId);
  }

  function resetEtapaForm() { setEtapaForm({ ...etapaInitialForm }); }
  function resetEntregavelForm() { setEntregavelForm({ ...entregavelInitialForm, visivelCliente: projeto?.interno ? false : true }); }
  function resetDocumentoForm() { setDocumentoForm({ ...documentoInitialForm }); setArquivoDocumentoLocal(null); }

  function openNewTaskDrawer(preEtapaId = '') {
    resetTaskForm(preEtapaId);
    setShowTaskDrawer(true);
  }

  // ─── Task CRUD ────────────────────────────────────────────────────────────
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
        etapaId: taskForm.etapaId || undefined,
        estimativaHoras: taskForm.estimativaHoras ? Number(taskForm.estimativaHoras) : undefined,
      });
      setSuccess('Tarefa criada com sucesso.');
      resetTaskForm();
      setShowTaskDrawer(false);
      setActiveTab('backlog');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao cadastrar tarefa.');
    } finally {
      setSavingTask(false);
    }
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
    if (!window.confirm(`Excluir a tarefa "${item.titulo}"?`)) return;
    try {
      await http.delete(`/tarefas/${item.id}`);
      setSuccess('Tarefa excluída com sucesso.');
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir tarefa.');
    }
  }

  // ─── Etapa CRUD ───────────────────────────────────────────────────────────
  async function handleEtapaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setSavingEtapa(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        nome: etapaForm.nome,
        meta: etapaForm.meta || undefined,
        dataInicio: etapaForm.dataInicio,
        dataFim: etapaForm.dataFim,
        status: etapaForm.status,
      };
      if (etapaForm.id) {
        await http.put(`/projetos/${id}/etapas/${etapaForm.id}`, payload);
        setSuccess('Fase atualizada.');
      } else {
        await http.post(`/projetos/${id}/etapas`, payload);
        setSuccess('Fase criada.');
      }
      resetEtapaForm();
      setShowEtapaDrawer(false);
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao salvar fase.');
    } finally {
      setSavingEtapa(false);
    }
  }

  function startEditEtapa(etapa: ProjetoEtapa) {
    setEtapaForm({
      id: etapa.id,
      nome: etapa.nome,
      meta: etapa.meta || '',
      dataInicio: etapa.dataInicio ? etapa.dataInicio.slice(0, 10) : '',
      dataFim: etapa.dataFim ? etapa.dataFim.slice(0, 10) : '',
      status: etapa.status,
    });
    setShowEtapaDrawer(true);
  }

  async function handleEtapaAction(etapa: ProjetoEtapa, action: 'iniciar' | 'concluir' | 'delete') {
    if (!id) return;
    if (action === 'delete') {
      if (!window.confirm(`Excluir a fase "${etapa.nome}"? As tarefas desta fase voltarão para o backlog.`)) return;
      try {
        await http.delete(`/projetos/${id}/etapas/${etapa.id}`);
        setSuccess('Fase excluída.');
        await loadData();
      } catch (err) { handleApiError(err, 'Falha ao excluir fase.'); }
      return;
    }
    try {
      await http.post(`/projetos/${id}/etapas/${etapa.id}/${action}`);
      setSuccess(action === 'iniciar' ? 'Fase iniciada.' : 'Fase concluída.');
      await loadData();
    } catch (err) { handleApiError(err, 'Falha ao alterar status da fase.'); }
  }

  // ─── Entregável CRUD ──────────────────────────────────────────────────────
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

  async function handleDeleteEntregavel(item: Entregavel) {
    if (!window.confirm(`Excluir o entregável "${item.titulo}"?`)) return;
    try {
      await http.delete(`/entregaveis/${item.id}`);
      setSuccess('Entregável excluído com sucesso.');
      await loadData();
    } catch (err) { handleApiError(err, 'Falha ao excluir entregável.'); }
  }

  // ─── Documento CRUD ───────────────────────────────────────────────────────
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

  async function handleDeleteDocumento(item: Documento) {
    if (!window.confirm(`Excluir o documento "${item.nome}"?`)) return;
    try {
      await http.delete(`/documentos/${item.id}`);
      setSuccess('Documento excluído com sucesso.');
      await loadData();
    } catch (err) { handleApiError(err, 'Falha ao excluir documento.'); }
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

  const tabs = [
    { key: 'resumo',      label: 'Resumo' },
    { key: 'fases',       label: `Fases${etapas.length > 0 ? ` (${etapas.length})` : ''}` },
    { key: 'backlog',     label: `Backlog (${projeto.tarefas.length})` },
    { key: 'tarefas',     label: 'Quadro' },
    { key: 'entregaveis', label: `Entregáveis (${projeto.entregaveis.length})` },
    { key: 'documentos',  label: `Docs (${projeto.documentos.length})` },
  ] as const;

  return (
    <div className="page-stack">
      <PageHeader
        title={projeto.nome}
        subtitle={`${projeto.interno ? 'Projeto interno' : projeto.cliente?.razaoSocial || 'Projeto'} · ${labelize(projeto.status)}`}
        actions={<Link className="button button--ghost" to="/projetos">← Projetos</Link>}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      {/* Hero */}
      <section className="hero-panel compact-gap">
        <div>
          <div className="eyebrow">Workspace do Projeto</div>
          <h3>{projeto.nome}</h3>
          <p>{projeto.descricao || 'Sem descrição cadastrada para este projeto.'}</p>
        </div>
        <div className="hero-panel__aside">
          <span>Contexto operacional</span>
          <ul>
            <li><strong>Cliente:</strong> {projeto.interno ? 'Projeto interno' : projeto.cliente?.razaoSocial || '—'}</li>
            <li><strong>Status:</strong> {labelize(projeto.status)}</li>
            <li><strong>Prazo:</strong> {formatDate(projeto.dataInicio)} → {formatDate(projeto.dataFimPrevista)}</li>
          </ul>
        </div>
      </section>

      {/* Stats */}
      <div className="project-summary-grid">
        <div className="stat-card"><span className="stat-card__label">Abertas</span><strong className="stat-card__value">{projeto.painel?.tarefasAbertas ?? 0}</strong></div>
        <div className="stat-card" style={projeto.painel?.tarefasAtrasadas ? { borderColor: '#ef4444' } : {}}>
          <span className="stat-card__label">Atrasadas</span>
          <strong className="stat-card__value" style={projeto.painel?.tarefasAtrasadas ? { color: '#ef4444' } : {}}>{projeto.painel?.tarefasAtrasadas ?? 0}</strong>
        </div>
        <div className="stat-card"><span className="stat-card__label">Pend. Aprovação</span><strong className="stat-card__value">{projeto.painel?.tarefasPendentesAprovacao ?? 0}</strong></div>
        <div className="stat-card"><span className="stat-card__label">Concluídas</span><strong className="stat-card__value">{projeto.painel?.tarefasConcluidas ?? 0}</strong></div>
        <div className="stat-card"><span className="stat-card__label">Canceladas</span><strong className="stat-card__value">{projeto.painel?.tarefasCanceladas ?? 0}</strong></div>
        <div className="stat-card">
          <span className="stat-card__label">Progresso</span>
          <strong className="stat-card__value">{projeto.painel?.percentualConclusao ?? projeto.percentualAndamento ?? 0}%</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className="segmented segmented--tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`segmented__button${activeTab === tab.key ? ' segmented__button--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── RESUMO ────────────────────────────────────────────────────────── */}
      {activeTab === 'resumo' ? (
        <section className="two-columns two-columns--left-wide">
          <div className="panel compact-gap">
            <div className="panel__header"><h3>Resumo executivo</h3></div>
            <div className="table-wrap"><table><tbody>
              <tr><th>Cliente</th><td>{projeto.interno ? 'Projeto interno' : projeto.cliente?.razaoSocial || '—'}</td></tr>
              <tr><th>Visível para cliente</th><td>{projeto.visivelCliente ? 'Sim' : 'Não'}</td></tr>
              <tr><th>Prioridade</th><td>{labelize(projeto.prioridade)}</td></tr>
              <tr><th>Progresso</th><td>{projeto.painel?.percentualConclusao ?? projeto.percentualAndamento ?? 0}%</td></tr>
              <tr><th>Fases ativas</th><td>{etapas.filter((e) => e.status === 'ATIVA').length} / {etapas.length}</td></tr>
            </tbody></table></div>
          </div>
          <div className="panel compact-gap">
            <div className="panel__header"><h3>Fases do projeto</h3></div>
            {etapas.length === 0 ? (
              <EmptyState message="Nenhuma fase criada." />
            ) : (
              <div className="table-wrap"><table><thead><tr><th>Fase</th><th>Status</th><th>Prazo</th></tr></thead><tbody>
                {etapas.map((e) => (
                  <tr key={e.id}>
                    <td><strong>{e.nome}</strong></td>
                    <td><span className={`badge ${e.status === 'ATIVA' ? 'badge--primary' : e.status === 'CONCLUIDA' ? 'badge--success' : 'badge--muted'}`}>{STATUS_ETAPA_LABELS[e.status]}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDate(e.dataFim)}</td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </section>
      ) : null}

      {/* ── FASES ─────────────────────────────────────────────────────────── */}
      {activeTab === 'fases' ? (
        <section className="workspace-full">
          <div className="panel workspace-panel">
            <div className="panel__header panel__header--row">
              <div><h3>Fases do projeto</h3><p>Organize o trabalho em sprints ou fases de entrega. Vincule tarefas a cada fase.</p></div>
              <button className="button" type="button" onClick={() => { resetEtapaForm(); setShowEtapaDrawer(true); }}>Nova fase</button>
            </div>
            {etapas.length === 0 ? (
              <EmptyState message="Nenhuma fase criada para este projeto." />
            ) : (
              <div className="table-wrap table-wrap--full">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Meta</th>
                      <th>Início</th>
                      <th>Fim</th>
                      <th>Status</th>
                      <th>Tarefas</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {etapas.map((etapa) => (
                      <tr key={etapa.id}>
                        <td><strong>{etapa.nome}</strong></td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{etapa.meta || '—'}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(etapa.dataInicio)}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(etapa.dataFim)}</td>
                        <td>
                          <span className={`badge ${etapa.status === 'ATIVA' ? 'badge--primary' : etapa.status === 'CONCLUIDA' ? 'badge--success' : 'badge--muted'}`}>
                            {STATUS_ETAPA_LABELS[etapa.status]}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {projeto.tarefas.filter((t) => t.etapaId === etapa.id).length}
                        </td>
                        <td>
                          <div className="table-actions">
                            {etapa.status === 'PLANEJADA' && (
                              <button className="button button--ghost button--small" type="button" onClick={() => void handleEtapaAction(etapa, 'iniciar')}>Iniciar</button>
                            )}
                            {etapa.status === 'ATIVA' && (
                              <button className="button button--ghost button--small" type="button" onClick={() => void handleEtapaAction(etapa, 'concluir')}>Concluir</button>
                            )}
                            <button className="button button--ghost button--small" type="button" onClick={() => startEditEtapa(etapa)}>Editar</button>
                            <button className="button button--danger button--small" type="button" onClick={() => void handleEtapaAction(etapa, 'delete')}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </section>
      ) : null}

      {/* ── BACKLOG ───────────────────────────────────────────────────────── */}
      {activeTab === 'backlog' ? (
        <section className="workspace-full">
          <div className="panel workspace-panel">
            <div className="panel__header panel__header--row">
              <div><h3>Backlog</h3><p>Todas as tarefas organizadas por fase. Tarefas sem fase ficam no backlog geral.</p></div>
              <button className="button" type="button" onClick={() => openNewTaskDrawer('')}>Nova tarefa</button>
            </div>

            {projeto.tarefas.length === 0 ? (
              <EmptyState message="Ainda não há tarefas neste projeto." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {backlogGrupos.map((grupo) => {
                  const grupoId = grupo.etapa?.id ?? '__sem_fase';
                  const grupoLabel = grupo.etapa ? grupo.etapa.nome : 'Sem fase (Backlog)';
                  const corStatus = grupo.etapa?.status === 'ATIVA' ? '#6366f1' : grupo.etapa?.status === 'CONCLUIDA' ? '#22c55e' : 'var(--muted)';
                  return (
                    <div key={grupoId} className="panel panel--compact">
                      <div className="panel__header panel__header--row" style={{ paddingBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h4 style={{ color: corStatus, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                            {grupoLabel}
                          </h4>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>({grupo.tarefas.length})</span>
                          {grupo.etapa && (
                            <span className={`badge ${grupo.etapa.status === 'ATIVA' ? 'badge--primary' : 'badge--muted'}`} style={{ fontSize: 10 }}>
                              {STATUS_ETAPA_LABELS[grupo.etapa.status]}
                            </span>
                          )}
                        </div>
                        <button
                          className="button button--ghost button--small"
                          type="button"
                          onClick={() => openNewTaskDrawer(grupo.etapa?.id ?? '')}
                        >
                          + Tarefa
                        </button>
                      </div>
                      {grupo.tarefas.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0' }}>Nenhuma tarefa nesta fase.</p>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th style={{ width: 8 }}></th>
                                <th>Tarefa</th>
                                <th>Status</th>
                                <th>Responsável</th>
                                <th>Prazo</th>
                                <th>Horas</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {grupo.tarefas.map((t) => (
                                <tr key={t.id} style={{ cursor: 'pointer' }} onDoubleClick={() => navigate(`/projetos/${id}/tarefas/${t.id}`)}>
                                  <td><PrioridadeDot p={t.prioridade} /></td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <strong style={{ fontSize: 13 }}>{t.titulo}</strong>
                                      {t.labels && t.labels.length > 0 && t.labels.map(({ label }) => (
                                        <span key={label.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: label.cor + '33', color: label.cor, fontWeight: 600 }}>
                                          {label.nome}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge ${t.status === 'CONCLUIDA' ? 'badge--success' : t.status === 'INICIADA' ? 'badge--primary' : t.status === 'AGUARDANDO_APROVACAO' ? 'badge--warning' : 'badge--muted'}`} style={{ fontSize: 11 }}>
                                      {STATUS_TAREFA_LABELS[t.status] ?? t.status}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{nomeAtribuido(t)}</td>
                                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{t.prazo ? formatDate(t.prazo) : '—'}</td>
                                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                                    {t.estimativaHoras ? `${t.horasRegistradas ?? 0}h / ${t.estimativaHoras}h` : t.horasRegistradas ? `${t.horasRegistradas}h` : '—'}
                                  </td>
                                  <td>
                                    <div className="table-actions">
                                      <Link className="button button--ghost button--small" to={`/projetos/${id}/tarefas/${t.id}`}>Abrir</Link>
                                      <button className="button button--danger button--small" type="button" onClick={() => void handleDeleteTask(t)}>Excluir</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>
      ) : null}

      {/* ── QUADRO / KANBAN ───────────────────────────────────────────────── */}
      {activeTab === 'tarefas' ? (
        <section className="workspace-full">
          <div className="panel workspace-panel">
            <div className="panel__header panel__header--row">
              <div><h3>Quadro de tarefas</h3><p>Arraste entre colunas para atualizar o status. Duplo clique para abrir.</p></div>
              <div className="header-tools">
                <div className="segmented">
                  <button type="button" className={`segmented__button${viewMode === 'lista' ? ' segmented__button--active' : ''}`} onClick={() => setViewMode('lista')}>Lista</button>
                  <button type="button" className={`segmented__button${viewMode === 'kanban' ? ' segmented__button--active' : ''}`} onClick={() => setViewMode('kanban')}>Kanban</button>
                </div>
                <button className="button" type="button" onClick={() => openNewTaskDrawer('')}>Nova tarefa</button>
              </div>
            </div>

            <div className="filter-bar">
              <div className="field">
                <label>Status</label>
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                  <option value="">Todos</option>
                  {kanbanOrder.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Fase</label>
                <select value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="__backlog">Sem fase</option>
                  {etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Atribuído a</label>
                <select value={filtroAtribuidoA} onChange={(e) => setFiltroAtribuidoA(e.target.value)}>
                  <option value="">Todos</option>
                  {atribuidos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </div>
            </div>

            {tarefasFiltradas.length === 0 ? <EmptyState message="Nenhuma tarefa encontrada com os filtros escolhidos." /> : null}

            {tarefasFiltradas.length > 0 && viewMode === 'lista' ? (
              <div className="table-wrap table-wrap--full">
                <table>
                  <thead><tr><th style={{ width: 8 }}></th><th>Tarefa</th><th>Fase</th><th>Responsável</th><th>Status</th><th>Prazo</th><th>Horas</th><th>Ações</th></tr></thead>
                  <tbody>
                    {tarefasFiltradas.map((item) => (
                      <tr key={item.id} onDoubleClick={() => navigate(`/projetos/${id}/tarefas/${item.id}`)}>
                        <td><PrioridadeDot p={item.prioridade} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <strong>{item.titulo}</strong>
                            {item.labels && item.labels.map(({ label }) => (
                              <span key={label.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: label.cor + '33', color: label.cor, fontWeight: 600 }}>{label.nome}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{item.etapa?.nome ?? '—'}</td>
                        <td style={{ fontSize: 12 }}>{nomeAtribuido(item)}</td>
                        <td><span className={`badge ${item.status === 'CONCLUIDA' ? 'badge--success' : item.status === 'INICIADA' ? 'badge--primary' : item.status === 'AGUARDANDO_APROVACAO' ? 'badge--warning' : 'badge--muted'}`}>{STATUS_TAREFA_LABELS[item.status] ?? item.status}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDate(item.prazo)}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {item.estimativaHoras ? `${item.horasRegistradas ?? 0}h / ${item.estimativaHoras}h` : item.horasRegistradas ? `${item.horasRegistradas}h` : '—'}
                        </td>
                        <td>
                          <div className="table-actions">
                            <Link className="button button--ghost button--small" to={`/projetos/${id}/tarefas/${item.id}`}>Abrir</Link>
                            <button className="button button--danger button--small" type="button" onClick={() => void handleDeleteTask(item)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {tarefasFiltradas.length > 0 && viewMode === 'kanban' ? (
              <div className="kanban-board kanban-board--wide">
                {tarefasPorStatus.map((column) => (
                  <section
                    className="kanban-column"
                    key={column.status}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={async () => {
                      const moving = tarefasFiltradas.find((task) => task.id === draggingTaskId);
                      if (moving) await handleMoveTask(moving, column.status);
                      setDraggingTaskId(null);
                    }}
                  >
                    <div className="kanban-column__header">
                      <h4>{labelize(column.status)}</h4>
                      <span>{column.items.length}</span>
                    </div>
                    <div className="kanban-column__body">
                      {column.items.length === 0 ? <div className="kanban-empty">Nenhuma tarefa.</div> : null}
                      {column.items.map((item) => (
                        <article
                          className="kanban-card"
                          key={item.id}
                          draggable
                          onDragStart={() => setDraggingTaskId(item.id)}
                          onDoubleClick={() => navigate(`/projetos/${id}/tarefas/${item.id}`)}
                        >
                          <div className="kanban-card__top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <PrioridadeDot p={item.prioridade} />
                              <strong style={{ fontSize: 13 }}>{item.titulo}</strong>
                            </div>
                          </div>
                          {item.labels && item.labels.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {item.labels.map(({ label }) => (
                                <span key={label.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: label.cor + '33', color: label.cor, fontWeight: 600 }}>
                                  {label.nome}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="kanban-card__meta" style={{ marginTop: 6 }}>
                            <span>{nomeAtribuido(item)}</span>
                            {item.prazo ? <span>⏰ {formatDate(item.prazo)}</span> : null}
                            {item.estimativaHoras ? <span>⏱ {item.horasRegistradas ?? 0}h / {item.estimativaHoras}h</span> : null}
                            {item.etapa ? <span style={{ color: '#6366f1' }}>{item.etapa.nome}</span> : null}
                          </div>
                          <div className="table-actions" style={{ marginTop: 8 }}>
                            <Link className="button button--ghost button--small" to={`/projetos/${id}/tarefas/${item.id}`}>Abrir</Link>
                            <button className="button button--danger button--small" type="button" onClick={() => void handleDeleteTask(item)}>Excluir</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>

        </section>
      ) : null}

      {/* ── ENTREGÁVEIS ───────────────────────────────────────────────────── */}
      {activeTab === 'entregaveis' ? (
        <section className="workspace-full">
          <div className="panel workspace-panel">
            <div className="panel__header panel__header--row">
              <div><h3>Entregáveis do projeto</h3><p>Controle o que será entregue formalmente ao cliente.</p></div>
              <button className="button" type="button" onClick={() => setShowEntregavelDrawer(true)}>Novo entregável</button>
            </div>
            {projeto.entregaveis.length === 0 ? (
              <EmptyState message="Ainda não há entregáveis cadastrados neste projeto." />
            ) : (
              <div className="table-wrap table-wrap--full">
                <table>
                  <thead><tr><th>Título</th><th>Tipo</th><th>Status</th><th>Previsto</th><th>Ações</th></tr></thead>
                  <tbody>
                    {projeto.entregaveis.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.titulo}</strong><div className="table-subline">{item.descricao || item.comentarioResumo || 'Sem descrição'}</div></td>
                        <td>{labelize(item.tipo)}</td>
                        <td>{labelize(item.status)}</td>
                        <td>{formatDate(item.dataPrevista)}</td>
                        <td>
                          <div className="table-actions">
                            {item.anexoUrl ? <a className="button button--ghost button--small" href={item.anexoUrl} target="_blank" rel="noreferrer">Abrir</a> : null}
                            <button className="button button--ghost button--small" type="button" onClick={() => startEditEntregavel(item)}>Editar</button>
                            <button className="button button--danger button--small" type="button" onClick={() => void handleDeleteEntregavel(item)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </section>
      ) : null}

      {/* ── DOCUMENTOS ────────────────────────────────────────────────────── */}
      {activeTab === 'documentos' ? (
        <section className="workspace-full">
          <div className="panel workspace-panel">
            <div className="panel__header panel__header--row">
              <div><h3>Documentos do projeto</h3><p>Arquivos, versões, aprovações e assinaturas.</p></div>
              <button className="button" type="button" onClick={() => { resetDocumentoForm(); setShowDocumentoDrawer(true); }}>Novo documento</button>
            </div>
            {projeto.documentos.length === 0 ? (
              <EmptyState message="Ainda não há documentos cadastrados neste projeto." />
            ) : (
              <div className="table-wrap table-wrap--full">
                <table>
                  <thead><tr><th>Documento</th><th>Tipo</th><th>Status</th><th>Versão</th><th>Ações</th></tr></thead>
                  <tbody>
                    {projeto.documentos.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.nome}</strong><div className="table-subline">{item.descricao || item.arquivoUrl || 'Sem descrição'}</div></td>
                        <td>{labelize(item.tipo)}</td>
                        <td>{labelize(item.status)}</td>
                        <td>{item.versao || '—'}</td>
                        <td>
                          <div className="table-actions">
                            {item.arquivoUrl ? <a className="button button--ghost button--small" href={item.arquivoUrl} target="_blank" rel="noreferrer">Abrir</a> : null}
                            <button className="button button--ghost button--small" type="button" onClick={() => startEditDocumento(item)}>Editar</button>
                            <button className="button button--danger button--small" type="button" onClick={() => void handleDeleteDocumento(item)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* ── OVERLAYS (all drawers rendered as fixed overlays) ─────────────── */}

      {showTaskDrawer ? (
        <div className="drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowTaskDrawer(false); resetTaskForm(); } }}>
          <aside className="side-drawer">
            <TaskDrawerForm
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              etapas={etapas}
              usuarios={usuarios}
              clientes={clientes}
              projeto={projeto}
              saving={savingTask}
              onSubmit={handleTaskSubmit}
              onClose={() => { setShowTaskDrawer(false); resetTaskForm(); }}
            />
          </aside>
        </div>
      ) : null}

      {showEtapaDrawer ? (
        <div className="drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowEtapaDrawer(false); resetEtapaForm(); } }}>
          <aside className="side-drawer">
            <form className="panel form-grid form-grid--wide" onSubmit={handleEtapaSubmit}>
              <div className="panel__header panel__header--row">
                <div><h3>{etapaForm.id ? 'Editar fase' : 'Nova fase'}</h3></div>
                <button className="button button--ghost button--small" type="button" onClick={() => { setShowEtapaDrawer(false); resetEtapaForm(); }}>Fechar</button>
              </div>
              <div className="field field--span-2"><label>Nome da fase</label><input value={etapaForm.nome} onChange={(e) => setEtapaForm((c) => ({ ...c, nome: e.target.value }))} required /></div>
              <div className="field field--span-2"><label>Meta / objetivo</label><textarea rows={2} value={etapaForm.meta} onChange={(e) => setEtapaForm((c) => ({ ...c, meta: e.target.value }))} /></div>
              <div className="field"><label>Data de início</label><input type="date" value={etapaForm.dataInicio} onChange={(e) => setEtapaForm((c) => ({ ...c, dataInicio: e.target.value }))} required /></div>
              <div className="field"><label>Data de fim</label><input type="date" value={etapaForm.dataFim} onChange={(e) => setEtapaForm((c) => ({ ...c, dataFim: e.target.value }))} required /></div>
              <div className="field"><label>Status</label>
                <select value={etapaForm.status} onChange={(e) => setEtapaForm((c) => ({ ...c, status: e.target.value as StatusEtapa }))}>
                  <option value="PLANEJADA">Planejada</option>
                  <option value="ATIVA">Ativa</option>
                  <option value="CONCLUIDA">Concluída</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
              <button className="button" type="submit" disabled={savingEtapa}>{savingEtapa ? 'Salvando...' : etapaForm.id ? 'Salvar fase' : 'Criar fase'}</button>
            </form>
          </aside>
        </div>
      ) : null}

      {showEntregavelDrawer ? (
        <div className="drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowEntregavelDrawer(false); resetEntregavelForm(); } }}>
          <aside className="side-drawer">
            <form className="panel form-grid form-grid--wide" onSubmit={handleEntregavelSubmit}>
              <div className="panel__header panel__header--row">
                <div><h3>{entregavelForm.id ? 'Editar entregável' : 'Novo entregável'}</h3></div>
                <button className="button button--ghost button--small" type="button" onClick={() => { setShowEntregavelDrawer(false); resetEntregavelForm(); }}>Fechar</button>
              </div>
              <div className="field field--span-2"><label>Título</label><input value={entregavelForm.titulo} onChange={(e) => setEntregavelForm((c) => ({ ...c, titulo: e.target.value }))} required /></div>
              <div className="field"><label>Tipo</label><select value={entregavelForm.tipo} onChange={(e) => setEntregavelForm((c) => ({ ...c, tipo: e.target.value as TipoEntregavel }))}><option value="RELATORIO">Relatório</option><option value="PLANILHA">Planilha</option><option value="APRESENTACAO">Apresentação</option><option value="PARECER">Parecer</option><option value="DIAGNOSTICO">Diagnóstico</option><option value="PLANO_DE_ACAO">Plano de ação</option><option value="ATA">Ata</option><option value="DOCUMENTO">Documento</option><option value="OUTRO">Outro</option></select></div>
              <div className="field"><label>Status</label><select value={entregavelForm.status} onChange={(e) => setEntregavelForm((c) => ({ ...c, status: e.target.value as StatusEntregavel }))}><option value="PLANEJADO">Planejado</option><option value="EM_PRODUCAO">Em produção</option><option value="EM_REVISAO">Em revisão</option><option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option><option value="CONCLUIDO">Concluído</option><option value="CANCELADO">Cancelado</option></select></div>
              <div className="field"><label>Data prevista</label><input type="date" value={entregavelForm.dataPrevista} onChange={(e) => setEntregavelForm((c) => ({ ...c, dataPrevista: e.target.value }))} /></div>
              <div className="field field--checkbox"><label><input type="checkbox" checked={projeto.interno ? false : entregavelForm.visivelCliente} disabled={projeto.interno} onChange={(e) => setEntregavelForm((c) => ({ ...c, visivelCliente: e.target.checked }))} />Visível para cliente</label></div>
              <div className="field field--span-2"><label>Descrição</label><textarea rows={3} value={entregavelForm.descricao} onChange={(e) => setEntregavelForm((c) => ({ ...c, descricao: e.target.value }))} /></div>
              <div className="field field--span-2"><label>Anexo (URL)</label><input value={entregavelForm.anexoUrl} onChange={(e) => setEntregavelForm((c) => ({ ...c, anexoUrl: e.target.value }))} placeholder="https://..." /></div>
              <div className="field field--span-2"><label>Comentário</label><textarea rows={2} value={entregavelForm.comentarioResumo} onChange={(e) => setEntregavelForm((c) => ({ ...c, comentarioResumo: e.target.value }))} /></div>
              <div className="field field--span-2"><label>Observação interna</label><textarea rows={2} value={entregavelForm.observacaoInterna} onChange={(e) => setEntregavelForm((c) => ({ ...c, observacaoInterna: e.target.value }))} /></div>
              <div className="field field--span-2"><label>Observação ao cliente</label><textarea rows={2} value={entregavelForm.observacaoCliente} onChange={(e) => setEntregavelForm((c) => ({ ...c, observacaoCliente: e.target.value }))} /></div>
              <button className="button" type="submit" disabled={savingEntregavel}>{savingEntregavel ? 'Salvando...' : entregavelForm.id ? 'Salvar entregável' : 'Criar entregável'}</button>
            </form>
          </aside>
        </div>
      ) : null}

      {showDocumentoDrawer ? (
        <div className="drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowDocumentoDrawer(false); resetDocumentoForm(); } }}>
          <aside className="side-drawer">
            <form className="panel form-grid form-grid--wide" onSubmit={handleDocumentoSubmit}>
              <div className="panel__header panel__header--row">
                <div><h3>{documentoForm.id ? 'Editar documento' : 'Novo documento'}</h3></div>
                <button className="button button--ghost button--small" type="button" onClick={() => { setShowDocumentoDrawer(false); resetDocumentoForm(); }}>Fechar</button>
              </div>
              <div className="field field--span-2"><label>Nome</label><input value={documentoForm.nome} onChange={(e) => setDocumentoForm((c) => ({ ...c, nome: e.target.value }))} required /></div>
              <div className="field"><label>Tipo</label><select value={documentoForm.tipo} onChange={(e) => setDocumentoForm((c) => ({ ...c, tipo: e.target.value as TipoDocumento }))}><option value="CONTRATO">Contrato</option><option value="RELATORIO_CONSULTORIA">Relatório consultoria</option><option value="RELATORIO_DESLOCAMENTO">Relatório deslocamento</option><option value="REEMBOLSO">Reembolso</option><option value="TERMO_ENTREGA">Termo de entrega</option><option value="APROVACAO">Aprovação</option><option value="ENTREGAVEL">Entregável</option><option value="OUTRO">Outro</option></select></div>
              <div className="field"><label>Status</label><select value={documentoForm.status} onChange={(e) => setDocumentoForm((c) => ({ ...c, status: e.target.value as StatusDocumento }))}><option value="RASCUNHO">Rascunho</option><option value="ENVIADO">Enviado</option><option value="AGUARDANDO_ASSINATURA">Aguardando assinatura</option><option value="APROVADO">Aprovado</option><option value="ASSINADO">Assinado</option><option value="ARQUIVADO">Arquivado</option><option value="CANCELADO">Cancelado</option></select></div>
              <div className="field field--span-2"><label>Descrição</label><textarea rows={3} value={documentoForm.descricao} onChange={(e) => setDocumentoForm((c) => ({ ...c, descricao: e.target.value }))} /></div>
              <div className="field field--span-2 file-upload-row">
                <label>Anexo do documento</label>
                <input type="file" onChange={(e) => setArquivoDocumentoLocal(e.target.files?.[0] || null)} />
                {arquivoDocumentoLocal ? <div className="file-upload-meta">Arquivo selecionado: {arquivoDocumentoLocal.name}</div> : null}
                {documentoForm.arquivoUrl ? <div className="file-upload-meta">Arquivo atual: <a href={documentoForm.arquivoUrl} target="_blank" rel="noreferrer">abrir anexo</a></div> : null}
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
        </div>
      ) : null}
    </div>
  );
}

// ─── TaskDrawerForm (shared between Backlog and Quadro tabs) ──────────────────
function TaskDrawerForm({
  taskForm,
  setTaskForm,
  etapas,
  usuarios,
  clientes,
  projeto,
  saving,
  onSubmit,
  onClose,
}: {
  taskForm: TaskForm;
  setTaskForm: React.Dispatch<React.SetStateAction<TaskForm>>;
  etapas: ProjetoEtapa[];
  usuarios: UsuarioResumo[];
  clientes: Cliente[];
  projeto: ProjetoDetalhado;
  saving: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <form className="panel form-grid form-grid--wide" onSubmit={onSubmit}>
      <div className="panel__header panel__header--row">
        <div><h3>Nova tarefa</h3></div>
        <button className="button button--ghost button--small" type="button" onClick={onClose}>Fechar</button>
      </div>

      <div className="field">
        <label>Atribuição</label>
        <select value={taskForm.atribuicaoTipo} onChange={(e) => setTaskForm((c) => ({ ...c, atribuicaoTipo: e.target.value as TipoAtribuicaoTarefa }))}>
          <option value="ANALISTA">Analista</option>
          <option value="CLIENTE" disabled={projeto.interno}>Cliente</option>
        </select>
      </div>
      <div className="field">
        <label>{taskForm.atribuicaoTipo === 'ANALISTA' ? 'Analista responsável' : 'Cliente responsável'}</label>
        {taskForm.atribuicaoTipo === 'ANALISTA' ? (
          <select value={taskForm.responsavelUsuarioId} onChange={(e) => setTaskForm((c) => ({ ...c, responsavelUsuarioId: e.target.value }))}>
            <option value="">Não atribuído</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        ) : (
          <select value={taskForm.responsavelClienteId} onChange={(e) => setTaskForm((c) => ({ ...c, responsavelClienteId: e.target.value }))} disabled={projeto.interno}>
            <option value="">Não atribuído</option>
            {clientes.map((cl) => <option key={cl.id} value={cl.id}>{cl.razaoSocial}</option>)}
          </select>
        )}
      </div>

      <div className="field field--span-2"><label>Nome da tarefa</label><input value={taskForm.titulo} onChange={(e) => setTaskForm((c) => ({ ...c, titulo: e.target.value }))} required /></div>
      <div className="field field--span-2"><label>Descrição</label><textarea rows={3} value={taskForm.descricao} onChange={(e) => setTaskForm((c) => ({ ...c, descricao: e.target.value }))} /></div>

      <div className="field">
        <label>Fase</label>
        <select value={taskForm.etapaId} onChange={(e) => setTaskForm((c) => ({ ...c, etapaId: e.target.value }))}>
          <option value="">Sem fase (Backlog)</option>
          {etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Estimativa (horas)</label>
        <input type="number" min="0" step="0.5" value={taskForm.estimativaHoras} onChange={(e) => setTaskForm((c) => ({ ...c, estimativaHoras: e.target.value }))} placeholder="Ex: 4" />
      </div>

      <div className="field">
        <label>Prioridade</label>
        <select value={taskForm.prioridade} onChange={(e) => setTaskForm((c) => ({ ...c, prioridade: e.target.value as PrioridadeTarefa }))}>
          <option value="BAIXA">Baixa</option>
          <option value="MEDIA">Média</option>
          <option value="ALTA">Alta</option>
          <option value="CRITICA">Crítica</option>
        </select>
      </div>
      <div className="field">
        <label>Status</label>
        <select value={taskForm.status} onChange={(e) => setTaskForm((c) => ({ ...c, status: e.target.value as StatusTarefa }))}>
          <option value="NAO_INICIADA">Não Iniciada</option>
          <option value="INICIADA">Iniciada</option>
          <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>
      <div className="field"><label>Prazo</label><input type="date" value={taskForm.prazo} onChange={(e) => setTaskForm((c) => ({ ...c, prazo: e.target.value }))} /></div>
      <div className="field field--checkbox">
        <label>
          <input type="checkbox" checked={projeto.interno ? false : taskForm.visivelCliente} disabled={projeto.interno} onChange={(e) => setTaskForm((c) => ({ ...c, visivelCliente: e.target.checked }))} />
          Visível para cliente
        </label>
      </div>

      <div className="field field--span-2"><label>Anexo (URL)</label><input value={taskForm.anexoUrl} onChange={(e) => setTaskForm((c) => ({ ...c, anexoUrl: e.target.value }))} placeholder="https://..." /></div>
      <div className="field field--span-2"><label>Comentário inicial</label><textarea rows={2} value={taskForm.comentarioResumo} onChange={(e) => setTaskForm((c) => ({ ...c, comentarioResumo: e.target.value }))} /></div>

      <div className="field field--checkbox field--span-2">
        <label>
          <input type="checkbox" checked={taskForm.checklistHabilitado} onChange={(e) => setTaskForm((c) => ({ ...c, checklistHabilitado: e.target.checked }))} />
          Habilitar checklist
        </label>
      </div>
      {taskForm.checklistHabilitado ? (
        <div className="field field--span-2">
          <label>Checklist</label>
          <div className="checklist-box">
            {taskForm.checklistJson.map((item, index) => (
              <div className="checklist-row" key={index}>
                <input type="checkbox" checked={item.concluido} onChange={(e) => setTaskForm((c) => ({ ...c, checklistJson: c.checklistJson.map((ci, ii) => ii === index ? { ...ci, concluido: e.target.checked } : ci) }))} />
                <input value={item.titulo} onChange={(e) => setTaskForm((c) => ({ ...c, checklistJson: c.checklistJson.map((ci, ii) => ii === index ? { ...ci, titulo: e.target.value } : ci) }))} placeholder="Item do checklist" />
                <button className="button button--ghost button--small" type="button" onClick={() => setTaskForm((c) => ({ ...c, checklistJson: c.checklistJson.filter((_, i) => i !== index) }))}>Remover</button>
              </div>
            ))}
            <button className="button button--ghost button--small" type="button" onClick={() => setTaskForm((c) => ({ ...c, checklistJson: [...c.checklistJson, { titulo: '', concluido: false }] }))}>+ Item</button>
          </div>
        </div>
      ) : null}

      <div className="field field--span-2">
        <label>Subtarefas</label>
        <div className="checklist-box">
          {taskForm.subtarefasJson.map((item, index) => (
            <div className="checklist-row" key={index}>
              <input type="checkbox" checked={item.concluida} onChange={(e) => setTaskForm((c) => ({ ...c, subtarefasJson: c.subtarefasJson.map((si, ii) => ii === index ? { ...si, concluida: e.target.checked } : si) }))} />
              <input value={item.titulo} onChange={(e) => setTaskForm((c) => ({ ...c, subtarefasJson: c.subtarefasJson.map((si, ii) => ii === index ? { ...si, titulo: e.target.value } : si) }))} placeholder="Subtarefa" />
              <button className="button button--ghost button--small" type="button" onClick={() => setTaskForm((c) => ({ ...c, subtarefasJson: c.subtarefasJson.filter((_, i) => i !== index) }))}>Remover</button>
            </div>
          ))}
          <button className="button button--ghost button--small" type="button" onClick={() => setTaskForm((c) => ({ ...c, subtarefasJson: [...c.subtarefasJson, { titulo: '', concluida: false }] }))}>+ Subtarefa</button>
        </div>
      </div>

      <button className="button" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Criar tarefa'}</button>
    </form>
  );
}
