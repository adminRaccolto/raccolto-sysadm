import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import FinanceiroNav from '../../components/financeiro/FinanceiroNav';
import type { ContaBancaria, ContaGerencial, LancamentoTesouraria, TipoLancamentoTesouraria } from '../../types/api';
import { formatCurrency, formatDate, labelize } from '../../utils/format';

const initialForm = {
  contaBancariaId: '',
  contaGerencialId: '',
  tipo: 'ENTRADA' as TipoLancamentoTesouraria,
  descricao: '',
  dataLancamento: '',
  valor: '',
  observacoes: '',
};

export default function TesourariaPage() {
  const [items, setItems] = useState<LancamentoTesouraria[]>([]);
  const [contas, setContas] = useState<ContaGerencial[]>([]);
  const [bancos, setBancos] = useState<ContaBancaria[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LancamentoTesouraria | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [tesourariaResp, contasResp, bancosResp] = await Promise.all([
        http.get<{ itens: LancamentoTesouraria[] }>('/financeiro/tesouraria/lancamentos'),
        http.get<ContaGerencial[]>('/financeiro/plano-contas'),
        http.get<ContaBancaria[]>('/financeiro/contas-bancarias'),
      ]);
      setItems(tesourariaResp.data.itens);
      setContas(contasResp.data.filter((item) => item.aceitaLancamento));
      setBancos(bancosResp.data);
    } catch (err) {
      handleError(err, 'Falha ao carregar tesouraria.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal() {
    setForm(initialForm);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(initialForm);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post('/financeiro/tesouraria/lancamentos', {
        contaBancariaId: form.contaBancariaId,
        contaGerencialId: form.contaGerencialId,
        tipo: form.tipo,
        descricao: form.descricao,
        dataLancamento: form.dataLancamento,
        valor: Number(form.valor),
        observacoes: form.observacoes || undefined,
      });
      setSuccess('Lançamento de tesouraria registrado com sucesso.');
      closeModal();
      await load();
    } catch (err) {
      handleError(err, 'Falha ao registrar lançamento de tesouraria.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: LancamentoTesouraria) {
    if (!window.confirm(`Excluir o lançamento "${item.descricao}"?`)) return;
    try {
      await http.delete(`/financeiro/tesouraria/lancamentos/${item.id}`);
      setSuccess('Lançamento excluído com sucesso.');
      await load();
    } catch (err) {
      handleError(err, 'Falha ao excluir lançamento.');
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

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Tesouraria"
        subtitle="Os lançamentos são feitos em pop-up, mantendo o histórico e o grid visíveis na mesma tela."
        actions={
          <button className="button button--small" type="button" onClick={openModal}>
            Novo lançamento
          </button>
        }
      />
      <FinanceiroNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel panel--compact">
        <div className="panel__header panel__header--row">
          <div>
            <h3>Histórico de tesouraria</h3>
            <p>{items.length} lançamento(s) encontrado(s).</p>
          </div>
          <button className="button button--ghost button--small" type="button" onClick={openModal}>
            Novo lançamento
          </button>
        </div>
        {loading ? <LoadingBlock label="Carregando tesouraria..." /> : null}
        {!loading && items.length === 0 ? <EmptyState message="Nenhum lançamento de tesouraria cadastrado." /> : null}
        {!loading && items.length > 0 ? (
          <div className="table-wrap table-wrap--full">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Conta bancária</th>
                  <th>Conta gerencial</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)}>
                    <td>
                      <strong>{item.descricao}</strong>
                      <div className="table-subline">{item.observacoes || 'Sem observações'}</div>
                    </td>
                    <td>{item.contaBancaria?.nome || '—'}</td>
                    <td>{item.contaGerencial ? `${item.contaGerencial.codigo} · ${item.contaGerencial.descricao}` : '—'}</td>
                    <td>{formatDate(item.dataLancamento)}</td>
                    <td>{formatCurrency(item.valor)}</td>
                    <td>{labelize(item.tipo)}</td>
                    <td>
                      <button className="button button--danger button--small" type="button" onClick={(event) => { event.stopPropagation(); void handleDelete(item); }}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>



      <Modal
        open={!!selectedItem}
        title="Detalhe da tesouraria"
        subtitle="Abertura por clique direto na linha do grid."
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem ? (
          <div className="detail-stack">
            <div className="detail-grid">
              <div><span>Descrição</span><strong>{selectedItem.descricao}</strong></div>
              <div><span>Tipo</span><strong>{labelize(selectedItem.tipo)}</strong></div>
              <div><span>Conta bancária</span><strong>{selectedItem.contaBancaria?.nome || '—'}</strong></div>
              <div><span>Conta gerencial</span><strong>{selectedItem.contaGerencial ? `${selectedItem.contaGerencial.codigo} · ${selectedItem.contaGerencial.descricao}` : '—'}</strong></div>
              <div><span>Data</span><strong>{formatDate(selectedItem.dataLancamento)}</strong></div>
              <div><span>Valor</span><strong>{formatCurrency(selectedItem.valor)}</strong></div>
            </div>
            {selectedItem.observacoes ? <div className="detail-note">{selectedItem.observacoes}</div> : null}
            <div className="table-actions">
              <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(selectedItem)}>Excluir lançamento</button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isModalOpen}
        title="Novo lançamento"
        subtitle="Use entradas, saídas e ajustes para registrar o histórico real da tesouraria."
        onClose={closeModal}
      >
        <form className="form-grid form-grid--wide" onSubmit={handleSubmit}>
          <div className="field">
            <label>Conta bancária</label>
            <select value={form.contaBancariaId} onChange={(e) => setForm((c) => ({ ...c, contaBancariaId: e.target.value }))} required>
              <option value="">Selecione</option>
              {bancos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Conta gerencial</label>
            <select value={form.contaGerencialId} onChange={(e) => setForm((c) => ({ ...c, contaGerencialId: e.target.value }))} required>
              <option value="">Selecione</option>
              {contas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} · {item.descricao}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((c) => ({ ...c, tipo: e.target.value as TipoLancamentoTesouraria }))}>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>
          <div className="field">
            <label>Data</label>
            <input type="date" value={form.dataLancamento} onChange={(e) => setForm((c) => ({ ...c, dataLancamento: e.target.value }))} required />
          </div>
          <div className="field field--span-2">
            <label>Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Valor</label>
            <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((c) => ({ ...c, valor: e.target.value }))} required />
          </div>
          <div className="field field--span-2">
            <label>Observações</label>
            <textarea rows={3} value={form.observacoes} onChange={(e) => setForm((c) => ({ ...c, observacoes: e.target.value }))} />
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar lançamento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
