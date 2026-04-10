import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { Cliente, Contrato, Projeto, StatusProjeto } from '../types/api';
import { formatDate, labelize } from '../utils/format';

const initialForm = {
  interno: false,
  clienteId: '',
  contratoId: '',
  nome: '',
  descricao: '',
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
      const [clientesResponse, contratosResponse, projetosResponse] = await Promise.all([
        http.get<Cliente[]>('/clientes'),
        http.get<Contrato[]>('/contratos'),
        http.get<Projeto[]>('/projetos'),
      ]);
      setClientes(clientesResponse.data);
      setContratos(contratosResponse.data);
      setProjetos(projetosResponse.data);
      setSelectedId((current) => {
        if (!projetosResponse.data.length) return null;
        if (current && projetosResponse.data.some((item) => item.id === current)) return current;
        return projetosResponse.data[0].id;
      });
      setForm((current) => ({
        ...current,
        clienteId: current.clienteId || clientesResponse.data[0]?.id || '',
      }));
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
    setForm((current) => ({
      ...initialForm,
      clienteId: current.clienteId || clientes[0]?.id || '',
    }));
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
      clienteId: projeto.clienteId,
      contratoId: projeto.contratoId || '',
      nome: projeto.nome,
      descricao: projeto.descricao || '',
      dataInicio: projeto.dataInicio.slice(0, 10),
      dataFimPrevista: projeto.dataFimPrevista?.slice(0, 10) || '',
      status: projeto.status,
      visivelCliente: projeto.visivelCliente,
    });
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
      const payload = {
        interno: form.interno,
        clienteId: form.interno ? undefined : form.clienteId,
        contratoId: form.interno ? undefined : form.contratoId || undefined,
        nome: form.nome,
        descricao: form.descricao || undefined,
        dataInicio: form.dataInicio,
        dataFimPrevista: form.dataFimPrevista || undefined,
        status: form.status,
        visivelCliente: form.interno ? false : form.visivelCliente,
      };

      if (editingId) {
        await http.put(`/projetos/${editingId}`, payload);
        setSuccess(form.interno ? 'Projeto interno atualizado com sucesso.' : 'Projeto atualizado com sucesso.');
      } else {
        await http.post('/projetos', payload);
        setSuccess(form.interno ? 'Projeto interno cadastrado com sucesso.' : 'Projeto cadastrado com sucesso.');
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
        subtitle="A lista de projetos fica visível na tela, com ações centrais e formulário de novo/edição em modal."
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
              <Link className={`button button--ghost button--small${selectedProjeto ? '' : ' button--disabled'}`} to={selectedProjeto ? `/projetos/${selectedProjeto.id}` : '#'} onClick={(event) => { if (!selectedProjeto) event.preventDefault(); }}>
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
                      <strong>{projeto.nome}</strong>
                      <div className="table-subline">{formatDate(projeto.dataInicio)} até {formatDate(projeto.dataFimPrevista)}</div>
                    </td>
                    <td>{projeto.interno ? 'Projeto interno Raccolto' : projeto.cliente?.razaoSocial || '—'}</td>
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
        subtitle="Crie projetos externos para clientes ou um projeto interno da própria empresa."
        onClose={closeModal}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field field--checkbox field--span-2">
            <label>
              <input
                type="checkbox"
                checked={form.interno}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    interno: event.target.checked,
                    contratoId: '',
                    dataInicio: event.target.checked ? '' : current.dataInicio,
                    dataFimPrevista: event.target.checked ? '' : current.dataFimPrevista,
                    visivelCliente: event.target.checked ? false : current.visivelCliente,
                  }))
                }
              />
              Projeto interno da empresa
            </label>
          </div>

          {form.interno ? (
            <div className="field field--span-2">
              <label>Destino do projeto</label>
              <div className="inline-info-card">
                O projeto será criado como <strong>interno</strong>, usando a própria Raccolto como referência operacional e sem visibilidade para clientes.
              </div>
            </div>
          ) : (
            <>
              <div className="field">
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
                  <option value="">Selecione</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Contrato</label>
                <select
                  value={form.contratoId}
                  onChange={(event) => setForm((current) => ({ ...current, contratoId: event.target.value }))}
                >
                  <option value="">Sem vínculo contratual específico</option>
                  {contratosDoCliente.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.titulo}
                    </option>
                  ))}
                </select>
                {contratoSelecionado ? <small>As datas do projeto serão herdadas automaticamente do contrato selecionado.</small> : null}
              </div>
            </>
          )}

          <div className="field field--span-2">
            <label>Nome do projeto</label>
            <input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} required />
          </div>

          <div className="field field--span-2">
            <label>Descrição</label>
            <textarea value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} rows={3} />
          </div>

          <div className="field">
            <label>Data de início</label>
            <input type="date" value={form.dataInicio} onChange={(event) => setForm((current) => ({ ...current, dataInicio: event.target.value }))} required disabled={!form.interno && !!contratoSelecionado} />
          </div>

          <div className="field">
            <label>Data fim prevista</label>
            <input type="date" value={form.dataFimPrevista} onChange={(event) => setForm((current) => ({ ...current, dataFimPrevista: event.target.value }))} disabled={!form.interno && !!contratoSelecionado} />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as StatusProjeto }))}>
              <option value="PLANEJADO">Planejado</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="AGUARDANDO_CLIENTE">Aguardando cliente</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.interno ? false : form.visivelCliente} disabled={form.interno} onChange={(event) => setForm((current) => ({ ...current, visivelCliente: event.target.checked }))} />
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
