import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import FinanceiroNav from '../../components/financeiro/FinanceiroNav';
import type { ContaGerencial, ContaPagar } from '../../types/api';
import { formatCurrency, formatDate, labelize } from '../../utils/format';
import { gerarParcelas, type ParcelaPreview, type RegraDiaNaoUtil } from '../../utils/financeiro';

const initialForm = {
  contaGerencialId: '',
  fornecedor: '',
  descricao: '',
  dataCompra: '',
  competencia: '',
  primeiroVencimento: '',
  valorTotal: '',
  quantidadeParcelas: '1',
  intervaloMeses: '1',
  regraDiaNaoUtil: 'PROXIMO_DIA_UTIL' as RegraDiaNaoUtil,
  previsao: false,
  observacoes: '',
};

type FormState = typeof initialForm;

export default function ContasPagarPage() {
  const [items, setItems] = useState<ContaPagar[]>([]);
  const [contas, setContas] = useState<ContaGerencial[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [parcelas, setParcelas] = useState<ParcelaPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContaPagar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  const resumo = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.valor, 0);
    const previsao = items.filter((item) => item.previsao).reduce((sum, item) => sum + item.valor, 0);
    return { total, previsao };
  }, [items]);

  async function load() {
    setLoading(true);
    try {
      const [pagarResp, contasResp] = await Promise.all([
        http.get<{ itens: ContaPagar[] }>('/financeiro/contas-pagar'),
        http.get<ContaGerencial[]>('/financeiro/plano-contas'),
      ]);
      setItems(pagarResp.data.itens);
      setContas(contasResp.data.filter((item) => item.tipo !== 'RECEITA' && item.aceitaLancamento));
    } catch (err) {
      handleError(err, 'Falha ao carregar contas a pagar.');
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
      setError('Gere a grade automática antes de confirmar o lançamento.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post('/financeiro/contas-pagar', {
        contaGerencialId: form.contaGerencialId,
        fornecedor: form.fornecedor || undefined,
        descricao: form.descricao,
        dataCompra: form.dataCompra || undefined,
        competencia: form.competencia || undefined,
        vencimento: parcelas[0]?.vencimento || form.primeiroVencimento,
        valor: Number(form.valorTotal),
        totalParcelas: parcelas.length,
        parcelado: parcelas.length > 1,
        parcelas: parcelas.map((item) => ({
          parcelaNumero: item.parcelaNumero,
          valor: Number(item.valor),
          vencimento: item.vencimento,
        })),
        previsao: form.previsao,
        observacoes: form.observacoes || undefined,
      });
      setSuccess('Conta a pagar registrada com sucesso.');
      closeModal();
      await load();
    } catch (err) {
      handleError(err, 'Falha ao registrar conta a pagar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ContaPagar) {
    try {
      await http.delete(`/financeiro/contas-pagar/${item.id}`);
      setSuccess('Conta a pagar excluída com sucesso.');
      setSelectedItem((current) => (current?.id === item.id ? null : current));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
      await load();
    } catch (err) {
      handleError(err, 'Falha ao excluir conta a pagar.');
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setDeletingMultiple(true);
    setError(null);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => http.delete(`/financeiro/contas-pagar/${id}`)));
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

  async function handleUpload(item: ContaPagar, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingId(item.id);
    try {
      await http.post(`/financeiro/contas-pagar/${item.id}/anexo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Anexo enviado com sucesso.');
      await load();
    } catch (err) {
      handleError(err, 'Falha ao enviar anexo da conta a pagar.');
    } finally {
      setUploadingId(null);
      event.target.value = '';
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
        title="Contas a Pagar"
        subtitle="Informe total, parcelas, intervalo e primeiro vencimento; gere a grade, ajuste datas por dia não útil, edite manualmente e então confirme o lançamento."
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
        <div className="stat-card"><span className="stat-card__label">Lançamentos</span><strong>{items.length}</strong><span className="stat-card__helper">Grid operacional com clique direto na linha.</span></div>
        <div className="stat-card"><span className="stat-card__label">Total projetado</span><strong>{formatCurrency(resumo.total)}</strong><span className="stat-card__helper">Soma das parcelas abertas.</span></div>
        <div className="stat-card"><span className="stat-card__label">Previsões</span><strong>{formatCurrency(resumo.previsao)}</strong><span className="stat-card__helper">Parcelas marcadas como previsão.</span></div>
      </section>

      <section className="panel panel--compact">
        <div className="panel__header panel__header--row">
          <div>
            <h3>Contas a pagar</h3>
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
              Novo lançamento
            </button>
          </div>
        </div>
        {loading ? <LoadingBlock label="Carregando contas a pagar..." /> : null}
        {!loading && items.length === 0 ? <EmptyState message="Nenhuma conta a pagar cadastrada." /> : null}
        {!loading && items.length > 0 ? (
          <div className="table-wrap table-wrap--full">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title="Selecionar todos" />
                  </th>
                  <th>Descrição</th>
                  <th>Competência</th>
                  <th>Vencimento</th>
                  <th>Conta gerencial</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Anexo</th>
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
                        {item.fornecedor || 'Sem fornecedor'} · {item.parcelado ? `Parcela ${item.parcelaNumero}/${item.totalParcelas}` : item.recorrente ? `Recorrente ${item.parcelaNumero}/${item.totalParcelas}` : 'Pontual'}
                        {item.previsao ? ' · Previsão' : ''}
                      </div>
                    </td>
                    <td>{formatDate(item.competencia)}</td>
                    <td>{formatDate(item.vencimento)}</td>
                    <td>{item.contaGerencial ? `${item.contaGerencial.codigo} · ${item.contaGerencial.descricao}` : '—'}</td>
                    <td>{formatCurrency(item.valor)}</td>
                    <td>
                      <span className={`status-chip ${item.previsao ? 'status-chip--forecast' : 'status-chip--solid'}`}>{labelize(item.status)}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <label className="button button--ghost button--small file-upload-button">
                        {uploadingId === item.id ? 'Enviando...' : 'Anexo'}
                        <input hidden type="file" onChange={(e) => void handleUpload(item, e)} />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Modal
        open={isModalOpen}
        title="Novo lançamento a pagar"
        subtitle="Sequência obrigatória: informar total, parcelas, intervalo e primeiro vencimento; gerar grade; ajustar por dia não útil; editar manualmente; confirmar e gravar."
        onClose={closeModal}
      >
        <form className="form-grid form-grid--wide" onSubmit={handleSubmit}>
          <div className="field field--span-2">
            <label>Conta gerencial</label>
            <select value={form.contaGerencialId} onChange={(e) => setForm((c) => ({ ...c, contaGerencialId: e.target.value }))} required>
              <option value="">Selecione</option>
              {contas.map((item) => (
                <option key={item.id} value={item.id}>{item.codigo} · {item.descricao}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fornecedor</label>
            <input value={form.fornecedor} onChange={(e) => setForm((c) => ({ ...c, fornecedor: e.target.value }))} />
          </div>
          <div className="field">
            <label>Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Data da compra</label>
            <input type="date" value={form.dataCompra} onChange={(e) => setForm((c) => ({ ...c, dataCompra: e.target.value }))} />
          </div>
          <div className="field">
            <label>Competência</label>
            <input type="date" value={form.competencia} onChange={(e) => setForm((c) => ({ ...c, competencia: e.target.value }))} />
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
          <div className="field field--span-2">
            <label>Observações</label>
            <textarea rows={3} value={form.observacoes} onChange={(e) => setForm((c) => ({ ...c, observacoes: e.target.value }))} />
          </div>
          <div className="field field--span-2 flow-toolbar">
            <button className="button button--ghost" type="button" onClick={gerarGrade}>Gerar grade automática</button>
            <span className="muted">Feriados podem ser ajustados manualmente na grade antes da confirmação.</span>
          </div>
          {parcelas.length ? (
            <div className="field field--span-2">
              <div className="panel panel--nested">
                <div className="panel__header"><h3>Grade de parcelas</h3><p>Datas e valores podem ser ajustados manualmente antes de gravar.</p></div>
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
        title="Detalhe da conta a pagar"
        subtitle="Abertura por clique direto na linha do grid."
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem ? (
          <div className="detail-stack">
            <div className="detail-grid">
              <div><span>Descrição</span><strong>{selectedItem.descricao}</strong></div>
              <div><span>Fornecedor</span><strong>{selectedItem.fornecedor || '—'}</strong></div>
              <div><span>Competência</span><strong>{formatDate(selectedItem.competencia)}</strong></div>
              <div><span>Vencimento</span><strong>{formatDate(selectedItem.vencimento)}</strong></div>
              <div><span>Valor</span><strong>{formatCurrency(selectedItem.valor)}</strong></div>
              <div><span>Status</span><strong>{labelize(selectedItem.status)}</strong></div>
              <div><span>Tipo</span><strong>{selectedItem.previsao ? 'Previsão' : 'Real'}</strong></div>
              <div><span>Conta gerencial</span><strong>{selectedItem.contaGerencial ? `${selectedItem.contaGerencial.codigo} · ${selectedItem.contaGerencial.descricao}` : '—'}</strong></div>
            </div>
            {selectedItem.observacoes ? <div className="detail-note">{selectedItem.observacoes}</div> : null}
            <div className="table-actions">
              {selectedItem.anexoUrl ? <a className="button button--ghost button--small" href={selectedItem.anexoUrl} target="_blank" rel="noreferrer">Ver anexo</a> : null}
              <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(selectedItem)}>
                Excluir lançamento
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
