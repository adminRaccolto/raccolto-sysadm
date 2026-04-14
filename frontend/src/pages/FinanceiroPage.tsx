import { Fragment, FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import FinanceiroNav from '../components/financeiro/FinanceiroNav';
import type { ContaGerencial, ContaPagar, Recebivel } from '../types/api';
import { formatCurrency, maskCurrencyInputBRL, parseCurrencyInputBRL } from '../utils/format';
import { monthKey, monthLabel, toDateKey, type SimulacaoFluxoItem } from '../utils/financeiro';

type FlowEvent = {
  id: string;
  contaGerencialId: string;
  contaLabel: string;
  descricao: string;
  data: string;
  valor: number;
  tipo: 'ENTRADA' | 'SAIDA';
  previsao: boolean;
  simulacao: boolean;
};

const initialSimulacaoForm = {
  descricao: '',
  contaGerencialId: '',
  tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
  valor: '',
  data: '',
};

type Tab = 'painel' | 'mensal' | 'diario';

export default function FinanceiroPage() {
  const [receber, setReceber] = useState<Recebivel[]>([]);
  const [pagar, setPagar] = useState<ContaPagar[]>([]);
  const [contas, setContas] = useState<ContaGerencial[]>([]);
  const [simulacoes, setSimulacoes] = useState<SimulacaoFluxoItem[]>(() => {
    try {
      const saved = localStorage.getItem('raccolto_simulacoes');
      return saved ? (JSON.parse(saved) as SimulacaoFluxoItem[]) : [];
    } catch { return []; }
  });
  const [simulacoesAtivas, setSimulacoesAtivas] = useState(() => {
    try { return localStorage.getItem('raccolto_simulacoes_ativas') !== 'false'; } catch { return true; }
  });
  const [selectedSimIds, setSelectedSimIds] = useState<Set<string>>(new Set());
  const [simulacaoForm, setSimulacaoForm] = useState(initialSimulacaoForm);
  const [loading, setLoading] = useState(true);
  const [savingSimulation, setSavingSimulation] = useState(false);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('painel');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Persist simulacoes and active state
  useEffect(() => {
    try { localStorage.setItem('raccolto_simulacoes', JSON.stringify(simulacoes)); } catch {}
  }, [simulacoes]);

  useEffect(() => {
    try { localStorage.setItem('raccolto_simulacoes_ativas', String(simulacoesAtivas)); } catch {}
  }, [simulacoesAtivas]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [receberResp, pagarResp, contasResp] = await Promise.all([
          http.get<{ itens: Recebivel[] }>('/financeiro/contas-receber'),
          http.get<{ itens: ContaPagar[] }>('/financeiro/contas-pagar'),
          http.get<ContaGerencial[]>('/financeiro/plano-contas'),
        ]);
        setReceber(receberResp.data.itens);
        setPagar(pagarResp.data.itens);
        setContas(contasResp.data.filter((item) => item.aceitaLancamento));
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const payload = err.response?.data?.message;
          setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Falha ao carregar painel financeiro.');
        } else {
          setError('Falha ao carregar painel financeiro.');
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // All operational events (no simulations)
  const flowEventsOp = useMemo<FlowEvent[]>(() => {
    const fromReceber = receber.map((item) => ({
      id: `rec-${item.id}`,
      contaGerencialId: item.contaGerencial?.id || item.contaGerencialId || 'sem-conta',
      contaLabel: item.contaGerencial ? `${item.contaGerencial.codigo} · ${item.contaGerencial.descricao}` : 'Sem conta gerencial',
      descricao: item.descricao,
      data: toDateKey(item.vencimento),
      valor: item.valor,
      tipo: 'ENTRADA' as const,
      previsao: item.previsao,
      simulacao: false,
    }));
    const fromPagar = pagar.map((item) => ({
      id: `pag-${item.id}`,
      contaGerencialId: item.contaGerencial?.id || 'sem-conta',
      contaLabel: item.contaGerencial ? `${item.contaGerencial.codigo} · ${item.contaGerencial.descricao}` : 'Sem conta gerencial',
      descricao: item.descricao,
      data: toDateKey(item.vencimento),
      valor: item.valor,
      tipo: 'SAIDA' as const,
      previsao: item.previsao,
      simulacao: false,
    }));
    return [...fromReceber, ...fromPagar].sort((a, b) => a.data.localeCompare(b.data));
  }, [pagar, receber]);

  // Full events — adds simulations when active
  const flowEvents = useMemo<FlowEvent[]>(() => {
    if (!simulacoesAtivas || simulacoes.length === 0) return flowEventsOp;
    const fromSimulacao = simulacoes.map((item) => ({
      id: item.id,
      contaGerencialId: item.contaGerencialId,
      contaLabel: (() => {
        const c = contas.find((conta) => conta.id === item.contaGerencialId);
        return c ? `${c.codigo} · ${c.descricao}` : 'Simulação sem conta';
      })(),
      descricao: item.descricao,
      data: toDateKey(item.data),
      valor: item.valor,
      tipo: item.tipo,
      previsao: false,
      simulacao: true,
    }));
    return [...flowEventsOp, ...fromSimulacao].sort((a, b) => a.data.localeCompare(b.data));
  }, [contas, flowEventsOp, simulacoes, simulacoesAtivas]);

  const indicadores = useMemo(() => {
    const totalReceberAberto = receber
      .filter((item) => item.status !== 'RECEBIDO' && item.status !== 'CANCELADO')
      .reduce((sum, item) => sum + item.valor, 0);
    const totalPagarAberto = pagar
      .filter((item) => item.status !== 'PAGO' && item.status !== 'CANCELADO')
      .reduce((sum, item) => sum + item.valor, 0);
    const totalSimulado = simulacoes.reduce((sum, item) => sum + (item.tipo === 'ENTRADA' ? item.valor : -item.valor), 0);
    return {
      totalReceberAberto,
      totalPagarAberto,
      saldoProjetado: totalReceberAberto - totalPagarAberto,
      totalSimulado,
    };
  }, [pagar, receber, simulacoes]);

  const meses = useMemo(() => {
    const keys = Array.from(new Set(flowEvents.map((item) => monthKey(item.data))));
    if (!keys.length) keys.push(monthKey(new Date()));
    return keys.sort();
  }, [flowEvents]);

  // Monthly grouping (includes simulations when active)
  const fluxoMensal = useMemo(() => {
    const grouped = new Map<string, { contaLabel: string; contaGerencialId: string; meses: Record<string, { real: number; previsao: number; simulacao: number }> }>();
    for (const event of flowEvents) {
      const key = event.contaGerencialId;
      const month = monthKey(event.data);
      const sign = event.tipo === 'ENTRADA' ? 1 : -1;
      const row = grouped.get(key) || { contaLabel: event.contaLabel, contaGerencialId: key, meses: {} };
      const cell = row.meses[month] || { real: 0, previsao: 0, simulacao: 0 };
      if (event.simulacao) cell.simulacao += sign * event.valor;
      else if (event.previsao) cell.previsao += sign * event.valor;
      else cell.real += sign * event.valor;
      row.meses[month] = cell;
      grouped.set(key, row);
    }
    return Array.from(grouped.values())
      .filter((row) => Object.keys(row.meses).length > 0)
      .sort((a, b) => a.contaLabel.localeCompare(b.contaLabel));
  }, [flowEvents]);

  const isImpostoLabel = (label: string) => {
    const up = label.toUpperCase();
    return up.includes('IRPJ') || up.includes('CSLL');
  };

  // Totalizadores mensais — sem simulações (operacional)
  const resultadoOpPorMes = useMemo(() => {
    const result: Record<string, number> = {};
    for (const mes of meses) {
      result[mes] = fluxoMensal
        .filter((row) => !isImpostoLabel(row.contaLabel))
        .reduce((sum, row) => {
          const cell = row.meses[mes] || { real: 0, previsao: 0, simulacao: 0 };
          return sum + cell.real + cell.previsao;
        }, 0);
    }
    return result;
  }, [fluxoMensal, meses]);

  // Totalizadores mensais — com simulações
  const resultadoComSimPorMes = useMemo(() => {
    const result: Record<string, number> = {};
    for (const mes of meses) {
      result[mes] = fluxoMensal
        .filter((row) => !isImpostoLabel(row.contaLabel))
        .reduce((sum, row) => {
          const cell = row.meses[mes] || { real: 0, previsao: 0, simulacao: 0 };
          return sum + cell.real + cell.previsao + cell.simulacao;
        }, 0);
    }
    return result;
  }, [fluxoMensal, meses]);

  const irpjPorMes = useMemo(() => {
    const result: Record<string, number> = {};
    for (const mes of meses) {
      result[mes] = fluxoMensal
        .filter((row) => row.contaLabel.toUpperCase().includes('IRPJ'))
        .reduce((sum, row) => {
          const cell = row.meses[mes] || { real: 0, previsao: 0, simulacao: 0 };
          return sum + Math.abs(cell.real + cell.previsao + cell.simulacao);
        }, 0);
    }
    return result;
  }, [fluxoMensal, meses]);

  const csllPorMes = useMemo(() => {
    const result: Record<string, number> = {};
    for (const mes of meses) {
      result[mes] = fluxoMensal
        .filter((row) => row.contaLabel.toUpperCase().includes('CSLL'))
        .reduce((sum, row) => {
          const cell = row.meses[mes] || { real: 0, previsao: 0, simulacao: 0 };
          return sum + Math.abs(cell.real + cell.previsao + cell.simulacao);
        }, 0);
    }
    return result;
  }, [fluxoMensal, meses]);

  // Lucro líquido operacional (sem simulações)
  const lucroLiquidoOpPorMes = useMemo(() => {
    const result: Record<string, number> = {};
    for (const mes of meses) {
      result[mes] = (resultadoOpPorMes[mes] ?? 0) - (irpjPorMes[mes] ?? 0) - (csllPorMes[mes] ?? 0);
    }
    return result;
  }, [resultadoOpPorMes, irpjPorMes, csllPorMes, meses]);

  // Lucro líquido com simulações
  const lucroLiquidoComSimPorMes = useMemo(() => {
    const result: Record<string, number> = {};
    for (const mes of meses) {
      result[mes] = (resultadoComSimPorMes[mes] ?? 0) - (irpjPorMes[mes] ?? 0) - (csllPorMes[mes] ?? 0);
    }
    return result;
  }, [resultadoComSimPorMes, irpjPorMes, csllPorMes, meses]);

  // Saldo acumulado operacional
  const saldoAcumuladoOp = useMemo(() => {
    let acc = 0;
    return meses.map((mes) => {
      acc += lucroLiquidoOpPorMes[mes] ?? 0;
      return acc;
    });
  }, [lucroLiquidoOpPorMes, meses]);

  // Saldo acumulado com simulações
  const saldoAcumuladoComSim = useMemo(() => {
    let acc = 0;
    return meses.map((mes) => {
      acc += lucroLiquidoComSimPorMes[mes] ?? 0;
      return acc;
    });
  }, [lucroLiquidoComSimPorMes, meses]);

  const temSimulacoes = simulacoesAtivas && simulacoes.length > 0;

  // Fluxo diário — dois saldos: operacional e total (c/ sim)
  const fluxoDiarioAgrupado = useMemo(() => {
    type DayGroup = {
      data: string;
      events: FlowEvent[];
      totalEntradas: number;
      totalSaidas: number;
      entradasOp: number;
      saidasOp: number;
      hasSimulacao: boolean;
    };
    const map = new Map<string, DayGroup>();
    for (const event of flowEvents) {
      const group: DayGroup = map.get(event.data) || { data: event.data, events: [], totalEntradas: 0, totalSaidas: 0, entradasOp: 0, saidasOp: 0, hasSimulacao: false };
      group.events.push(event);
      if (event.tipo === 'ENTRADA') group.totalEntradas += event.valor;
      else group.totalSaidas += event.valor;
      if (!event.simulacao) {
        if (event.tipo === 'ENTRADA') group.entradasOp += event.valor;
        else group.saidasOp += event.valor;
      }
      if (event.simulacao) group.hasSimulacao = true;
      map.set(event.data, group);
    }
    let saldoOpAcc = 0;
    let saldoTotalAcc = 0;
    return Array.from(map.values())
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((group) => {
        saldoOpAcc += group.entradasOp - group.saidasOp;
        saldoTotalAcc += group.totalEntradas - group.totalSaidas;
        return { ...group, saldoOp: saldoOpAcc, saldoTotal: saldoTotalAcc };
      });
  }, [flowEvents]);

  function toggleDate(date: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function openSimulationModal() {
    setSimulacaoForm(initialSimulacaoForm);
    setIsSimulationModalOpen(true);
  }

  function closeSimulationModal() {
    setIsSimulationModalOpen(false);
    setSimulacaoForm(initialSimulacaoForm);
  }

  function handleSubmitSimulation(event: FormEvent) {
    event.preventDefault();
    setSavingSimulation(true);
    try {
      const valor = parseCurrencyInputBRL(simulacaoForm.valor) ?? 0;
      setSimulacoes((current) => [
        ...current,
        {
          id: `sim-${Date.now()}-${Math.round(Math.random() * 10000)}`,
          descricao: simulacaoForm.descricao,
          contaGerencialId: simulacaoForm.contaGerencialId,
          tipo: simulacaoForm.tipo,
          valor,
          data: simulacaoForm.data,
        },
      ]);
      closeSimulationModal();
    } finally {
      setSavingSimulation(false);
    }
  }

  function toggleSimSelect(id: string) {
    setSelectedSimIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSimSelectAll() {
    setSelectedSimIds((prev) =>
      prev.size === simulacoes.length ? new Set() : new Set(simulacoes.map((s) => s.id))
    );
  }

  function deleteSelectedSimulacoes() {
    setSimulacoes((current) => current.filter((s) => !selectedSimIds.has(s.id)));
    setSelectedSimIds(new Set());
  }

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Financeiro"
        subtitle="Fluxo de caixa mensal e diário, simulação de cenários e indicadores gerenciais."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className={`button button--small${simulacoesAtivas ? '' : ' button--ghost'}`}
              type="button"
              style={simulacoesAtivas ? { background: '#7c3aed', borderColor: '#7c3aed' } : { color: '#7c3aed', borderColor: '#7c3aed' }}
              onClick={() => setSimulacoesAtivas((v) => !v)}
              title={simulacoesAtivas ? 'Simulações ativas — clique para desativar' : 'Simulações desativadas — clique para ativar'}
            >
              ◆ Simulações {simulacoesAtivas ? 'Ativas' : 'Desativadas'}
            </button>
            <button className="button button--small button--ghost" type="button" onClick={openSimulationModal}>
              + Nova simulação
            </button>
          </div>
        }
      />
      <FinanceiroNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {loading ? <LoadingBlock label="Carregando painel financeiro..." /> : null}

      {!loading ? (
        <>
          <div className="segmented">
            <button type="button" className={`segmented__button${tab === 'painel' ? ' segmented__button--active' : ''}`} onClick={() => setTab('painel')}>Painel</button>
            <button type="button" className={`segmented__button${tab === 'mensal' ? ' segmented__button--active' : ''}`} onClick={() => setTab('mensal')}>Fluxo Mensal</button>
            <button type="button" className={`segmented__button${tab === 'diario' ? ' segmented__button--active' : ''}`} onClick={() => setTab('diario')}>Fluxo Diário</button>
          </div>

          {tab === 'painel' ? (
            <>
              <section className="stats-grid stats-grid--compact">
                <div className="stat-card"><span className="stat-card__label">A receber em aberto</span><strong>{formatCurrency(indicadores.totalReceberAberto)}</strong><span className="stat-card__helper">Receitas abertas e previsões não recebidas.</span></div>
                <div className="stat-card"><span className="stat-card__label">A pagar em aberto</span><strong>{formatCurrency(indicadores.totalPagarAberto)}</strong><span className="stat-card__helper">Compromissos futuros e vencidos não pagos.</span></div>
                <div className="stat-card"><span className="stat-card__label">Saldo projetado</span><strong>{formatCurrency(indicadores.saldoProjetado)}</strong><span className="stat-card__helper">A receber menos a pagar no cenário atual.</span></div>
                <div className="stat-card"><span className="stat-card__label">Impacto das simulações</span><strong style={{ color: '#7c3aed' }}>{formatCurrency(indicadores.totalSimulado)}</strong><span className="stat-card__helper">{simulacoesAtivas ? 'Cenário ativo no fluxo.' : 'Simulações desativadas.'}</span></div>
              </section>

              {/* Grid de simulações */}
              <section className="panel panel--compact">
                <div className="panel__header panel__header--row">
                  <div>
                    <h3>Simulações</h3>
                    <p>{simulacoes.length} cenário(s) · {simulacoesAtivas ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>Ativas no fluxo</span> : <span style={{ color: '#64748b' }}>Desativadas</span>}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selectedSimIds.size > 0 && (
                      <button className="button button--danger button--small" type="button" onClick={deleteSelectedSimulacoes}>
                        Excluir selecionadas ({selectedSimIds.size})
                      </button>
                    )}
                    <button
                      className="button button--ghost button--small"
                      type="button"
                      style={simulacoesAtivas ? { color: '#7c3aed', borderColor: '#7c3aed' } : {}}
                      onClick={() => setSimulacoesAtivas((v) => !v)}
                    >
                      {simulacoesAtivas ? '◆ Desativar' : '◆ Ativar'}
                    </button>
                    <button className="button button--ghost button--small" type="button" onClick={openSimulationModal}>+ Adicionar</button>
                  </div>
                </div>
                <div className="table-wrap table-wrap--full">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          <input type="checkbox" checked={simulacoes.length > 0 && selectedSimIds.size === simulacoes.length} onChange={toggleSimSelectAll} title="Selecionar todas" />
                        </th>
                        <th>Descrição</th>
                        <th>Conta gerencial</th>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulacoes.map((item) => (
                        <tr key={item.id} style={{ opacity: simulacoesAtivas ? 1 : 0.45 }} className={selectedSimIds.has(item.id) ? 'table-row--selected' : ''}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedSimIds.has(item.id)} onChange={() => toggleSimSelect(item.id)} />
                          </td>
                          <td style={{ color: '#7c3aed', fontWeight: 600 }}>◆ {item.descricao}</td>
                          <td>{contas.find((c) => c.id === item.contaGerencialId)?.descricao || '—'}</td>
                          <td>{item.data}</td>
                          <td style={{ color: item.tipo === 'ENTRADA' ? '#0f172a' : '#c2185b', fontWeight: 600 }}>
                            {item.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                          </td>
                          <td style={{ color: '#7c3aed', fontWeight: 700 }}>{formatCurrency(item.valor)}</td>
                        </tr>
                      ))}
                      {simulacoes.length === 0 ? (
                        <tr><td colSpan={6} className="muted">Nenhuma simulação cadastrada. Use "+ Adicionar" para criar cenários.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}

          {tab === 'mensal' ? (
            <section className="panel panel--compact">
              <div className="panel__header">
                <h3>Fluxo de caixa mensal</h3>
                <p>
                  Estruturado pelo plano de contas. Valores positivos = <strong>entradas</strong>, negativos = <span style={{ color: '#c2185b' }}>saídas</span>.
                  {temSimulacoes ? <span style={{ color: '#7c3aed' }}> · ◆ Simulações ativas</span> : null}
                </p>
              </div>
              <div className="table-wrap table-wrap--full">
                <table>
                  <thead>
                    <tr>
                      <th>Conta gerencial</th>
                      {meses.map((mes) => <th key={mes}>{monthLabel(mes)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fluxoMensal.map((row) => (
                      <tr key={row.contaGerencialId}>
                        <td><strong>{row.contaLabel}</strong></td>
                        {meses.map((mes) => {
                          const cell = row.meses[mes] || { real: 0, previsao: 0, simulacao: 0 };
                          const total = cell.real + cell.previsao + cell.simulacao;
                          return (
                            <td key={mes}>
                              <div className="cash-month-cell">
                                <strong style={{ color: total < 0 ? '#c2185b' : total > 0 ? '#0f172a' : '#94a3b8' }}>{formatCurrency(total)}</strong>
                                {cell.previsao ? <div className="cash-month-cell__hint value--forecast">Prev.: {formatCurrency(cell.previsao)}</div> : null}
                                {cell.simulacao ? <div className="cash-month-cell__hint" style={{ color: '#7c3aed' }}>◆ Sim.: {formatCurrency(cell.simulacao)}</div> : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {fluxoMensal.length === 0 ? (
                      <tr><td colSpan={meses.length + 1} className="muted">Nenhuma conta com lançamento para compor o fluxo.</td></tr>
                    ) : null}
                    {fluxoMensal.length > 0 ? (
                      <>
                        <tr className="flow-total-row">
                          <td>Resultado Operacional Líquido</td>
                          {meses.map((mes) => {
                            const val = resultadoComSimPorMes[mes] ?? 0;
                            return <td key={mes} style={{ color: val < 0 ? '#c2185b' : val > 0 ? '#0f172a' : undefined }}>{formatCurrency(val)}</td>;
                          })}
                        </tr>
                        <tr className="flow-total-row">
                          <td>(-) IRPJ</td>
                          {meses.map((mes) => {
                            const val = irpjPorMes[mes] ?? 0;
                            return <td key={mes} style={{ color: val > 0 ? '#c2185b' : undefined }}>{val > 0 ? `(${formatCurrency(val)})` : '—'}</td>;
                          })}
                        </tr>
                        <tr className="flow-total-row">
                          <td>(-) CSLL</td>
                          {meses.map((mes) => {
                            const val = csllPorMes[mes] ?? 0;
                            return <td key={mes} style={{ color: val > 0 ? '#c2185b' : undefined }}>{val > 0 ? `(${formatCurrency(val)})` : '—'}</td>;
                          })}
                        </tr>
                        <tr className="flow-total-row flow-total-row--accent">
                          <td>= Lucro Líquido</td>
                          {meses.map((mes) => {
                            const val = lucroLiquidoComSimPorMes[mes] ?? 0;
                            return <td key={mes} style={{ color: val < 0 ? '#c2185b' : val > 0 ? '#0f172a' : undefined }}>{formatCurrency(val)}</td>;
                          })}
                        </tr>
                        <tr className="flow-total-row flow-total-row--accent">
                          <td>Saldo Acumulado{temSimulacoes ? <span style={{ color: '#7c3aed', fontSize: 11, marginLeft: 6 }}>◆ c/ simulações</span> : null}</td>
                          {meses.map((mes, i) => {
                            const val = (temSimulacoes ? saldoAcumuladoComSim[i] : saldoAcumuladoOp[i]) ?? 0;
                            return <td key={mes} style={{ color: temSimulacoes ? '#7c3aed' : val < 0 ? '#c2185b' : undefined, fontWeight: 700 }}>{formatCurrency(val)}</td>;
                          })}
                        </tr>
                      </>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === 'diario' ? (
            <section className="panel panel--compact">
              <div className="panel__header">
                <h3>Fluxo de caixa diário</h3>
                <p>
                  Clique no <strong>+</strong> para ver os lançamentos. &nbsp;
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>Entradas = preto</span> ·{' '}
                  <span style={{ color: '#c2185b', fontWeight: 600 }}>Saídas = magenta</span> ·{' '}
                  <span style={{ color: '#7c3aed', fontWeight: 600 }}>◆ Simulações = roxo</span>
                </p>
              </div>
              {fluxoDiarioAgrupado.length === 0 ? (
                <p className="muted">Nenhum lançamento projetado ainda.</p>
              ) : (
                <div className="table-wrap table-wrap--full">
                  <table>
                    <thead>
                      <tr>
                        <th>Data / Descrição</th>
                        <th style={{ color: '#0f172a' }}>Entradas</th>
                        <th style={{ color: '#c2185b' }}>Saídas</th>
                        <th>Saldo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fluxoDiarioAgrupado.map((group) => (
                        <Fragment key={group.data}>
                          <tr className="flow-date-row" onClick={() => toggleDate(group.data)}>
                            <td>
                              <span className="flow-date-toggle">
                                <span className="flow-date-icon">{expandedDates.has(group.data) ? '−' : '+'}</span>
                                {group.data}
                                {group.hasSimulacao ? (
                                  <span
                                    title="Esta data contém lançamentos simulados"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#7c3aed', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}
                                  >◆</span>
                                ) : null}
                              </span>
                            </td>
                            <td style={{ color: '#0f172a', fontWeight: 700 }}>
                              {group.totalEntradas > 0 ? formatCurrency(group.totalEntradas) : '—'}
                            </td>
                            <td style={{ color: '#c2185b', fontWeight: 700 }}>
                              {group.totalSaidas > 0 ? formatCurrency(group.totalSaidas) : '—'}
                            </td>
                            <td style={{ color: group.saldoTotal < 0 ? '#c2185b' : group.hasSimulacao ? '#7c3aed' : undefined, fontWeight: 700 }}>
                              {formatCurrency(group.saldoTotal)}
                            </td>
                          </tr>
                          {expandedDates.has(group.data) ? group.events.map((event) => {
                            const isSimulacao = event.simulacao;
                            const color = isSimulacao ? '#7c3aed' : event.tipo === 'ENTRADA' ? '#0f172a' : '#c2185b';
                            return (
                              <tr key={event.id} className="flow-detail-row">
                                <td>
                                  <span style={{ color }}>
                                    {isSimulacao ? '◆ ' : ''}{event.descricao}
                                  </span>
                                  <div className="table-subline">
                                    {event.contaLabel}
                                    {event.previsao ? ' · Previsão' : ''}
                                    {isSimulacao ? ' · Simulação' : ''}
                                  </div>
                                </td>
                                <td style={{ color, fontWeight: 600 }}>
                                  {event.tipo === 'ENTRADA' ? formatCurrency(event.valor) : ''}
                                </td>
                                <td style={{ color, fontWeight: 600 }}>
                                  {event.tipo === 'SAIDA' ? formatCurrency(event.valor) : ''}
                                </td>
                                <td>—</td>
                              </tr>
                            );
                          }) : null}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      <Modal
        open={isSimulationModalOpen}
        title="Nova simulação de fluxo"
        subtitle="Teste entradas e saídas em datas indicadas para observar o comportamento do caixa sem efetivar o lançamento."
        onClose={closeSimulationModal}
      >
        <form className="form-grid form-grid--wide" onSubmit={handleSubmitSimulation}>
          <div className="field field--span-2">
            <label>Descrição</label>
            <input value={simulacaoForm.descricao} onChange={(e) => setSimulacaoForm((c) => ({ ...c, descricao: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Conta gerencial</label>
            <select value={simulacaoForm.contaGerencialId} onChange={(e) => setSimulacaoForm((c) => ({ ...c, contaGerencialId: e.target.value }))} required>
              <option value="">Selecione</option>
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>{conta.codigo} · {conta.descricao}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={simulacaoForm.tipo} onChange={(e) => setSimulacaoForm((c) => ({ ...c, tipo: e.target.value as 'ENTRADA' | 'SAIDA' }))}>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
            </select>
          </div>
          <div className="field">
            <label>Data</label>
            <input type="date" value={simulacaoForm.data} onChange={(e) => setSimulacaoForm((c) => ({ ...c, data: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Valor</label>
            <input
              value={simulacaoForm.valor}
              onChange={(e) => setSimulacaoForm((c) => ({ ...c, valor: maskCurrencyInputBRL(e.target.value) }))}
              placeholder="R$ 0,00"
              required
            />
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={savingSimulation} style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
              {savingSimulation ? 'Adicionando...' : '◆ Adicionar simulação'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
