import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import FinanceiroNav from '../../components/financeiro/FinanceiroNav';
import type { Cliente, ContaGerencial, ProdutoServico, Recebivel } from '../../types/api';
import { formatCurrency, formatDate, labelize } from '../../utils/format';
import { gerarParcelas, type ParcelaPreview, type RegraDiaNaoUtil } from '../../utils/financeiro';

const initialForm = {
  clienteId: '',
  contratoId: '',
  produtoServicoId: '',
  contaGerencialId: '',
  descricao: '',
  valorTotal: '',
  quantidadeParcelas: '1',
  intervaloMeses: '1',
  primeiroVencimento: '',
  regraDiaNaoUtil: 'PROXIMO_DIA_UTIL' as RegraDiaNaoUtil,
  previsao: false,
};

type FormState = typeof initialForm;

export default function ContasReceberPage() {
  const [items, setItems] = useState<Recebivel[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contas, setContas] = useState<ContaGerencial[]>([]);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [parcelas, setParcelas] = useState<ParcelaPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Recebivel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingMultiple, setDeletingMultiple] = useState(false);
  const [pagamentoModal, setPagamentoModal] = useState(false);
  const [reagendamentoModal, setReagendamentoModal] = useState(false);
  const [pagamentoForm, setPagamentoForm] = useState({ valorPago: '', dataPagamento: '' });
  const [reagendamentoForm, setReagendamentoForm] = useState({ novoVencimento: '', observacao: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const resumo = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.valor, 0);
    const previsao = items.filter((item) => item.previsao).reduce((sum, item) => sum + item.valor, 0);
    return { total, previsao };
  }, [items]);

  async function load() {
    setLoading(true);
    try {
      const [receber, clientesResp, contasResp, produtosResp] = await Promise.all([
        http.get<{ itens: Recebivel[] }>('/financeiro/contas-receber'),
        http.get<Cliente[]>('/clientes'),
        http.get<ContaGerencial[]>('/financeiro/plano-contas'),
        http.get<ProdutoServico[]>('/produtos-servicos'),
      ]);
      setItems(receber.data.itens);
      setClientes(clientesResp.data);
      setContas(contasResp.data.filter((item) => item.tipo === 'RECEITA' && item.aceitaLancamento));
      setProdutos(produtosResp.data);
    } catch (err) {
      handleError(err, 'Falha ao carregar contas a receber.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal() {
    setForm(initialForm);
    setParcelas([]);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(initialForm);
    setParcelas([]);
  }

  function gerarGrade() {
    const valorTotal = Number(form.valorTotal);
    const quantidadeParcelas = Number(form.quantidadeParcelas);
    const intervaloMeses = Number(form.intervaloMeses);
    if (!form.primeiroVencimento || !Number.isFinite(valorTotal) || valorTotal <= 0 || !Number.isFinite(quantidadeParcelas) || quantidadeParcelas < 1) {
      setError('Informe valor total, quantidade de parcelas, intervalo e primeiro vencimento antes de gerar a grade.');
      return;
    }
    setParcelas(
      gerarParcelas({
        valorTotal,
        quantidadeParcelas,
        primeiroVencimento: form.primeiroVencimento,
        intervaloMeses,
        regraDiaNaoUtil: form.regraDiaNaoUtil,
      }),
    );
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!parcelas.length) {
      setError('Gere a grade automática antes de confirmar o recebível.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post('/financeiro/contas-receber', {
        clienteId: form.clienteId,
        contratoId: form.contratoId || undefined,
        produtoServicoId: form.produtoServicoId || undefined,
        contaGerencialId: form.contaGerencialId,
        descricao: form.descricao,
        valor: Number(form.valorTotal),
        vencimento: parcelas[0]?.vencimento || form.primeiroVencimento,
        totalParcelas: parcelas.length,
        parcelas: parcelas.map((item) => ({
          parcelaNumero: item.parcelaNumero,
          valor: Number(item.valor),
          vencimento: item.vencimento,
        })),
        previsao: form.previsao,
      });
      setSuccess('Conta a receber cadastrada com sucesso.');
      closeModal();
      await load();
    } catch (err) {
      handleError(err, 'Falha ao cadastrar conta a receber.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Recebivel) {
    try {
      await http.delete(`/financeiro/contas-receber/${item.id}`);
      setSuccess('Conta a receber excluída com sucesso.');
      setSelectedItem((current) => (current?.id === item.id ? null : current));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
      await load();
    } catch (err) {
      handleError(err, 'Falha ao excluir conta a receber.');
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setDeletingMultiple(true);
    setError(null);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => http.delete(`/financeiro/contas-receber/${id}`)));
      setSuccess(`${selectedIds.size} lançamento(s) excluído(s) com sucesso.`);
      setSelectedIds(new Set());
      await load();
    } catch (err) {
      handleError(err, 'Falha ao excluir lançamentos selecionados.');
    } finally {
      setDeletingMultiple(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }

  async function handleRegistrarPagamento(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setActionLoading(true);
    setError(null);
    try {
      await http.post(`/faturamento/recebiveis/${selectedItem.id}/pagar`, {
        valorPago: parseFloat(pagamentoForm.valorPago),
        dataPagamento: pagamentoForm.dataPagamento,
      });
      setSuccess('Pagamento registrado com sucesso.');
      setPagamentoModal(false);
      setSelectedItem(null);
      await load();
    } catch (err) {
      handleError(err, 'Erro ao registrar pagamento.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReagendar(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setActionLoading(true);
    setError(null);
    try {
      await http.post(`/faturamento/recebiveis/${selectedItem.id}/reagendar`, {
        novoVencimento: reagendamentoForm.novoVencimento,
        observacao: reagendamentoForm.observacao || undefined,
      });
      setSuccess('Parcela reagendada com sucesso.');
      setReagendamentoModal(false);
      setSelectedItem(null);
      await load();
    } catch (err) {
      handleError(err, 'Erro ao reagendar parcela.');
    } finally {
      setActionLoading(false);
    }
  }

  function handleError(err: unknown, fallback: string) {
    if (axios.isAxiosError(err)) {
      const payload = err.response?.data?.message;
      setError(Array.isArray(payload) ? payload.join(' | ') : payload || fallback);
      return;
    }
    setError(fallback);
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Contas a Receber"
        actions={
          <button className="button button--small" type="button" onClick={openModal}>
            Novo lançamento
          </button>
        }
      />
      <FinanceiroNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="stats-grid stats-grid--compact">
        <div className="stat-card"><span className="stat-card__label">Lançamentos</span><strong>{items.length}</strong><span className="stat-card__helper">Clique em uma linha para abrir o detalhe.</span></div>
        <div className="stat-card"><span className="stat-card__label">Total previsto de recebimento</span><strong>{formatCurrency(resumo.total)}</strong><span className="stat-card__helper">Parcelas abertas e vinculações manuais.</span></div>
        <div className="stat-card"><span className="stat-card__label">Receitas em previsão</span><strong>{formatCurrency(resumo.previsao)}</strong><span className="stat-card__helper">Destaque visual no relatório e no fluxo.</span></div>
      </section>

      <section className="panel panel--compact">
        <div className="panel__header panel__header--row">
          <div>
            <h3>Recebíveis</h3>
            <p>Selecione linhas para excluir em lote. Clique na linha para ver o detalhe.</p>
          </div>
          <div className="table-actions-toolbar">
            {selectedIds.size > 0 ? (
              <button
                className="button button--danger button--small"
                type="button"
                disabled={deletingMultiple}
                onClick={() => void handleDeleteSelected()}
              >
                {deletingMultiple ? 'Excluindo...' : `Excluir selecionados (${selectedIds.size})`}
              </button>
            ) : null}
            <button className="button button--ghost button--small" type="button" onClick={openModal}>
              Novo recebível
            </button>
          </div>
        </div>
        {loading ? <LoadingBlock label="Carregando recebíveis..." /> : null}
        {!loading && items.length === 0 ? <EmptyState message="Nenhuma conta a receber cadastrada." /> : null}
        {!loading && items.length > 0 ? (
          <div className="table-wrap table-wrap--full">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title="Selecionar todos" />
                  </th>
                  <th>Descrição</th>
                  <th>Cliente</th>
                  <th>Conta gerencial</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`${item.previsao ? 'table-row--forecast' : ''} ${selectedIds.has(item.id) ? 'table-row--selected' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                    </td>
                    <td>
                      <strong>{item.descricao}</strong>
                      <div className="table-subline">
                        {item.produtoServico?.nome || 'Manual'}
                        {item.totalParcelas ? ` · Parcela ${item.parcelaNumero}/${item.totalParcelas}` : ''}
                        {item.previsao ? ' · Previsão' : ''}
                      </div>
                    </td>
                    <td>{item.cliente?.razaoSocial || '—'}</td>
                    <td>{item.contaGerencial ? `${item.contaGerencial.codigo} · ${item.contaGerencial.descricao}` : '—'}</td>
                    <td>{formatDate(item.vencimento)}</td>
                    <td>{formatCurrency(item.valor)}</td>
                    <td><span className={`status-chip ${item.previsao ? 'status-chip--forecast' : 'status-chip--solid'}`}>{labelize(item.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Modal
        open={isModalOpen}
        title="Novo recebível manual"
        subtitle="Use esta tela para lançamentos fora do fluxo automático do contrato, inclusive operações parceladas e previsões."
        onClose={closeModal}
      >
        <form className="form-grid form-grid--wide" onSubmit={handleSubmit}>
          <div className="field">
            <label>Cliente</label>
            <select value={form.clienteId} onChange={(e) => setForm((c) => ({ ...c, clienteId: e.target.value }))} required>
              <option value="">Selecione</option>
              {clientes.map((item) => (
                <option key={item.id} value={item.id}>{item.razaoSocial}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Produto/serviço</label>
            <select value={form.produtoServicoId} onChange={(e) => setForm((c) => ({ ...c, produtoServicoId: e.target.value }))}>
              <option value="">Não vincular</option>
              {produtos.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </div>
          <div className="field field--span-2">
            <label>Conta gerencial</label>
            <select value={form.contaGerencialId} onChange={(e) => setForm((c) => ({ ...c, contaGerencialId: e.target.value }))} required>
              <option value="">Selecione</option>
              {contas.map((item) => (
                <option key={item.id} value={item.id}>{item.codigo} · {item.descricao}</option>
              ))}
            </select>
          </div>
          <div className="field field--span-2">
            <label>Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Valor total</label>
            <input type="number" step="0.01" value={form.valorTotal} onChange={(e) => setForm((c) => ({ ...c, valorTotal: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Quantidade de parcelas</label>
            <input type="number" min={1} value={form.quantidadeParcelas} onChange={(e) => setForm((c) => ({ ...c, quantidadeParcelas: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Intervalo de vencimento</label>
            <select value={form.intervaloMeses} onChange={(e) => setForm((c) => ({ ...c, intervaloMeses: e.target.value }))}>
              <option value="1">Mensal</option>
              <option value="2">Bimestral</option>
              <option value="3">Trimestral</option>
              <option value="4">Quadrimestral</option>
              <option value="6">Semestral</option>
              <option value="12">Anual</option>
            </select>
          </div>
          <div className="field">
            <label>Primeiro vencimento</label>
            <input type="date" value={form.primeiroVencimento} onChange={(e) => setForm((c) => ({ ...c, primeiroVencimento: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Dia não útil</label>
            <select value={form.regraDiaNaoUtil} onChange={(e) => setForm((c) => ({ ...c, regraDiaNaoUtil: e.target.value as RegraDiaNaoUtil }))}>
              <option value="PROXIMO_DIA_UTIL">Postergar para o próximo dia útil</option>
              <option value="ANTERIOR_DIA_UTIL">Antecipar para o dia útil anterior</option>
              <option value="MANTER">Manter data e ajustar manualmente</option>
            </select>
          </div>
          <div className="field field--checkbox field--span-2">
            <label>
              <input type="checkbox" checked={form.previsao} onChange={(e) => setForm((c) => ({ ...c, previsao: e.target.checked }))} />
              Lançar como previsão
            </label>
          </div>
          <div className="field field--span-2 flow-toolbar">
            <button className="button button--ghost" type="button" onClick={gerarGrade}>Gerar grade automática</button>
            <span className="muted">Datas ajustadas por fim de semana podem ser refinadas manualmente na grade.</span>
          </div>
          {parcelas.length ? (
            <div className="field field--span-2">
              <div className="panel panel--nested">
                <div className="panel__header"><h3>Grade de parcelas</h3><p>Edite datas e valores antes da confirmação final.</p></div>
                <div className="table-wrap table-wrap--full">
                  <table>
                    <thead>
                      <tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Ajuste</th></tr>
                    </thead>
                    <tbody>
                      {parcelas.map((parcela, index) => (
                        <tr key={parcela.parcelaNumero}>
                          <td>{parcela.parcelaNumero}</td>
                          <td><input type="date" value={parcela.vencimento} onChange={(e) => setParcelas((current) => current.map((item, i) => i === index ? { ...item, vencimento: e.target.value, ajustadoDiaNaoUtil: false } : item))} /></td>
                          <td><input type="number" step="0.01" value={parcela.valor} onChange={(e) => setParcelas((current) => current.map((item, i) => i === index ? { ...item, valor: Number(e.target.value) } : item))} /></td>
                          <td>{parcela.ajustadoDiaNaoUtil ? 'Autoajustada' : 'Manual'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving || !parcelas.length}>
              {saving ? 'Salvando...' : 'Confirmar e gravar parcelas'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!selectedItem}
        title="Detalhe da conta a receber"
        subtitle="Abertura por clique direto na linha do grid."
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem ? (
          <div className="detail-stack">
            <div className="detail-grid">
              <div><span>Descrição</span><strong>{selectedItem.descricao}</strong></div>
              <div><span>Cliente</span><strong>{selectedItem.cliente?.razaoSocial || '—'}</strong></div>
              <div><span>Vencimento</span><strong>{formatDate(selectedItem.vencimento)}</strong></div>
              <div><span>Valor</span><strong>{formatCurrency(selectedItem.valor)}</strong></div>
              <div><span>Status</span><strong>{labelize(selectedItem.status)}</strong></div>
              <div><span>Tipo</span><strong>{selectedItem.previsao ? 'Previsão' : 'Real'}</strong></div>
              <div><span>Conta gerencial</span><strong>{selectedItem.contaGerencial ? `${selectedItem.contaGerencial.codigo} · ${selectedItem.contaGerencial.descricao}` : '—'}</strong></div>
              <div><span>Origem</span><strong>{selectedItem.origemAutomatica ? 'Automática' : 'Manual'}</strong></div>
            </div>
            <div className="table-actions-toolbar">
              {selectedItem.status !== 'RECEBIDO' && selectedItem.status !== 'CANCELADO' ? (
                <button
                  className="button button--small"
                  type="button"
                  onClick={() => {
                    setPagamentoForm({
                      valorPago: String(selectedItem.valor - (selectedItem.valorPago ?? 0)),
                      dataPagamento: new Date().toISOString().slice(0, 10),
                    });
                    setPagamentoModal(true);
                  }}
                >
                  Registrar pagamento
                </button>
              ) : null}
              {selectedItem.status !== 'RECEBIDO' && selectedItem.status !== 'CANCELADO' ? (
                <button
                  className="button button--ghost button--small"
                  type="button"
                  onClick={() => {
                    setReagendamentoForm({ novoVencimento: '', observacao: '' });
                    setReagendamentoModal(true);
                  }}
                >
                  Reagendar
                </button>
              ) : null}
              <button
                className="button button--danger button--small"
                type="button"
                onClick={() => void handleDelete(selectedItem)}
                disabled={selectedItem.origemAutomatica}
              >
                Excluir
              </button>
            </div>
            {selectedItem.valorPago ? (
              <div className="selection-note">
                Pago parcialmente: <strong>{formatCurrency(selectedItem.valorPago)}</strong>
                {' · '}Saldo: <strong>{formatCurrency(selectedItem.valor - selectedItem.valorPago)}</strong>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Modal: Registrar pagamento */}
      <Modal
        open={pagamentoModal && !!selectedItem}
        title="Registrar pagamento"
        subtitle={selectedItem ? `Recebível: ${selectedItem.descricao} — ${formatCurrency(selectedItem.valor)}` : ''}
        onClose={() => setPagamentoModal(false)}
      >
        <form className="form-grid" onSubmit={(e) => void handleRegistrarPagamento(e)}>
          <div className="field">
            <label>Valor pago (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={pagamentoForm.valorPago}
              onChange={(e) => setPagamentoForm((f) => ({ ...f, valorPago: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Data do pagamento</label>
            <input
              type="date"
              required
              value={pagamentoForm.dataPagamento}
              onChange={(e) => setPagamentoForm((f) => ({ ...f, dataPagamento: e.target.value }))}
            />
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={actionLoading}>
              {actionLoading ? 'Salvando...' : 'Confirmar pagamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reagendar */}
      <Modal
        open={reagendamentoModal && !!selectedItem}
        title="Reagendar vencimento"
        subtitle={selectedItem ? `Vencimento atual: ${formatDate(selectedItem.vencimento)}` : ''}
        onClose={() => setReagendamentoModal(false)}
      >
        <form className="form-grid" onSubmit={(e) => void handleReagendar(e)}>
          <div className="field field--span-2">
            <label>Novo vencimento</label>
            <input
              type="date"
              required
              value={reagendamentoForm.novoVencimento}
              onChange={(e) => setReagendamentoForm((f) => ({ ...f, novoVencimento: e.target.value }))}
            />
          </div>
          <div className="field field--span-2">
            <label>Motivo / observação</label>
            <input
              value={reagendamentoForm.observacao}
              placeholder="Ex.: solicitado pelo cliente"
              onChange={(e) => setReagendamentoForm((f) => ({ ...f, observacao: e.target.value }))}
            />
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={actionLoading}>
              {actionLoading ? 'Salvando...' : 'Confirmar reagendamento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
