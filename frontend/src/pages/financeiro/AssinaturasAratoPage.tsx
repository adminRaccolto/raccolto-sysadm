import { FormEvent, useEffect, useState } from 'react';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import FinanceiroNav from '../../components/financeiro/FinanceiroNav';
import type { AssinaturaArato, Cliente, ContaGerencial, ProdutoServico, Recebivel } from '../../types/api';
import { formatCurrency, formatDate, maskCurrencyInputBRL, parseCurrencyInputBRL } from '../../utils/format';

const statusLabel: Record<string, string> = {
  ATIVA: 'Ativa',
  SUSPENSA: 'Suspensa',
  CANCELADA: 'Cancelada',
};

const recebivelStatusLabel: Record<string, string> = {
  ABERTO: 'Aberto',
  PARCIALMENTE_RECEBIDO: 'Parcial',
  RECEBIDO: 'Recebido',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
};

const initialForm = {
  clienteId: '',
  produtoServicoId: '',
  contaGerencialId: '',
  valorMensal: '',
  diaVencimento: '10',
  dataInicio: '',
};

type FormState = typeof initialForm;

export default function AssinaturasAratoPage() {
  const [items, setItems] = useState<AssinaturaArato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [contas, setContas] = useState<ContaGerencial[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagarModal, setPagarModal] = useState<{ parcela: Recebivel; assinaturaId: string } | null>(null);
  const [pagarForm, setPagarForm] = useState({ dataPagamento: '', valorPago: '' });

  async function load() {
    setLoading(true);
    try {
      const [assResp, clientesResp, produtosResp, contasResp] = await Promise.all([
        http.get<AssinaturaArato[]>('/assinaturas-arato'),
        http.get<Cliente[]>('/clientes'),
        http.get<{ itens: ProdutoServico[] }>('/produtos-servicos'),
        http.get<ContaGerencial[]>('/financeiro/contas-gerenciais'),
      ]);
      setItems(assResp.data);
      setClientes(clientesResp.data);
      setProdutos((produtosResp.data as any)?.itens ?? produtosResp.data as any);
      setContas((contasResp.data as ContaGerencial[]).filter((c) => c.aceitaLancamento && c.tipo === 'RECEITA'));
    } catch {
      setError('Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  async function loadOne(id: string): Promise<AssinaturaArato | null> {
    try {
      const r = await http.get<AssinaturaArato>(`/assinaturas-arato/${id}`);
      return r.data;
    } catch {
      return null;
    }
  }

  useEffect(() => { void load(); }, []);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await http.post('/assinaturas-arato', {
        clienteId: form.clienteId,
        produtoServicoId: form.produtoServicoId,
        contaGerencialId: form.contaGerencialId || undefined,
        valorMensal: parseCurrencyInputBRL(form.valorMensal),
        diaVencimento: Number(form.diaVencimento),
        dataInicio: form.dataInicio,
      });
      setSuccess('Assinatura criada com sucesso. 12 parcelas geradas.');
      setIsModalOpen(false);
      setForm(initialForm);
      void load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao criar assinatura.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(id: string, action: 'enviar-aviso' | 'suspender' | 'reativar') {
    setActionLoading(`${id}-${action}`);
    setError(null);
    try {
      const r = await http.post<{ message: string }>(`/assinaturas-arato/${id}/${action}`);
      setSuccess(r.data.message);
      void load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro na operação.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    const detail = await loadOne(id);
    if (detail) {
      setItems((prev) => prev.map((a) => a.id === id ? { ...a, recebiveis: detail.recebiveis } : a));
    }
    setExpanded(id);
  }

  async function handlePagarParcela(e: FormEvent) {
    e.preventDefault();
    if (!pagarModal) return;
    setActionLoading('pagar');
    setError(null);
    try {
      await http.post(`/assinaturas-arato/parcela/${pagarModal.parcela.id}/pagar`, {
        dataPagamento: pagarForm.dataPagamento,
        valorPago: parseCurrencyInputBRL(pagarForm.valorPago) || undefined,
      });
      setSuccess('Parcela registrada como recebida.');
      setPagarModal(null);
      setPagarForm({ dataPagamento: '', valorPago: '' });
      const updated = await loadOne(pagarModal.assinaturaId);
      if (updated) {
        setItems((prev) => prev.map((a) => a.id === updated.id
          ? { ...a, ...updated, recebiveis: updated.recebiveis }
          : a,
        ));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao registrar pagamento.');
    } finally {
      setActionLoading(null);
    }
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="page-root">
      <PageHeader title="Assinaturas Arato" />
      <FinanceiroNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <div className="page-actions">
        <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>Nova Assinatura</button>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="Nenhuma assinatura cadastrada." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Valor/mês</th>
                <th>Início</th>
                <th>Venc. dia</th>
                <th>Parcelas vencidas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <>
                  <tr
                    key={item.id}
                    className={`data-table__row${expanded === item.id ? ' data-table__row--expanded' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => void handleToggleExpand(item.id)}
                  >
                    <td>{item.cliente.nomeFantasia || item.cliente.razaoSocial}</td>
                    <td>{item.produtoServico.nome}</td>
                    <td>{formatCurrency(item.valorMensal)}</td>
                    <td>{formatDate(item.dataInicio)}</td>
                    <td>Todo dia {item.diaVencimento}</td>
                    <td>
                      {(item.parcelasVencidas ?? 0) > 0 ? (
                        <span className="status-chip status-chip--danger">
                          {item.parcelasVencidas} em atraso
                        </span>
                      ) : (
                        <span className="status-chip status-chip--ok">Em dia</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-chip ${item.status === 'ATIVA' ? 'status-chip--ok' : item.status === 'SUSPENSA' ? 'status-chip--danger' : 'status-chip--neutral'}`}>
                        {statusLabel[item.status]}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="btn-group">
                        {(item.parcelasVencidas ?? 0) >= 3 && !item.avisoEnviado && (
                          <button
                            className="btn btn--sm btn--warning"
                            disabled={actionLoading === `${item.id}-enviar-aviso`}
                            onClick={() => void handleAction(item.id, 'enviar-aviso')}
                          >
                            Enviar Aviso
                          </button>
                        )}
                        {item.status === 'ATIVA' && (item.parcelasVencidas ?? 0) >= 3 && (
                          <button
                            className="btn btn--sm btn--danger"
                            disabled={actionLoading === `${item.id}-suspender`}
                            onClick={() => void handleAction(item.id, 'suspender')}
                          >
                            Suspender
                          </button>
                        )}
                        {item.status === 'SUSPENSA' && (
                          <button
                            className="btn btn--sm btn--primary"
                            disabled={actionLoading === `${item.id}-reativar`}
                            onClick={() => void handleAction(item.id, 'reativar')}
                          >
                            Reativar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === item.id && item.recebiveis && (
                    <tr key={`${item.id}-parcelas`}>
                      <td colSpan={8} className="data-table__sub">
                        <table className="data-table data-table--inner">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Vencimento</th>
                              <th>Valor</th>
                              <th>Status</th>
                              <th>Pago em</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.recebiveis.map((p) => (
                              <tr key={p.id}>
                                <td>{p.parcelaNumero}</td>
                                <td>
                                  {formatDate(p.vencimento)}
                                  {p.status !== 'RECEBIDO' && p.status !== 'CANCELADO' && new Date(p.vencimento) < hoje && (
                                    <span className="status-chip status-chip--danger" style={{ marginLeft: 6 }}>Vencida</span>
                                  )}
                                </td>
                                <td>{formatCurrency(p.valor)}</td>
                                <td><span className={`status-chip ${p.status === 'RECEBIDO' ? 'status-chip--ok' : p.status === 'CANCELADO' ? 'status-chip--neutral' : 'status-chip--pending'}`}>{recebivelStatusLabel[p.status]}</span></td>
                                <td>{p.dataPagamento ? formatDate(p.dataPagamento) : '—'}</td>
                                <td>
                                  {p.status !== 'RECEBIDO' && p.status !== 'CANCELADO' && (
                                    <button
                                      className="btn btn--sm btn--primary"
                                      onClick={() => {
                                        setPagarForm({ dataPagamento: new Date().toISOString().slice(0, 10), valorPago: maskCurrencyInputBRL(String(p.valor)) });
                                        setPagarModal({ parcela: p, assinaturaId: item.id });
                                      }}
                                    >
                                      Receber
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nova assinatura */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Assinatura Arato">
        <form onSubmit={(e) => void handleCreate(e)} className="form-grid">
          <div className="form-group">
            <label>Cliente *</label>
            <select required value={form.clienteId} onChange={(e) => setField('clienteId', e.target.value)}>
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Produto *</label>
            <select required value={form.produtoServicoId} onChange={(e) => setField('produtoServicoId', e.target.value)}>
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Conta Gerencial (Receita)</label>
            <select value={form.contaGerencialId} onChange={(e) => setField('contaGerencialId', e.target.value)}>
              <option value="">Sem conta vinculada</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.descricao}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Valor Mensal (R$) *</label>
            <input
              type="text"
              required
              placeholder="0,00"
              value={form.valorMensal}
              onChange={(e) => setField('valorMensal', maskCurrencyInputBRL(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Dia de Vencimento *</label>
            <input
              type="number"
              required
              min={1}
              max={28}
              value={form.diaVencimento}
              onChange={(e) => setField('diaVencimento', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Data de Início *</label>
            <input
              type="date"
              required
              value={form.dataInicio}
              onChange={(e) => setField('dataInicio', e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Salvando...' : 'Criar Assinatura'}</button>
          </div>
        </form>
      </Modal>

      {/* Pagamento de parcela */}
      {pagarModal && (
        <Modal open onClose={() => setPagarModal(null)} title={`Registrar Recebimento — Parcela ${pagarModal.parcela.parcelaNumero}`}>
          <form onSubmit={(e) => void handlePagarParcela(e)} className="form-grid">
            <div className="form-group">
              <label>Data do Pagamento *</label>
              <input
                type="date"
                required
                value={pagarForm.dataPagamento}
                onChange={(e) => setPagarForm((f) => ({ ...f, dataPagamento: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Valor Recebido (R$)</label>
              <input
                type="text"
                placeholder={formatCurrency(pagarModal.parcela.valor)}
                value={pagarForm.valorPago}
                onChange={(e) => setPagarForm((f) => ({ ...f, valorPago: maskCurrencyInputBRL(e.target.value) }))}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setPagarModal(null)}>Cancelar</button>
              <button type="submit" className="btn btn--primary" disabled={actionLoading === 'pagar'}>
                {actionLoading === 'pagar' ? 'Salvando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
