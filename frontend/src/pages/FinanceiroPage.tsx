import { Fragment, FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import FinanceiroNav from '../components/financeiro/FinanceiroNav';
import type { ContaGerencial, ContaPagar, Recebivel } from '../types/api';
import { formatCurrency } from '../utils/format';
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
  const [simulacoes, setSimulacoes] = useState<SimulacaoFluxoItem[]>([]);
  const [simulacaoForm, setSimulacaoForm] = useState(initialSimulacaoForm);
  const [loading, setLoading] = useState(true);
  const [savingSimulation, setSavingSimulation] = useState(false);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('painel');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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

  const flowEvents = useMemo<FlowEvent[]>(() => {
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
    return [...fromReceber, ...fromPagar, ...fromSimulacao].sort((a, b) => a.data.localeCompare(b.data));
  }, [contas, pagar, receber, simulacoes]);

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

  const resultadoOperacionalPorMes = useMemo(() => {
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

  const lucroLiquidoPorMes = useMemo(() => {
    const result: Record<string, number> = {};
    for (const mes of meses) {
      result[mes] = (resultadoOperacionalPorMes[mes] ?? 0) - (irpjPorMes[mes] ?? 0) - (csllPorMes[mes] ?? 0);
    }
    return result;
  }, [resultadoOperacionalPorMes, irpjPorMes, csllPorMes, meses]);

  const saldoAcumulado = useMemo(() => {
    let acc = 0;
    return meses.map((mes) => {
      acc += lucroLiquidoPorMes[mes] ?? 0;
      return acc;
    });
  }, [lucroLiquidoPorMes, meses]);

  const fluxoDiarioAgrupado = useMemo(() => {
    const map = new Map<string, { data: string; events: FlowEvent[]; totalEntradas: number; totalSaidas: number }>();
    for (const event of flowEvents) {
      const group = map.get(event.data) || { data: event.data, events: [], totalEntradas: 0, totalSaidas: 0 };
      group.events.push(event);
      if (event.tipo === 'ENTRADA') group.totalEntradas += event.valor;
      else group.totalSaidas += event.valor;
      map.set(event.data, group);
    }
    let saldoAcc = 0;
    return Array.from(map.values())
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((group) => {
        saldoAcc += group.totalEntradas - group.totalSaidas;
        return { ...group, saldo: saldoAcc };
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

  function getValueClass(event: FlowEvent) {
    if (event.simulacao) return 'value--simulation';
    if (event.previsao) return 'value--forecast';
    return '';
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
      setSimulacoes((current) => [
        ...current,
        {
          id: `sim-${Date.now()}-${Math.round(Math.random() * 10000)}`,
          descricao: simulacaoForm.descricao,
          contaGerencialId: simulacaoForm.contaGerencialId,
          tipo: simulacaoForm.tipo,
          valor: Number(simulacaoForm.valor),
          data: simulacaoForm.data,
        },
      ]);
      closeSimulationModal();
    } finally {
      setSavingSimulation(false);
    }
  }

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Financeiro"
        subtitle="Fluxo de caixa mensal e diário, simulação de cenários e indicadores gerenciais."
        actions={<button className="button button--small" type="button" onClick={openSimulationModal}>Nova simulação</button>}
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
                <div className="stat-card"><span className="stat-card__label">Impacto das simulações</span><strong>{formatCurrency(indicadores.totalSimulado)}</strong><span className="stat-card__helper">Cenário temporário sem efetivar lançamentos.</span></div>
              </section>

              <section className="panel panel--compact">
                <div className="panel__header panel__header--row">
                  <div>
                    <h3>Simulações temporárias</h3>
                    <p>Entradas e saídas simuladas não são gravadas no financeiro real.</p>
                  </div>
                  <button className="button button--ghost button--small" type="button" onClick={openSimulationModal}>Adicionar simulação</button>
                </div>
                <div className="table-wrap table-wrap--full">
                  <table>
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th>Conta gerencial</th>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Valor</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulacoes.map((item) => (
                        <tr key={item.id} className="table-row--simulation">
                          <td>{item.descricao}</td>
                          <td>{contas.find((c) => c.id === item.contaGerencialId)?.descricao || '—'}</td>
                          <td>{item.data}</td>
                          <td>{item.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</td>
                          <td>{formatCurrency(item.valor)}</td>
                          <td>
                            <button className="button button--danger button--small" type="button" onClick={() => setSimulacoes((current) => current.filter((s) => s.id !== item.id))}>Remover</button>
                          </td>
                        </tr>
                      ))}
                      {simulacoes.length === 0 ? (
                        <tr><td colSpan={6} className="muted">Nenhuma simulação cadastrada no momento.</td></tr>
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
                <p>Estruturado pelo plano de contas. Valores positivos = entradas, negativos = saídas. <span className="value--forecast">Verde = previsão</span> · <span className="value--simulation">Azul = simulação</span>.</p>
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
                                <strong className={total < 0 ? 'value--negative' : total > 0 ? 'value--positive' : ''}>{formatCurrency(total)}</strong>
                                {cell.previsao ? <div className="cash-month-cell__hint value--forecast">Prev.: {formatCurrency(cell.previsao)}</div> : null}
                                {cell.simulacao ? <div className="cash-month-cell__hint value--simulation">Sim.: {formatCurrency(cell.simulacao)}</div> : null}
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
                            const val = resultadoOperacionalPorMes[mes] ?? 0;
                            return <td key={mes} className={val < 0 ? 'value--negative' : val > 0 ? 'value--positive' : ''}>{formatCurrency(val)}</td>;
                          })}
                        </tr>
                        <tr className="flow-total-row">
                          <td>(-) IRPJ</td>
                          {meses.map((mes) => {
                            const val = irpjPorMes[mes] ?? 0;
                            return <td key={mes} className={val > 0 ? 'value--negative' : ''}>{val > 0 ? `(${formatCurrency(val)})` : '—'}</td>;
                          })}
                        </tr>
                        <tr className="flow-total-row">
                          <td>(-) CSLL</td>
                          {meses.map((mes) => {
                            const val = csllPorMes[mes] ?? 0;
                            return <td key={mes} className={val > 0 ? 'value--negative' : ''}>{val > 0 ? `(${formatCurrency(val)})` : '—'}</td>;
                          })}
                        </tr>
                        <tr className="flow-total-row flow-total-row--accent">
                          <td>= Lucro Líquido</td>
                          {meses.map((mes) => {
                            const val = lucroLiquidoPorMes[mes] ?? 0;
                            return <td key={mes} className={val < 0 ? 'value--negative' : val > 0 ? 'value--positive' : ''}>{formatCurrency(val)}</td>;
                          })}
                        </tr>
                        <tr className="flow-total-row flow-total-row--accent">
                          <td>Saldo acumulado</td>
                          {meses.map((mes, i) => {
                            const val = saldoAcumulado[i] ?? 0;
                            return <td key={mes} className={val < 0 ? 'value--negative' : ''}>{formatCurrency(val)}</td>;
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
                <p>Clique no <strong>+</strong> de uma data para ver os lançamentos. <span className="value--forecast">Verde = previsão</span> · <span className="value--simulation">Azul = simulação</span>.</p>
              </div>
              {fluxoDiarioAgrupado.length === 0 ? (
                <p className="muted">Nenhum lançamento projetado ainda.</p>
              ) : (
                <div className="table-wrap table-wrap--full">
                  <table>
                    <thead>
                      <tr>
                        <th>Data / Descrição</th>
                        <th>Entradas</th>
                        <th>Saídas</th>
                        <th>Saldo acumulado</th>
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
                              </span>
                            </td>
                            <td>{group.totalEntradas > 0 ? formatCurrency(group.totalEntradas) : '—'}</td>
                            <td>{group.totalSaidas > 0 ? formatCurrency(group.totalSaidas) : '—'}</td>
                            <td className={group.saldo < 0 ? 'value--negative' : ''}>{formatCurrency(group.saldo)}</td>
                          </tr>
                          {expandedDates.has(group.data) ? group.events.map((event) => (
                            <tr key={event.id} className="flow-detail-row">
                              <td>
                                {event.descricao}
                                <div className="table-subline">{event.contaLabel}{event.previsao ? ' · Previsão' : ''}{event.simulacao ? ' · Simulação' : ''}</div>
                              </td>
                              <td className={getValueClass(event)}>
                                {event.tipo === 'ENTRADA' ? formatCurrency(event.valor) : ''}
                              </td>
                              <td className={getValueClass(event)}>
                                {event.tipo === 'SAIDA' ? formatCurrency(event.valor) : ''}
                              </td>
                              <td>—</td>
                            </tr>
                          )) : null}
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
            <input type="number" step="0.01" value={simulacaoForm.valor} onChange={(e) => setSimulacaoForm((c) => ({ ...c, valor: e.target.value }))} required />
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={savingSimulation}>
              {savingSimulation ? 'Adicionando...' : 'Adicionar simulação'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
