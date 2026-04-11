import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import PageHeader from '../../components/PageHeader';
import type { StatusTarefa, Tarefa } from '../../types/api';
import { formatDate } from '../../utils/format';

const STATUS_LABELS: Record<StatusTarefa, string> = {
  NAO_INICIADA: 'A Iniciar',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO: 'Aguardando',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const PRIORIDADE_COR: Record<string, string> = {
  CRITICA: '#ef4444',
  ALTA: '#f97316',
  MEDIA: '#eab308',
  BAIXA: '#22c55e',
};

function PrioridadeChip({ p }: { p: string }) {
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: PRIORIDADE_COR[p] ?? '#94a3b8', flexShrink: 0 }} title={p} />
  );
}

function isAtrasada(t: Tarefa) {
  if (!t.prazo) return false;
  return new Date(t.prazo) < new Date() && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA';
}

export default function MinhasTarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroProjeto, setFiltroProjeto] = useState<string>('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await http.get<Tarefa[]>('/tarefas/minhas');
      setTarefas(res.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Falha ao carregar tarefas.');
      }
    } finally {
      setLoading(false);
    }
  }

  const projetos = useMemo(() => {
    const map = new Map<string, string>();
    tarefas.forEach((t) => {
      if (t.projeto) map.set(t.projeto.id, t.projeto.nome);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [tarefas]);

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtroStatus && t.status !== filtroStatus) return false;
      if (filtroProjeto && t.projeto?.id !== filtroProjeto) return false;
      return true;
    });
  }, [tarefas, filtroStatus, filtroProjeto]);

  const grupos: Record<string, Tarefa[]> = useMemo(() => {
    const g: Record<string, Tarefa[]> = { atrasadas: [], hoje: [], proximas: [], restantes: [] };
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(23, 59, 59, 999);
    const em7 = new Date();
    em7.setDate(em7.getDate() + 7);
    em7.setHours(23, 59, 59, 999);

    filtradas.forEach((t) => {
      if (isAtrasada(t)) { g.atrasadas.push(t); return; }
      if (t.prazo && new Date(t.prazo) <= hoje) { g.hoje.push(t); return; }
      if (t.prazo && new Date(t.prazo) <= em7) { g.proximas.push(t); return; }
      g.restantes.push(t);
    });
    return g;
  }, [filtradas]);

  const atrasadasCount = tarefas.filter(isAtrasada).length;

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Minhas Tarefas"
        subtitle="Tarefas atribuídas a você em todos os projetos."
      />

      {error ? <Feedback type="error" message={error} /> : null}

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        {(['NAO_INICIADA', 'EM_ANDAMENTO', 'AGUARDANDO'] as StatusTarefa[]).map((s) => {
          const cnt = tarefas.filter((t) => t.status === s).length;
          return (
            <button
              key={s}
              type="button"
              className={`badge ${filtroStatus === s ? 'badge--primary' : 'badge--muted'}`}
              style={{ cursor: 'pointer', border: 'none', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}
              onClick={() => setFiltroStatus(filtroStatus === s ? '' : s)}
            >
              {STATUS_LABELS[s]} · {cnt}
            </button>
          );
        })}
        {atrasadasCount > 0 && (
          <span className="badge badge--error" style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
            {atrasadasCount} atrasada{atrasadasCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select
          value={filtroProjeto}
          onChange={(e) => setFiltroProjeto(e.target.value)}
          style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <option value="">Todos os projetos</option>
          {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {loading ? <LoadingBlock label="Carregando tarefas..." /> : null}

      {!loading && filtradas.length === 0 && (
        <EmptyState message="Nenhuma tarefa pendente atribuída a você." />
      )}

      {!loading && filtradas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grupos.atrasadas.length > 0 && (
            <GrupoTarefas titulo="Atrasadas" tarefas={grupos.atrasadas} corTitulo="#ef4444" />
          )}
          {grupos.hoje.length > 0 && (
            <GrupoTarefas titulo="Vencem hoje" tarefas={grupos.hoje} corTitulo="#f97316" />
          )}
          {grupos.proximas.length > 0 && (
            <GrupoTarefas titulo="Próximos 7 dias" tarefas={grupos.proximas} corTitulo="#6366f1" />
          )}
          {grupos.restantes.length > 0 && (
            <GrupoTarefas titulo="Demais tarefas" tarefas={grupos.restantes} corTitulo="var(--muted)" />
          )}
        </div>
      )}
    </div>
  );
}

function GrupoTarefas({ titulo, tarefas, corTitulo }: { titulo: string; tarefas: Tarefa[]; corTitulo: string }) {
  return (
    <section className="panel panel--compact">
      <div className="panel__header">
        <h3 style={{ color: corTitulo, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {titulo} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({tarefas.length})</span>
        </h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 8 }}></th>
              <th>Tarefa</th>
              <th>Projeto</th>
              <th>Etapa</th>
              <th>Status</th>
              <th>Prazo</th>
              <th>Horas</th>
            </tr>
          </thead>
          <tbody>
            {tarefas.map((t) => (
              <tr key={t.id}>
                <td><PrioridadeChip p={t.prioridade} /></td>
                <td>
                  <Link
                    to={`/projetos/${t.projetoId}/tarefas/${t.id}`}
                    style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    {t.titulo}
                  </Link>
                  {t.labels && t.labels.length > 0 && (
                    <span style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}>
                      {t.labels.map(({ label }) => (
                        <span key={label.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: label.cor + '33', color: label.cor, fontWeight: 600 }}>
                          {label.nome}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td>
                  <Link to={`/projetos/${t.projetoId}`} style={{ color: 'var(--muted)', fontSize: 12, textDecoration: 'none' }}>
                    {t.projeto?.nome ?? '—'}
                  </Link>
                </td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{t.etapa?.nome ?? '—'}</td>
                <td>
                  <span className={`badge ${t.status === 'CONCLUIDA' ? 'badge--success' : t.status === 'EM_ANDAMENTO' ? 'badge--primary' : 'badge--muted'}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: isAtrasada(t) ? '#ef4444' : 'inherit', fontWeight: isAtrasada(t) ? 600 : 400 }}>
                  {t.prazo ? formatDate(t.prazo) : '—'}
                </td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {t.estimativaHoras ? `${t.horasRegistradas ?? 0}h / ${t.estimativaHoras}h` : t.horasRegistradas ? `${t.horasRegistradas}h` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
