import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { Cliente, Contrato, Projeto, StatusProjeto, UsuarioAdmin } from '../types/api';
import { formatDate, labelize } from '../utils/format';

const COR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#64748b',
];

const initialForm = {
  interno: false,
  clienteId: '',
  contratoId: '',
  responsavelId: '',
  gerenteId: '',
  membroIds: [] as string[],
  nome: '',
  descricao: '',
  cor: '#6366f1',
  dataInicio: '',
  dataFimPrevista: '',
  status: 'PLANEJADO' as StatusProjeto,
  visivelCliente: true,
};

type ProjetoForm = typeof initialForm;
type FiltroProjeto = 'ATIVOS' | 'FINALIZADOS' | 'TODOS';

export default function ProjetosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroProjeto>('ATIVOS');
  const [form, setForm] = useState<ProjetoForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [clientesRes, contratosRes, projetosRes, usuariosRes] = await Promise.all([
        http.get<Cliente[]>('/clientes'),
        http.get<Contrato[]>('/contratos'),
        http.get<Projeto[]>('/projetos'),
        http.get<UsuarioAdmin[]>('/usuarios'),
      ]);
      setClientes(clientesRes.data);
      setContratos(contratosRes.data);
      setProjetos(projetosRes.data);
      setUsuarios(usuariosRes.data.filter((u) => u.ativo !== false));
      setSelectedId((current) => {
        if (!projetosRes.data.length) return null;
        if (current && projetosRes.data.some((item) => item.id === current)) return current;
        return projetosRes.data[0].id;
      });
    } catch (err) {
      handleApiError(err, 'Falha ao carregar projetos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const contratosDoCliente = useMemo(
    () => contratos.filter((item) => item.clienteId === form.clienteId),
    [contratos, form.clienteId],
  );

  const contratoSelecionado = useMemo(
    () => contratos.find((item) => item.id === form.contratoId) || null,
    [contratos, form.contratoId],
  );

  useEffect(() => {
    if (contratoSelecionado) {
      setForm((current) => ({
        ...current,
        dataInicio: contratoSelecionado.dataInicio.slice(0, 10),
        dataFimPrevista: contratoSelecionado.dataFim?.slice(0, 10) || '',
      }));
    }
  }, [contratoSelecionado]);

  const filteredProjetos = useMemo(() => {
    if (filtro === 'TODOS') return projetos;
    if (filtro === 'FINALIZADOS') {
      return projetos.filter((item) => item.status === 'CONCLUIDO' || item.status === 'CANCELADO');
    }
    return projetos.filter((item) => item.status !== 'CONCLUIDO' && item.status !== 'CANCELADO');
  }, [projetos, filtro]);

  const selectedProjeto = useMemo(
    () => projetos.find((item) => item.id === selectedId) || null,
    [projetos, selectedId],
  );

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  function openNewModal() {
    resetForm();
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeModal() {
    if (saving) return;
    resetForm();
    setIsModalOpen(false);
  }

  function startEdit(projeto: Projeto) {
    setSelectedId(projeto.id);
    setEditingId(projeto.id);
    setForm({
      interno: !!projeto.interno,
      clienteId: projeto.clienteId || '',
      contratoId: projeto.contratoId || '',
      responsavelId: projeto.responsavelId || '',
      gerenteId: projeto.gerenteId || '',
      membroIds: projeto.membros?.map((m) => m.usuarioId) || [],
      nome: projeto.nome,
      descricao: projeto.descricao || '',
      cor: projeto.cor || '#6366f1',
      dataInicio: projeto.dataInicio.slice(0, 10),
      dataFimPrevista: projeto.dataFimPrevista?.slice(0, 10) || '',
      status: projeto.status,
      visivelCliente: projeto.visivelCliente,
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function toggleMembro(userId: string) {
    setForm((current) => ({
      ...current,
      membroIds: current.membroIds.includes(userId)
        ? current.membroIds.filter((id) => id !== userId)
        : [...current.membroIds, userId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        interno: form.interno,
        clienteId: form.interno ? undefined : form.clienteId || undefined,
        contratoId: form.interno ? undefined : form.contratoId || undefined,
        responsavelId: form.responsavelId || undefined,
        gerenteId: form.gerenteId || undefined,
        membroIds: form.membroIds.length ? form.membroIds : undefined,
        nome: form.nome,
        descricao: form.descricao || undefined,
        cor: form.cor,
        dataInicio: form.dataInicio,
        dataFimPrevista: form.dataFimPrevista || undefined,
        status: form.status,
        visivelCliente: form.interno ? false : form.visivelCliente,
      };

      if (editingId) {
        await http.put(`/projetos/${editingId}`, payload);
        setSuccess('Projeto atualizado com sucesso.');
      } else {
        await http.post('/projetos', payload);
        setSuccess('Projeto cadastrado com sucesso.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      handleApiError(err, editingId ? 'Falha ao atualizar projeto.' : 'Falha ao cadastrar projeto.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(projeto: Projeto) {
    const confirmed = window.confirm(
      `Excluir o projeto "${projeto.nome}"? Essa ação só funciona se ele ainda não possuir tarefas ou entregáveis.`,
    );
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    try {
      await http.delete(`/projetos/${projeto.id}`);
      setSuccess('Projeto excluído com sucesso.');
      if (editingId === projeto.id) closeModal();
      await loadData();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir projeto.');
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
        title="Projetos"
        subtitle="Gerencie projetos, equipes e prazos."
        chips={loading ? [] : (() => {
          const ativos = projetos.filter((p) => p.status === 'EM_ANDAMENTO').length;
          const atrasados = projetos.filter((p) => p.status === 'EM_ANDAMENTO' && p.dataFimPrevista && new Date(p.dataFimPrevista) < new Date()).length;
          const aguardando = projetos.filter((p) => p.status === 'AGUARDANDO_CLIENTE').length;
          return [
            { label: `${ativos} em andamento` },
            ...(atrasados > 0 ? [{ label: `${atrasados} atrasado${atrasados !== 1 ? 's' : ''}`, alert: true }] : []),
            ...(aguardando > 0 ? [{ label: `${aguardando} aguardando cliente`, alert: true }] : []),
          ];
        })()}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div>
            <h3>Lista de projetos</h3>
            <p>{filteredProjetos.length} projeto(s) no filtro atual.</p>
          </div>
          <div className="header-tools">
            <div className="segmented">
              {(['ATIVOS', 'FINALIZADOS', 'TODOS'] as FiltroProjeto[]).map((item) => (
                <button
                  key={item}
                  className={`segmented__button${filtro === item ? ' segmented__button--active' : ''}`}
                  type="button"
                  onClick={() => setFiltro(item)}
                >
                  {item === 'ATIVOS' ? 'Ativos' : item === 'FINALIZADOS' ? 'Finalizados' : 'Todos'}
                </button>
              ))}
            </div>
            <div className="table-actions-toolbar">
              <button className="button button--ghost button--small" type="button" onClick={openNewModal}>Novo</button>
              <Link
                className={`button button--ghost button--small${selectedProjeto ? '' : ' button--disabled'}`}
                to={selectedProjeto ? `/projetos/${selectedProjeto.id}` : '#'}
                onClick={(event) => { if (!selectedProjeto) event.preventDefault(); }}
              >
                Abrir
              </Link>
              <button className="button button--ghost button--small" type="button" disabled={!selectedProjeto} onClick={() => selectedProjeto && startEdit(selectedProjeto)}>Editar</button>
              <button className="button button--danger button--small" type="button" disabled={!selectedProjeto} onClick={() => selectedProjeto && void handleDelete(selectedProjeto)}>Excluir</button>
            </div>
          </div>
        </div>

        {selectedProjeto ? <div className="selection-note">Selecionado: <strong>{selectedProjeto.nome}</strong></div> : null}

        {loading ? <LoadingBlock label="Carregando projetos..." /> : null}
        {!loading && filteredProjetos.length === 0 ? <EmptyState message="Nenhum projeto encontrado para este filtro." /> : null}
        {!loading && filteredProjetos.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Cliente</th>
                  <th>Equipe</th>
                  <th>Status</th>
                  <th>Contexto</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjetos.map((projeto) => (
                  <tr
                    key={projeto.id}
                    className={selectedId === projeto.id ? 'table-row--selected' : ''}
                    onClick={() => setSelectedId(projeto.id)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: projeto.cor || '#6366f1', flexShrink: 0 }} />
                        <strong>{projeto.nome}</strong>
                      </div>
                      <div className="table-subline">{formatDate(projeto.dataInicio)} até {formatDate(projeto.dataFimPrevista)}</div>
                    </td>
                    <td>{projeto.interno ? 'Projeto interno' : projeto.cliente?.razaoSocial || '—'}</td>
                    <td>
                      {projeto.gerente ? <div>{projeto.gerente.nome}</div> : null}
                      {projeto.membros?.length ? <div className="table-subline">{projeto.membros.length} membro(s)</div> : null}
                    </td>
                    <td>
                      <span className={`status-pill status-pill--${projeto.status.toLowerCase()}`}>{labelize(projeto.status)}</span>
                      <div className="table-subline">{projeto._count?.tarefas || 0} tarefa(s) · {projeto._count?.entregaveis || 0} entregável(is)</div>
                    </td>
                    <td>{projeto.visivelCliente ? 'Cliente pode visualizar' : 'Interno / restrito'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar projeto' : 'Novo projeto'}
        subtitle="Preencha os dados do projeto. Campos de datas são sincronizados automaticamente com o contrato vinculado."
        onClose={closeModal}
      >
        <form className="form-grid form-grid--4" onSubmit={handleSubmit}>

          {/* Row 1: interno flag + cor */}
          <div className="field field--checkbox field--span-3">
            <label>
              <input
                type="checkbox"
                checked={form.interno}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    interno: event.target.checked,
                    contratoId: '',
                    clienteId: '',
                    dataInicio: '',
                    dataFimPrevista: '',
                    visivelCliente: event.target.checked ? false : current.visivelCliente,
                  }))
                }
              />
              Projeto interno da empresa (sem vínculo com cliente)
            </label>
          </div>

          <div className="field">
            <label>Cor do projeto</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {COR_OPTIONS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  title={cor}
                  onClick={() => setForm((c) => ({ ...c, cor }))}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', background: cor, border: 'none',
                    cursor: 'pointer', outline: form.cor === cor ? '2px solid #fff' : 'none',
                    boxShadow: form.cor === cor ? `0 0 0 3px ${cor}` : 'none',
                  }}
                />
              ))}
              <input
                type="color"
                value={form.cor}
                onChange={(e) => setForm((c) => ({ ...c, cor: e.target.value }))}
                style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                title="Cor personalizada"
              />
            </div>
          </div>

          {/* Row 2: cliente + contrato (hidden if interno) */}
          {form.interno ? (
            <div className="field field--span-4">
              <div className="inline-info-card">
                Projeto <strong>interno</strong> — sem visibilidade para clientes e sem vínculo contratual.
              </div>
            </div>
          ) : (
            <>
              <div className="field field--span-2">
                <label>Cliente</label>
                <select
                  value={form.clienteId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      clienteId: event.target.value,
                      contratoId: '',
                      dataInicio: '',
                      dataFimPrevista: '',
                    }))
                  }
                  required={!form.interno}
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.razaoSocial}{cliente.nomeFantasia ? ` — ${cliente.nomeFantasia}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field field--span-2">
                <label>Contrato vinculado</label>
                <select
                  value={form.contratoId}
                  onChange={(event) => setForm((current) => ({ ...current, contratoId: event.target.value }))}
                >
                  <option value="">Sem vínculo contratual</option>
                  {contratosDoCliente.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.titulo}
                    </option>
                  ))}
                </select>
                {contratoSelecionado ? <small>Datas sincronizadas com o contrato.</small> : null}
              </div>
            </>
          )}

          {/* Row 3: nome do projeto */}
          <div className="field field--span-4">
            <label>Nome do projeto</label>
            <input
              value={form.nome}
              onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
              placeholder="Ex: Consultoria Tributária — 1º Semestre 2026"
              required
            />
          </div>

          {/* Row 4: gerente, responsavel, datas */}
          <div className="field">
            <label>Gerente do projeto</label>
            <select
              value={form.gerenteId}
              onChange={(e) => setForm((c) => ({ ...c, gerenteId: e.target.value }))}
            >
              <option value="">Sem gerente definido</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Responsável operacional</label>
            <select
              value={form.responsavelId}
              onChange={(e) => setForm((c) => ({ ...c, responsavelId: e.target.value }))}
            >
              <option value="">Sem responsável definido</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Data de início</label>
            <input
              type="date"
              value={form.dataInicio}
              onChange={(event) => setForm((current) => ({ ...current, dataInicio: event.target.value }))}
              required
              disabled={!form.interno && !!contratoSelecionado}
            />
          </div>

          <div className="field">
            <label>Data fim prevista</label>
            <input
              type="date"
              value={form.dataFimPrevista}
              onChange={(event) => setForm((current) => ({ ...current, dataFimPrevista: event.target.value }))}
              disabled={!form.interno && !!contratoSelecionado}
            />
          </div>

          {/* Row 5: consultores/analistas alocados */}
          <div className="field field--span-4">
            <label>Consultores / analistas alocados</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px', background: 'var(--surface-2, #f8f8f8)', borderRadius: 6, border: '1px solid var(--border)' }}>
              {usuarios.map((u) => (
                <label
                  key={u.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, padding: '2px 8px', borderRadius: 4,
                    background: form.membroIds.includes(u.id) ? 'var(--accent-bg, #eef2ff)' : 'transparent',
                    fontWeight: form.membroIds.includes(u.id) ? 600 : 400 }}
                >
                  <input
                    type="checkbox"
                    checked={form.membroIds.includes(u.id)}
                    onChange={() => toggleMembro(u.id)}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  {u.nome}
                </label>
              ))}
              {usuarios.length === 0 ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum usuário disponível.</span> : null}
            </div>
          </div>

          {/* Row 6: descrição */}
          <div className="field field--span-4">
            <label>Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
              rows={2}
              placeholder="Contexto, objetivo ou escopo resumido do projeto..."
            />
          </div>

          {/* Row 7: status, visivelCliente, submit */}
          <div className="field">
            <label>Status</label>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as StatusProjeto }))}
            >
              <option value="PLANEJADO">Planejado</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="AGUARDANDO_CLIENTE">Aguardando cliente</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div className="field field--checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.interno ? false : form.visivelCliente}
                disabled={form.interno}
                onChange={(event) => setForm((current) => ({ ...current, visivelCliente: event.target.checked }))}
              />
              Visível para cliente
            </label>
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar projeto'}
            </button>
          </div>

        </form>
      </Modal>
    </div>
  );
}
