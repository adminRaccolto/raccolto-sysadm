import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import type { Entregavel, Projeto, StatusEntregavel, TipoEntregavel } from '../types/api';
import { formatDate, labelize } from '../utils/format';

const initialForm = {
  projetoId: '',
  titulo: '',
  tipo: 'RELATORIO' as TipoEntregavel,
  descricao: '',
  dataPrevista: '',
  status: 'PLANEJADO' as StatusEntregavel,
  visivelCliente: true,
  observacaoInterna: '',
  observacaoCliente: '',
};

export default function EntregaveisPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [entregaveis, setEntregaveis] = useState<Entregavel[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filtroProjetoId, setFiltroProjetoId] = useState('');

  async function loadData(projectId?: string) {
    setLoading(true);
    setError(null);
    try {
      const [projetosResponse, entregaveisResponse] = await Promise.all([
        http.get<Projeto[]>('/projetos'),
        http.get<Entregavel[]>('/entregaveis', {
          params: projectId ? { projetoId: projectId } : undefined,
        }),
      ]);
      setProjetos(projetosResponse.data);
      setEntregaveis(entregaveisResponse.data);
      setForm((current) => ({
        ...current,
        projetoId: current.projetoId || projetosResponse.data[0]?.id || '',
      }));
    } catch (err) {
      handleApiError(err, 'Falha ao carregar entregáveis.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (loading) return;
    void loadData(filtroProjetoId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroProjetoId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await http.post('/entregaveis', {
        projetoId: form.projetoId,
        titulo: form.titulo,
        tipo: form.tipo,
        descricao: form.descricao || undefined,
        dataPrevista: form.dataPrevista || undefined,
        status: form.status,
        visivelCliente: form.visivelCliente,
        observacaoInterna: form.observacaoInterna || undefined,
        observacaoCliente: form.observacaoCliente || undefined,
      });
      setSuccess('Entregável cadastrado com sucesso.');
      setForm((current) => ({ ...initialForm, projetoId: current.projetoId }));
      await loadData(filtroProjetoId || undefined);
    } catch (err) {
      handleApiError(err, 'Falha ao cadastrar entregável.');
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
        title="Entregáveis"
        subtitle="Controle o que será entregue, quando e com que nível de visibilidade para o cliente."
        actions={
          <select
            className="compact-select"
            value={filtroProjetoId}
            onChange={(event) => setFiltroProjetoId(event.target.value)}
          >
            <option value="">Todos os projetos</option>
            {projetos.map((projeto) => (
              <option key={projeto.id} value={projeto.id}>
                {projeto.nome}
              </option>
            ))}
          </select>
        }
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="two-columns two-columns--left-wide">
        <form className="panel form-grid" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>Novo entregável</h3>
            <p>Relatório, apresentação, planilha ou qualquer outra entrega formal do projeto.</p>
          </div>

          <div className="field field--span-2">
            <label>Projeto</label>
            <select
              value={form.projetoId}
              onChange={(event) => setForm((current) => ({ ...current, projetoId: event.target.value }))}
              required
            >
              <option value="">Selecione</option>
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="field field--span-2">
            <label>Título</label>
            <input
              value={form.titulo}
              onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label>Tipo</label>
            <select
              value={form.tipo}
              onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value as TipoEntregavel }))}
            >
              <option value="RELATORIO">Relatório</option>
              <option value="PLANILHA">Planilha</option>
              <option value="APRESENTACAO">Apresentação</option>
              <option value="PARECER">Parecer</option>
              <option value="REUNIAO">Reunião</option>
              <option value="DOCUMENTO">Documento</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>

          <div className="field">
            <label>Status</label>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as StatusEntregavel }))
              }
            >
              <option value="PLANEJADO">Planejado</option>
              <option value="EM_PRODUCAO">Em produção</option>
              <option value="EM_REVISAO">Em revisão</option>
              <option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div className="field field--span-2">
            <label>Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
              rows={3}
            />
          </div>

          <div className="field">
            <label>Data prevista</label>
            <input
              type="date"
              value={form.dataPrevista}
              onChange={(event) => setForm((current) => ({ ...current, dataPrevista: event.target.value }))}
            />
          </div>

          <div className="field field--checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.visivelCliente}
                onChange={(event) =>
                  setForm((current) => ({ ...current, visivelCliente: event.target.checked }))
                }
              />
              Visível para cliente
            </label>
          </div>

          <div className="field field--span-2">
            <label>Observação interna</label>
            <textarea
              value={form.observacaoInterna}
              onChange={(event) =>
                setForm((current) => ({ ...current, observacaoInterna: event.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="field field--span-2">
            <label>Observação para cliente</label>
            <textarea
              value={form.observacaoCliente}
              onChange={(event) =>
                setForm((current) => ({ ...current, observacaoCliente: event.target.value }))
              }
              rows={2}
            />
          </div>

          <button className="button" type="submit" disabled={saving || projetos.length === 0}>
            {saving ? 'Salvando...' : 'Cadastrar entregável'}
          </button>
        </form>

        <div className="panel">
          <div className="panel__header">
            <h3>Entregáveis registrados</h3>
            <p>{entregaveis.length} entregável(is) encontrados.</p>
          </div>

          {loading ? <LoadingBlock label="Carregando entregáveis..." /> : null}
          {!loading && entregaveis.length === 0 ? (
            <EmptyState message="Cadastre entregáveis para organizar as saídas formais do projeto." />
          ) : null}

          {!loading && entregaveis.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Projeto</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Previsto</th>
                  </tr>
                </thead>
                <tbody>
                  {entregaveis.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.titulo}</strong>
                        <div className="table-subline">{item.descricao || 'Sem descrição'}</div>
                      </td>
                      <td>{item.projeto?.nome || '—'}</td>
                      <td>{labelize(item.tipo)}</td>
                      <td>{labelize(item.status)}</td>
                      <td>{formatDate(item.dataPrevista)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
