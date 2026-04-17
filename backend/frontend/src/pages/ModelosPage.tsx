import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { ModeloDocumento, TipoModeloDocumento } from '../types/api';

const TIPOS: { value: TipoModeloDocumento; label: string }[] = [
  { value: 'CONTRATO', label: 'Contratos' },
  { value: 'PROPOSTA', label: 'Propostas' },
  { value: 'RELATORIO_CONSULTORIA', label: 'Rel. Consultoria' },
  { value: 'RELATORIO_DESLOCAMENTO', label: 'Rel. Deslocamento' },
  { value: 'OUTRO', label: 'Outros' },
];

const initialForm = {
  nome: '',
  descricao: '',
  conteudo: '',
  ativo: true,
  padrao: false,
};

type ModeloForm = typeof initialForm;

function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    return typeof msg === 'string' ? msg : fallback;
  }
  return fallback;
}

export default function ModelosPage() {
  const [tipoAtivo, setTipoAtivo] = useState<TipoModeloDocumento>('CONTRATO');
  const [modelos, setModelos] = useState<ModeloDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModeloForm>(initialForm);

  async function loadModelos(tipo: TipoModeloDocumento) {
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ModeloDocumento[]>(`/modelos-documento?tipo=${tipo}`);
      setModelos(res.data);
    } catch (err) {
      setError(getApiError(err, 'Falha ao carregar modelos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadModelos(tipoAtivo);
  }, [tipoAtivo]);

  function openNew() {
    setForm(initialForm);
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function openEdit(m: ModeloDocumento) {
    setForm({ nome: m.nome, descricao: m.descricao || '', conteudo: m.conteudo, ativo: m.ativo, padrao: m.padrao });
    setEditingId(m.id);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nome: form.nome.trim(),
        ...(form.descricao ? { descricao: form.descricao.trim() } : {}),
        conteudo: form.conteudo,
        ativo: form.ativo,
        padrao: form.padrao,
      };
      if (editingId) {
        await http.put(`/modelos-documento/${editingId}`, payload);
        setSuccess('Modelo atualizado com sucesso.');
      } else {
        await http.post('/modelos-documento', { ...payload, tipo: tipoAtivo });
        setSuccess('Modelo criado com sucesso.');
      }
      closeModal();
      await loadModelos(tipoAtivo);
    } catch (err) {
      setError(getApiError(err, 'Falha ao salvar modelo.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: ModeloDocumento) {
    if (!confirm(`Excluir o modelo "${m.nome}"?`)) return;
    setError(null);
    try {
      await http.delete(`/modelos-documento/${m.id}`);
      setSuccess('Modelo excluído.');
      await loadModelos(tipoAtivo);
    } catch (err) {
      setError(getApiError(err, 'Falha ao excluir modelo.'));
    }
  }

  const tipoLabel = TIPOS.find((t) => t.value === tipoAtivo)?.label ?? tipoAtivo;

  return (
    <div className="page-stack">
      <PageHeader
        title="Modelos de documento"
        subtitle="Repositório centralizado de modelos para contratos, propostas e relatórios. Use variáveis {{chave}} para mesclar dados automaticamente."
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div className="tab-bar">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`tab-bar__item${tipoAtivo === t.value ? ' tab-bar__item--active' : ''}`}
                onClick={() => setTipoAtivo(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button className="button button--ghost button--small" type="button" onClick={openNew}>
            Novo modelo
          </button>
        </div>

        {loading ? <LoadingBlock label="Carregando modelos..." /> : null}

        {!loading && modelos.length === 0 ? (
          <EmptyState message={`Nenhum modelo de ${tipoLabel.toLowerCase()} cadastrado ainda.`} />
        ) : null}

        {!loading && modelos.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {modelos.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.nome}</strong>
                      {m.padrao ? <span className="badge badge--accent" style={{ marginLeft: 6 }}>Padrão</span> : null}
                    </td>
                    <td>{m.descricao || '—'}</td>
                    <td>
                      <span className={`badge ${m.ativo ? 'badge--success' : 'badge--muted'}`}>
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-toolbar">
                        <button className="button button--ghost button--small" type="button" onClick={() => openEdit(m)}>
                          Editar
                        </button>
                        <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(m)}>
                          Excluir
                        </button>
                      </div>
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
        title={editingId ? 'Editar modelo' : `Novo modelo — ${tipoLabel}`}
        subtitle="Use variáveis no formato {{chave}} para mesclar dados do contrato ou proposta automaticamente."
        onClose={closeModal}
      >
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
          <div className="field field--span-2">
            <label>Nome do modelo</label>
            <input value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} required />
          </div>
          <div className="field field--span-2">
            <label>Descrição (opcional)</label>
            <input value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} />
          </div>
          <div className="field field--span-2">
            <label>Conteúdo</label>
            <textarea
              value={form.conteudo}
              onChange={(e) => setForm((c) => ({ ...c, conteudo: e.target.value }))}
              rows={14}
              required
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>
          <div className="field">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((c) => ({ ...c, ativo: e.target.checked }))} />
              Ativo
            </label>
          </div>
          <div className="field">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.padrao} onChange={(e) => setForm((c) => ({ ...c, padrao: e.target.checked }))} />
              Definir como padrão
            </label>
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar modelo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
