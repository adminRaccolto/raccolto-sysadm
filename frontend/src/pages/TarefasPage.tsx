import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import type {
  Cliente,
  PrioridadeTarefa,
  Projeto,
  StatusTarefa,
  Tarefa,
  TipoAtribuicaoTarefa,
  UsuarioResumo,
} from '../types/api';
import { formatDate, labelize, nomeAtribuido } from '../utils/format';

const initialForm = {
  projetoId: '',
  atribuicaoTipo: 'ANALISTA' as TipoAtribuicaoTarefa,
  responsavelUsuarioId: '',
  responsavelClienteId: '',
  titulo: '',
  descricao: '',
  anexoUrl: '',
  comentarioResumo: '',
  checklistHabilitado: false,
  checklistJsonText: '',
  subtarefasJsonText: '',
  prioridade: 'ALTA' as PrioridadeTarefa,
  prazo: '',
  status: 'NAO_INICIADA' as StatusTarefa,
  visivelCliente: false,
};

const kanbanOrder: StatusTarefa[] = ['NAO_INICIADA', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDA', 'CANCELADA'];

export default function TarefasPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filtroProjetoId, setFiltroProjetoId] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroAtribuidoA, setFiltroAtribuidoA] = useState('');
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [projetosResponse, tarefasResponse, usuariosResponse, clientesResponse] = await Promise.all([
        http.get<Projeto[]>('/projetos'),
        http.get<Tarefa[]>('/tarefas', {
          params: {
            projetoId: filtroProjetoId || undefined,
            status: filtroStatus || undefined,
            atribuidoA: filtroAtribuidoA || undefined,
          },
        }),
        http.get<UsuarioResumo[]>('/usuarios'),
        http.get<Cliente[]>('/clientes'),
      ]);
      setProjetos(projetosResponse.data);
      setTarefas(tarefasResponse.data);
      setUsuarios(usuariosResponse.data.filter((item) => item.ativo !== false));
      setClientes(clientesResponse.data);
      setForm((current) => ({
        ...current,
        projetoId: current.projetoId || projetosResponse.data[0]?.id || '',
      }));
    } catch (err) {
      handleApiError(err, 'Falha ao carregar tarefas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroProjetoId, filtroStatus, filtroAtribuidoA]);

  const projetoAtual = useMemo(
    () => projetos.find((item) => item.id === form.projetoId) || null,
    [projetos, form.projetoId],
  );

  const atribuidos = useMemo(() => {
    return [
      ...usuarios.map((item) => ({ id: item.id, nome: item.nome, tipo: 'ANALISTA' as const })),
      ...clientes.map((item) => ({ id: item.id, nome: item.razaoSocial, tipo: 'CLIENTE' as const })),
    ];
  }, [usuarios, clientes]);

  const tarefasPorStatus = useMemo(() => {
    return kanbanOrder.map((status) => ({
      status,
      items: tarefas.filter((item) => item.status === status),
    }));
  }, [tarefas]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await http.post('/tarefas', {
        projetoId: form.projetoId,
        atribuicaoTipo: form.atribuicaoTipo,
        responsavelUsuarioId: form.atribuicaoTipo === 'ANALISTA' ? form.responsavelUsuarioId || undefined : undefined,
        responsavelClienteId: form.atribuicaoTipo === 'CLIENTE' ? form.responsavelClienteId || undefined : undefined,
        titulo: form.titulo,
        descricao: form.descricao || undefined,
        anexoUrl: form.anexoUrl || undefined,
        comentarioResumo: form.comentarioResumo || undefined,
        checklistHabilitado: form.checklistHabilitado,
        checklistJson: form.checklistJsonText
          ? form.checklistJsonText.split('\n').filter(Boolean).map((titulo) => ({ titulo, concluido: false }))
          : undefined,
        subtarefasJson: form.subtarefasJsonText
          ? form.subtarefasJsonText.split('\n').filter(Boolean).map((titulo) => ({ titulo, concluida: false }))
          : undefined,
        prioridade: form.prioridade,
        prazo: form.prazo || undefined,
        status: form.status,
        visivelCliente: form.visivelCliente,
      });
      setSuccess('Tarefa cadastrada com sucesso.');
      setForm((current) => ({ ...initialForm, projetoId: current.projetoId }));
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao cadastrar tarefa.');
    } finally {
      setSaving(false);
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

  return (
    <div className="page-stack">
      <PageHeader
        title="Tarefas"
        subtitle="Visão em lista ou Kanban, com filtros por atribuído a e por status."
        actions={
          <div className="header-tools">
            <select className="compact-select" value={filtroProjetoId} onChange={(e) => setFiltroProjetoId(e.target.value)}>
              <option value="">Todos os projetos</option>
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>{projeto.nome}</option>
              ))}
            </select>
            <select className="compact-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {kanbanOrder.map((status) => (
                <option key={status} value={status}>{labelize(status)}</option>
              ))}
            </select>
            <select className="compact-select" value={filtroAtribuidoA} onChange={(e) => setFiltroAtribuidoA(e.target.value)}>
              <option value="">Todos os responsáveis</option>
              {atribuidos.map((item) => (
                <option key={`${item.tipo}-${item.id}`} value={item.id}>{item.nome}</option>
              ))}
            </select>
            <div className="segmented">
              <button type="button" className={`segmented__button${viewMode === 'lista' ? ' segmented__button--active' : ''}`} onClick={() => setViewMode('lista')}>Lista</button>
              <button type="button" className={`segmented__button${viewMode === 'kanban' ? ' segmented__button--active' : ''}`} onClick={() => setViewMode('kanban')}>Kanban</button>
            </div>
          </div>
        }
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="two-columns two-columns--left-wide">
        <form className="panel form-grid" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>Nova tarefa</h3>
            <p>{projetoAtual ? `Projeto selecionado: ${projetoAtual.nome}` : 'Selecione um projeto.'}</p>
          </div>

          <div className="field field--span-2">
            <label>Projeto</label>
            <select value={form.projetoId} onChange={(e) => setForm((c) => ({ ...c, projetoId: e.target.value }))} required>
              <option value="">Selecione</option>
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>{projeto.nome}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Atribuição</label>
            <select value={form.atribuicaoTipo} onChange={(e) => setForm((c) => ({ ...c, atribuicaoTipo: e.target.value as TipoAtribuicaoTarefa }))}>
              <option value="ANALISTA">Analista</option>
              <option value="CLIENTE">Cliente</option>
            </select>
          </div>
          <div className="field">
            <label>{form.atribuicaoTipo === 'ANALISTA' ? 'Analista responsável' : 'Cliente responsável'}</label>
            {form.atribuicaoTipo === 'ANALISTA' ? (
              <select value={form.responsavelUsuarioId} onChange={(e) => setForm((c) => ({ ...c, responsavelUsuarioId: e.target.value }))}>
                <option value="">Não atribuído</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>
                ))}
              </select>
            ) : (
              <select value={form.responsavelClienteId} onChange={(e) => setForm((c) => ({ ...c, responsavelClienteId: e.target.value }))}>
                <option value="">Não atribuído</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.razaoSocial}</option>
                ))}
              </select>
            )}
          </div>

          <div className="field field--span-2">
            <label>Nome da tarefa</label>
            <input value={form.titulo} onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))} required />
          </div>

          <div className="field field--span-2">
            <label>Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} rows={3} />
          </div>
          <div className="field field--span-2">
            <label>Comentário resumido</label>
            <textarea value={form.comentarioResumo} onChange={(e) => setForm((c) => ({ ...c, comentarioResumo: e.target.value }))} rows={2} />
          </div>

          <div className="field field--span-2">
            <label>Anexo (URL por enquanto)</label>
            <input value={form.anexoUrl} onChange={(e) => setForm((c) => ({ ...c, anexoUrl: e.target.value }))} placeholder="https://..." />
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
            <label>Prazo</label>
            <input type="date" value={form.prazo} onChange={(e) => setForm((c) => ({ ...c, prazo: e.target.value }))} />
          </div>
          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.visivelCliente} onChange={(e) => setForm((c) => ({ ...c, visivelCliente: e.target.checked }))} />
              Visível para cliente
            </label>
          </div>

          <div className="field field--checkbox field--span-2">
            <label>
              <input type="checkbox" checked={form.checklistHabilitado} onChange={(e) => setForm((c) => ({ ...c, checklistHabilitado: e.target.checked }))} />
              Habilitar checklist na tarefa
            </label>
          </div>
          <div className="field field--span-2">
            <label>Checklist (um item por linha)</label>
            <textarea value={form.checklistJsonText} onChange={(e) => setForm((c) => ({ ...c, checklistJsonText: e.target.value }))} rows={3} />
          </div>
          <div className="field field--span-2">
            <label>Subtarefas (uma por linha)</label>
            <textarea value={form.subtarefasJsonText} onChange={(e) => setForm((c) => ({ ...c, subtarefasJsonText: e.target.value }))} rows={3} />
          </div>

          <button className="button" type="submit" disabled={saving || projetos.length === 0}>
            {saving ? 'Salvando...' : 'Cadastrar tarefa'}
          </button>
        </form>

        <div className="panel">
          <div className="panel__header">
            <h3>Tarefas cadastradas</h3>
            <p>{tarefas.length} tarefa(s) encontradas.</p>
          </div>

          {loading ? <LoadingBlock label="Carregando tarefas..." /> : null}
          {!loading && tarefas.length === 0 ? <EmptyState message="Cadastre tarefas para começar o acompanhamento operacional." /> : null}

          {!loading && tarefas.length > 0 && viewMode === 'lista' ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tarefa</th>
                    <th>Projeto</th>
                    <th>Atribuído a</th>
                    <th>Status</th>
                    <th>Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {tarefas.map((tarefa) => (
                    <tr key={tarefa.id}>
                      <td>
                        <strong>{tarefa.titulo}</strong>
                        <div className="table-subline">{tarefa.descricao || 'Sem descrição'}</div>
                      </td>
                      <td>{tarefa.projeto?.nome || '—'}</td>
                      <td>{nomeAtribuido(tarefa)}</td>
                      <td><span className={`status-pill status-pill--${tarefa.status.toLowerCase()}`}>{labelize(tarefa.status)}</span></td>
                      <td>{formatDate(tarefa.prazo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!loading && tarefas.length > 0 && viewMode === 'kanban' ? (
            <div className="kanban-board">
              {tarefasPorStatus.map((coluna) => (
                <div key={coluna.status} className="kanban-column">
                  <div className="kanban-column__header">
                    <h4>{labelize(coluna.status)}</h4>
                    <span>{coluna.items.length}</span>
                  </div>
                  <div className="kanban-column__body">
                    {coluna.items.length === 0 ? <div className="kanban-empty">Sem tarefas</div> : null}
                    {coluna.items.map((tarefa) => (
                      <article key={tarefa.id} className="kanban-card">
                        <div className="kanban-card__top">
                          <span className={`status-pill status-pill--${tarefa.status.toLowerCase()}`}>{labelize(tarefa.status)}</span>
                          <strong>{tarefa.titulo}</strong>
                        </div>
                        <p>{tarefa.descricao || 'Sem descrição adicional.'}</p>
                        <div className="kanban-card__meta">
                          <span>{tarefa.projeto?.nome || '—'}</span>
                          <span>{nomeAtribuido(tarefa)}</span>
                          <span>{formatDate(tarefa.prazo)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
