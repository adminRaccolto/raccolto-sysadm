import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import SystemNav from '../../components/SystemNav';
import BackButton from '../../components/BackButton';
import type { Banco } from '../../types/api';

const initialForm = { codigo: '', nome: '', ativo: true };

function apiError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    return Array.isArray(msg) ? msg.join(' | ') : msg || fallback;
  }
  return fallback;
}

export default function BancosPage() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  async function load() {
    setLoading(true);
    try {
      const res = await http.get<Banco[]>('/bancos');
      setBancos(res.data);
    } catch (err) {
      setError(apiError(err, 'Falha ao carregar bancos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openNew() { setForm(initialForm); setEditingId(null); setError(null); setOpen(true); }
  function openEdit(b: Banco) { setForm({ codigo: b.codigo, nome: b.nome, ativo: b.ativo }); setEditingId(b.id); setError(null); setOpen(true); }
  function closeModal() { if (saving) return; setOpen(false); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      if (editingId) {
        await http.put(`/bancos/${editingId}`, form);
        setSuccess('Banco atualizado.');
      } else {
        await http.post('/bancos', form);
        setSuccess('Banco cadastrado.');
      }
      closeModal();
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar banco.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: Banco) {
    if (!confirm(`Excluir banco "${b.nome}"?`)) return;
    try {
      await http.delete(`/bancos/${b.id}`);
      setSuccess('Banco excluído.');
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao excluir banco.'));
    }
  }

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader title="Bancos" subtitle="Cadastro de bancos disponíveis para vínculo nas contas bancárias." actions={<BackButton fallbackPath="/sistema" />} />
      <SystemNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel panel--compact">
        <div className="panel__header panel__header--row panel__header--sticky">
          <h3>Bancos cadastrados</h3>
          <button className="button button--ghost button--small" type="button" onClick={openNew}>+ Novo banco</button>
        </div>
        {loading ? <LoadingBlock label="Carregando..." /> : null}
        {!loading && bancos.length === 0 ? <EmptyState message="Nenhum banco cadastrado." /> : null}
        {!loading && bancos.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Código</th><th>Nome</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {bancos.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.codigo}</strong></td>
                    <td>{b.nome}</td>
                    <td><span className={`badge ${b.ativo ? 'badge--success' : 'badge--muted'}`}>{b.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                      <div className="table-actions-toolbar">
                        <button className="button button--ghost button--small" type="button" onClick={() => openEdit(b)}>Editar</button>
                        <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(b)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={open} title={editingId ? 'Editar banco' : 'Novo banco'} onClose={closeModal}>
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
          <div className="field">
            <label>Código BACEN</label>
            <input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="Ex.: 001" required />
          </div>
          <div className="field">
            <label>Nome do banco</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          </div>
          <div className="field">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} />
              Ativo
            </label>
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
