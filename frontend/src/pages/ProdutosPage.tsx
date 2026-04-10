import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { ProdutoServico } from '../types/api';

const initialForm = {
  nome: '',
  descricao: '',
  contaGerencialReceita: '',
  ativo: true,
  ordem: 0,
};

type ProdutoForm = typeof initialForm;

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdutoForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedProduto = useMemo(
    () => produtos.find((produto) => produto.id === selectedId) ?? null,
    [produtos, selectedId],
  );

  async function loadProdutos() {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get<ProdutoServico[]>('/produtos-servicos');
      setProdutos(response.data);
      if (!selectedId && response.data.length > 0) setSelectedId(response.data[0].id);
    } catch (err) {
      handleApiError(err, 'Falha ao carregar produtos e serviços.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProdutos();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function openNewModal() {
    resetForm();
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeModal() {
    if (saving) return;
    resetForm();
    setIsModalOpen(false);
  }

  function startEdit(produto: ProdutoServico) {
    setSelectedId(produto.id);
    setEditingId(produto.id);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao || '',
      contaGerencialReceita: produto.contaGerencialReceita || '',
      ativo: produto.ativo,
      ordem: produto.ordem,
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || undefined,
        contaGerencialReceita: form.contaGerencialReceita || undefined,
        ativo: form.ativo,
        ordem: Number(form.ordem),
      };

      if (editingId) {
        await http.put(`/produtos-servicos/${editingId}`, payload);
        setSuccess('Produto/serviço atualizado com sucesso.');
      } else {
        await http.post('/produtos-servicos', payload);
        setSuccess('Produto/serviço cadastrado com sucesso.');
      }

      closeModal();
      await loadProdutos();
    } catch (err) {
      handleApiError(err, editingId ? 'Falha ao atualizar produto/serviço.' : 'Falha ao cadastrar produto/serviço.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(produto: ProdutoServico) {
    const confirmed = window.confirm(`Excluir o produto/serviço ${produto.nome}?`);
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    try {
      await http.delete(`/produtos-servicos/${produto.id}`);
      setSuccess('Produto/serviço excluído com sucesso.');
      if (editingId === produto.id) closeModal();
      await loadProdutos();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir produto/serviço.');
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
        title="Produtos & serviços"
        subtitle="O catálogo permanece visível na tela e os cadastros abrem em modal para manter a operação mais limpa."
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div>
            <h3>Catálogo de serviços</h3>
            <p>{produtos.length} item(ns) disponíveis.</p>
          </div>
          <div className="table-actions-toolbar">
            <button className="button button--ghost button--small" type="button" onClick={openNewModal}>
              Novo
            </button>
            <button
              className="button button--ghost button--small"
              type="button"
              disabled={!selectedProduto}
              onClick={() => selectedProduto && startEdit(selectedProduto)}
            >
              Editar
            </button>
            <button
              className="button button--danger button--small"
              type="button"
              disabled={!selectedProduto}
              onClick={() => selectedProduto && void handleDelete(selectedProduto)}
            >
              Excluir
            </button>
          </div>
        </div>

        {selectedProduto ? (
          <div className="selection-note">
            Selecionado: <strong>{selectedProduto.nome}</strong>
          </div>
        ) : null}

        {loading ? <LoadingBlock label="Carregando produtos..." /> : null}
        {!loading && produtos.length === 0 ? <EmptyState message="Nenhum produto cadastrado." /> : null}
        {!loading && produtos.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Conta gerencial</th>
                  <th>Ativo</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto) => (
                  <tr
                    key={produto.id}
                    className={selectedId === produto.id ? 'table-row--selected' : ''}
                    onClick={() => setSelectedId(produto.id)}
                  >
                    <td>
                      <strong>{produto.nome}</strong>
                      <div className="table-subline">{produto.descricao || 'Sem descrição'}</div>
                    </td>
                    <td>{produto.contaGerencialReceita || '—'}</td>
                    <td>{produto.ativo ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Modal
        open={isModalOpen}
        title={editingId ? 'Editar produto/serviço' : 'Novo produto/serviço'}
        subtitle="O catálogo fica organizado por seleção e ações centrais, evitando listas poluídas por botões em cada linha."
        onClose={closeModal}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field field--span-2">
            <label>Nome</label>
            <input value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} required />
          </div>
          <div className="field field--span-2">
            <label>Conta gerencial padrão</label>
            <input
              value={form.contaGerencialReceita}
              onChange={(e) => setForm((c) => ({ ...c, contaGerencialReceita: e.target.value }))}
              placeholder="Receitas / Receitas Operacionais / Consultoria"
            />
          </div>
          <div className="field field--span-2">
            <label>Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} rows={3} />
          </div>
          <div className="field">
            <label>Ordem</label>
            <input type="number" value={form.ordem} onChange={(e) => setForm((c) => ({ ...c, ordem: Number(e.target.value) }))} />
          </div>
          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((c) => ({ ...c, ativo: e.target.checked }))} />
              Ativo
            </label>
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar produto/serviço'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
