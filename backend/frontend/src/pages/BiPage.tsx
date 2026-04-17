import { useEffect, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDate } from '../utils/format';

type Tendencia = { label: string; recebido: number; faturado: number };
type TopCliente = { nome: string; valor: number };
type ProximoVenc = { id: string; descricao: string; valor: number; vencimento: string; cliente?: { razaoSocial: string } | null };

type BiData = {
  financeiro: {
    recebiveisEmAberto: { count: number; valor: number };
    recebiveisVencidos: { count: number; valor: number };
    recebidoMesAtual: number;
    recebidoMesAnterior: number;
    faturadoMesAtual: { count: number; valor: number };
    faturadoMesAnterior: number;
    proximosVencimentos: ProximoVenc[];
  };
  contratos: { ativos: number; aVencer30: number; aVencer60: number };
  projetos: { ativos: number; aguardandoCliente: number; atrasados: number; tarefasAtraso: number; entregaveisPendentes: number };
  clientes: { ativos: number; novos30: number };
  propostas: { abertas: number };
  tendenciaReceita: Tendencia[];
  topClientes: TopCliente[];
};

function variacao(atual: number, anterior: number): { valor: number; positivo: boolean } {
  if (!anterior) return { valor: 0, positivo: true };
  return { valor: Math.round(((atual - anterior) / anterior) * 100), positivo: atual >= anterior };
}

function BarChart({ itens, max }: { itens: { label: string; value: number; color?: string }[]; max: number }) {
  return (
    <div className="bi-bar-chart">
      {itens.map((it) => (
        <div key={it.label} className="bi-bar-chart__row">
          <span className="bi-bar-chart__label">{it.label}</span>
          <div className="bi-bar-chart__track">
            <div
              className="bi-bar-chart__fill"
              style={{
                width: max > 0 ? `${Math.round((it.value / max) * 100)}%` : '0%',
                background: it.color || 'var(--primary)',
              }}
            />
          </div>
          <span className="bi-bar-chart__value">{formatCurrency(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  label, value, sub, alert, small,
}: { label: string; value: string | number; sub?: string; alert?: boolean; small?: boolean }) {
  return (
    <div className={`bi-kpi${alert ? ' bi-kpi--alert' : ''}`}>
      <span className="bi-kpi__label">{label}</span>
      <strong className={`bi-kpi__value${small ? ' bi-kpi__value--sm' : ''}`}>{value}</strong>
      {sub ? <span className="bi-kpi__sub">{sub}</span> : null}
    </div>
  );
}

function Delta({ atual, anterior }: { atual: number; anterior: number }) {
  const { valor, positivo } = variacao(atual, anterior);
  if (!valor) return null;
  return (
    <span className={`bi-delta${positivo ? ' bi-delta--up' : ' bi-delta--down'}`}>
      {positivo ? '▲' : '▼'} {Math.abs(valor)}% vs mês anterior
    </span>
  );
}

export default function BiPage() {
  const [data, setData] = useState<BiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    http.get<BiData>('/dashboard/bi')
      .then((r) => setData(r.data))
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || 'Falha ao carregar BI.');
        } else {
          setError('Falha ao carregar BI.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const maxTendencia = data
    ? Math.max(...data.tendenciaReceita.map((t) => Math.max(t.recebido, t.faturado)), 1)
    : 1;

  const maxTopCliente = data
    ? Math.max(...data.topClientes.map((c) => c.valor), 1)
    : 1;

  return (
    <div className="page-stack">
      <PageHeader
        title="BI — Painel Gerencial"
        subtitle="Indicadores financeiros e operacionais consolidados da empresa."
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {loading ? <LoadingBlock label="Carregando indicadores..." /> : null}

      {!loading && data ? (
        <>
          {/* ── Financeiro ──────────────────────────────────────────────── */}
          <section className="panel">
            <div className="panel__header">
              <h3>Financeiro</h3>
              <p>Receitas, faturamento e recebíveis do período.</p>
            </div>
            <div className="bi-kpi-grid">
              <KpiCard
                label="Faturado este mês"
                value={formatCurrency(data.financeiro.faturadoMesAtual.valor)}
                sub={`${data.financeiro.faturadoMesAtual.count} NFS-e emitida(s)`}
              />
              <KpiCard
                label="Recebido este mês"
                value={formatCurrency(data.financeiro.recebidoMesAtual)}
                sub={<Delta atual={data.financeiro.recebidoMesAtual} anterior={data.financeiro.recebidoMesAnterior} /> as any}
              />
              <KpiCard
                label="A receber (em aberto)"
                value={formatCurrency(data.financeiro.recebiveisEmAberto.valor)}
                sub={`${data.financeiro.recebiveisEmAberto.count} lançamento(s)`}
              />
              <KpiCard
                label="Vencidos"
                value={formatCurrency(data.financeiro.recebiveisVencidos.valor)}
                sub={`${data.financeiro.recebiveisVencidos.count} lançamento(s)`}
                alert={data.financeiro.recebiveisVencidos.count > 0}
              />
            </div>
          </section>

          {/* ── Tendência 6 meses ───────────────────────────────────────── */}
          <section className="panel">
            <div className="panel__header">
              <h3>Tendência — últimos 6 meses</h3>
              <p>Comparativo entre faturado (NFS-e) e efetivamente recebido.</p>
            </div>
            <div className="bi-trend">
              <div className="bi-trend__legend">
                <span><i style={{ background: 'var(--primary)' }} />Faturado</span>
                <span><i style={{ background: 'var(--success, #2d7a3a)' }} />Recebido</span>
              </div>
              {data.tendenciaReceita.map((t) => (
                <div key={t.label} className="bi-trend__month">
                  <span className="bi-trend__month-label">{t.label}</span>
                  <div className="bi-trend__bars">
                    <div className="bi-trend__bar-wrap" title={`Faturado: ${formatCurrency(t.faturado)}`}>
                      <div
                        className="bi-trend__bar bi-trend__bar--faturado"
                        style={{ height: `${Math.round((t.faturado / maxTendencia) * 80)}px` }}
                      />
                    </div>
                    <div className="bi-trend__bar-wrap" title={`Recebido: ${formatCurrency(t.recebido)}`}>
                      <div
                        className="bi-trend__bar bi-trend__bar--recebido"
                        style={{ height: `${Math.round((t.recebido / maxTendencia) * 80)}px` }}
                      />
                    </div>
                  </div>
                  <span className="bi-trend__month-val">{formatCurrency(t.faturado)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="two-columns">
            {/* ── Operacional ─────────────────────────────────────────── */}
            <section className="panel">
              <div className="panel__header">
                <h3>Operacional</h3>
                <p>Projetos, tarefas e contratos.</p>
              </div>
              <div className="bi-kpi-grid bi-kpi-grid--2">
                <KpiCard label="Contratos ativos" value={data.contratos.ativos} />
                <KpiCard
                  label="A vencer em 30 dias"
                  value={data.contratos.aVencer30}
                  alert={data.contratos.aVencer30 > 0}
                  sub="contratos"
                />
                <KpiCard label="Projetos em andamento" value={data.projetos.ativos} />
                <KpiCard
                  label="Aguardando cliente"
                  value={data.projetos.aguardandoCliente}
                  alert={data.projetos.aguardandoCliente > 0}
                />
                <KpiCard
                  label="Tarefas em atraso"
                  value={data.projetos.tarefasAtraso}
                  alert={data.projetos.tarefasAtraso > 0}
                />
                <KpiCard label="Entregáveis pendentes" value={data.projetos.entregaveisPendentes} />
                <KpiCard label="Clientes ativos" value={data.clientes.ativos} />
                <KpiCard label="Novos clientes (30 d)" value={data.clientes.novos30} />
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <KpiCard label="Propostas abertas" value={data.propostas.abertas} small />
              </div>
            </section>

            {/* ── Top clientes ────────────────────────────────────────── */}
            <section className="panel">
              <div className="panel__header">
                <h3>Top 5 clientes</h3>
                <p>Por valor de contratos ativos.</p>
              </div>
              {data.topClientes.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>Nenhum contrato ativo encontrado.</p>
              ) : (
                <BarChart
                  max={maxTopCliente}
                  itens={data.topClientes.map((c) => ({ label: c.nome, value: c.valor }))}
                />
              )}
            </section>
          </div>

          {/* ── Próximos vencimentos ────────────────────────────────────── */}
          {data.financeiro.proximosVencimentos.length > 0 && (
            <section className="panel">
              <div className="panel__header">
                <h3>Próximos vencimentos</h3>
                <p>Recebíveis em aberto nos próximos 30 dias.</p>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Cliente</th>
                      <th>Vencimento</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.financeiro.proximosVencimentos.map((v) => (
                      <tr key={v.id}>
                        <td>{v.descricao}</td>
                        <td>{v.cliente?.razaoSocial || '—'}</td>
                        <td>{formatDate(v.vencimento)}</td>
                        <td><strong>{formatCurrency(v.valor)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
