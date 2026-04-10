import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import FinanceiroNav from '../../components/financeiro/FinanceiroNav';
import type { ContaGerencial, TipoContaGerencial } from '../../types/api';

const initialForm = {
  codigo: '',
  descricao: '',
  tipo: 'DESPESA' as TipoContaGerencial,
  contaPaiId: '',
  aceitaLancamento: true,
  ativo: true,
};

export default function PlanoContasPage() {
  const [items, setItems] = useState<ContaGerencial[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const lancaveis = useMemo(() => items.filter((item) => item.aceitaLancamento), [items]);

  async function load() {
    setLoading(true);
    try {
      const response = await http.get<ContaGerencial[]>('/financeiro/plano-contas');
      setItems(response.data);
    } catch (err) {
      handleError(err, 'Falha ao carregar plano de contas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function openNewModal() {
    resetForm();
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    resetForm();
  }

  function startEdit(item: ContaGerencial) {
    setEditingId(item.id);
    setForm({
      codigo: item.codigo,
      descricao: item.descricao,
      tipo: item.tipo,
      contaPaiId: item.contaPaiId || '',
      aceitaLancamento: item.aceitaLancamento,
      ativo: item.ativo,
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      ...form,
      contaPaiId: form.contaPaiId || undefined,
    };

    try {
      if (editingId) {
        await http.put(`/financeiro/plano-contas/${editingId}`, payload);
        setSuccess('Conta gerencial atualizada com sucesso.');
      } else {
        await http.post('/financeiro/plano-contas', payload);
        setSuccess('Conta gerencial cadastrada com sucesso.');
      }
      closeModal();
      await load();
    } catch (err) {
      handleError(err, editingId ? 'Falha ao atualizar conta gerencial.' : 'Falha ao cadastrar conta gerencial.');
    } finally {
      setSaving(false);
    }
  }



  async function handleEnsureDefaultPlan() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post('/financeiro/plano-contas/seed');
      setSuccess('Plano de contas padrão garantido com sucesso.');
      await load();
    } catch (err) {
      handleError(err, 'Falha ao garantir o plano de contas padrão.');
    } finally {
      setSaving(false);
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
        title="Plano de Contas"
        subtitle="A lista fica aberta na tela e as ações de novo/editar acontecem em pop-up, sem esconder o grid existente."
        actions={
          <div className="header-tools">
            <button className="button button--ghost button--small" type="button" onClick={() => void handleEnsureDefaultPlan()} disabled={saving}>
              Garantir plano padrão
            </button>
            <button className="button button--small" type="button" onClick={openNewModal}>
              Nova conta
            </button>
          </div>
        }
      />
      <FinanceiroNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel panel--compact">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div>
            <h3>Estrutura atual</h3>
            <p>{items.length} conta(s) cadastrada(s) · {lancaveis.length} conta(s) analítica(s) pronta(s) para uso.</p>
          </div>
          <div className="table-actions-toolbar">
            <button className="button button--ghost button--small" type="button" onClick={openNewModal}>Nova conta</button>
          </div>
        </div>


        {loading ? <LoadingBlock label="Carregando plano de contas..." /> : null}
        {!loading && items.length === 0 ? <EmptyState message="Nenhuma conta gerencial cadastrada ainda." /> : null}
        {!loading && items.length > 0 ? (
          <div className="table-wrap table-wrap--full">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Conta pai</th>
                  <th>Lançável</th>
                  <th>Ativa</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} onClick={() => startEdit(item)}>
                    <td>{item.codigo}</td>
                    <td>
                      <strong>{item.descricao}</strong>
                      <div className="table-subline">
                        Subcontas: {item._count?.subcontas ?? 0} · Pagar: {item._count?.contasPagar ?? 0} · Receber: {item._count?.recebiveis ?? 0} · Tesouraria: {item._count?.lancamentos ?? 0}
                      </div>
                    </td>
                    <td>{item.tipo}</td>
                    <td>{item.contaPai ? `${item.contaPai.codigo} · ${item.contaPai.descricao}` : '—'}</td>
                    <td>{item.aceitaLancamento ? 'Sim' : 'Não'}</td>
                    <td>{item.ativo ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar conta gerencial' : 'Nova conta gerencial'}
        subtitle="Cadastre, reorganize e ajuste contas da estrutura gerencial sem perder a visão da lista existente."
        onClose={closeModal}
      >
        <form className="form-grid form-grid--wide" onSubmit={handleSubmit}>
          <div className="field">
            <label>Código</label>
            <input value={form.codigo} onChange={(e) => setForm((c) => ({ ...c, codigo: e.target.value }))} required />
          </div>

          <div className="field">
            <label>Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((c) => ({ ...c, tipo: e.target.value as TipoContaGerencial }))}>
              <option value="RECEITA">Receita</option>
              <option value="CUSTO">Custo</option>
              <option value="DESPESA">Despesa</option>
              <option value="INVESTIMENTO">Investimento</option>
              <option value="TESOURARIA">Tesouraria</option>
            </select>
          </div>

          <div className="field field--span-2">
            <label>Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} required />
          </div>

          <div className="field field--span-2">
            <label>Conta pai</label>
            <select value={form.contaPaiId} onChange={(e) => setForm((c) => ({ ...c, contaPaiId: e.target.value }))}>
              <option value="">Sem conta pai</option>
              {items
                .filter((item) => item.id !== editingId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} · {item.descricao}
                  </option>
                ))}
            </select>
          </div>

          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.aceitaLancamento} onChange={(e) => setForm((c) => ({ ...c, aceitaLancamento: e.target.checked }))} />
              Aceita lançamento direto
            </label>
          </div>

          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((c) => ({ ...c, ativo: e.target.checked }))} />
              Conta ativa
            </label>
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar conta gerencial'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
