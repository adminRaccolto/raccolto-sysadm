import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import SystemNav from '../../components/SystemNav';
import BackButton from '../../components/BackButton';
import type { Fornecedor } from '../../types/api';
import { maskCpfCnpj, maskPhone } from '../../utils/format';

const initialForm = {
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  nomeContato: '',
  telefoneEmpresa: '',
  telefoneContato: '',
  whatsapp: '',
  email: '',
  observacoes: '',
  ativo: true,
};

type FormState = typeof initialForm;

function apiError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    return Array.isArray(msg) ? msg.join(' | ') : msg || fallback;
  }
  return fallback;
}

function toFormState(f: Fornecedor): FormState {
  return {
    razaoSocial: f.razaoSocial,
    nomeFantasia: f.nomeFantasia ?? '',
    cnpj: f.cnpj ?? '',
    logradouro: f.logradouro ?? '',
    numero: f.numero ?? '',
    complemento: f.complemento ?? '',
    bairro: f.bairro ?? '',
    cidade: f.cidade ?? '',
    estado: f.estado ?? '',
    cep: f.cep ?? '',
    nomeContato: f.nomeContato ?? '',
    telefoneEmpresa: f.telefoneEmpresa ?? '',
    telefoneContato: f.telefoneContato ?? '',
    whatsapp: f.whatsapp ?? '',
    email: f.email ?? '',
    observacoes: f.observacoes ?? '',
    ativo: f.ativo,
  };
}

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtroAtivos, setFiltroAtivos] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await http.get<Fornecedor[]>('/fornecedores');
      setFornecedores(res.data);
    } catch (err) {
      setError(apiError(err, 'Falha ao carregar fornecedores.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const lista = useMemo(
    () => filtroAtivos ? fornecedores.filter((f) => f.ativo) : fornecedores,
    [fornecedores, filtroAtivos],
  );

  const selected = useMemo(() => fornecedores.find((f) => f.id === selectedId) ?? null, [fornecedores, selectedId]);

  function openNew() {
    setEditingId(null);
    setForm(initialForm);
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(f: Fornecedor) {
    setSelectedId(f.id);
    setEditingId(f.id);
    setForm(toFormState(f));
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        razaoSocial: form.razaoSocial,
        nomeFantasia: form.nomeFantasia || undefined,
        cnpj: form.cnpj || undefined,
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        cidade: form.cidade || undefined,
        estado: form.estado || undefined,
        cep: form.cep || undefined,
        nomeContato: form.nomeContato || undefined,
        telefoneEmpresa: form.telefoneEmpresa || undefined,
        telefoneContato: form.telefoneContato || undefined,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        observacoes: form.observacoes || undefined,
        ativo: form.ativo,
      };

      if (editingId) {
        await http.put(`/fornecedores/${editingId}`, payload);
        setSuccess('Fornecedor atualizado.');
      } else {
        const res = await http.post<Fornecedor>('/fornecedores', payload);
        setSelectedId(res.data.id);
        setSuccess('Fornecedor cadastrado.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: Fornecedor) {
    if (!window.confirm(`Excluir "${f.razaoSocial}"? Isso removerá o vínculo com funcionários PJ.`)) return;
    try {
      await http.delete(`/fornecedores/${f.id}`);
      setSuccess('Fornecedor excluído.');
      if (selectedId === f.id) setSelectedId(null);
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Falha ao excluir.'));
    }
  }

  return (
    <div className="page-stack">
      <BackButton />
      <PageHeader
        title="Fornecedores"
        subtitle="Empresas fornecedoras e prestadores de serviço PJ."
        chips={[{ label: `${fornecedores.filter((f) => f.ativo).length} ativo(s)` }]}
      />
      <SystemNav />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div>
            <h3>Lista de fornecedores</h3>
            <p>{lista.length} registro(s)</p>
          </div>
          <div className="header-tools">
            <div className="segmented">
              <button type="button" className={`segmented__button${filtroAtivos ? ' segmented__button--active' : ''}`} onClick={() => setFiltroAtivos(true)}>Ativos</button>
              <button type="button" className={`segmented__button${!filtroAtivos ? ' segmented__button--active' : ''}`} onClick={() => setFiltroAtivos(false)}>Todos</button>
            </div>
            <div className="table-actions-toolbar">
              <button className="button button--ghost button--small" type="button" onClick={openNew}>Novo</button>
              <button className="button button--ghost button--small" type="button" disabled={!selected} onClick={() => selected && openEdit(selected)}>Editar</button>
              <button className="button button--danger button--small" type="button" disabled={!selected} onClick={() => selected && void handleDelete(selected)}>Excluir</button>
            </div>
          </div>
        </div>

        {loading ? <LoadingBlock label="Carregando..." /> : null}
        {!loading && lista.length === 0 ? <EmptyState message="Nenhum fornecedor cadastrado." /> : null}
        {!loading && lista.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Razão Social / Fantasia</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th>Telefone empresa</th>
                  <th>Cidade / UF</th>
                  <th>Funcionários PJ</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((f) => (
                  <tr key={f.id} className={selectedId === f.id ? 'table-row--selected' : ''} onClick={() => setSelectedId(f.id)}>
                    <td>
                      <strong>{f.razaoSocial}</strong>
                      {f.nomeFantasia ? <div className="table-subline">{f.nomeFantasia}</div> : null}
                      {!f.ativo ? <span className="badge badge--muted" style={{ marginLeft: 6, fontSize: 10 }}>Inativo</span> : null}
                    </td>
                    <td>{f.cnpj ?? '—'}</td>
                    <td>
                      {f.nomeContato ?? '—'}
                      {f.telefoneContato ? <div className="table-subline">{f.telefoneContato}{f.whatsapp ? ` / WA: ${f.whatsapp}` : ''}</div> : null}
                    </td>
                    <td>{f.telefoneEmpresa ?? '—'}</td>
                    <td>{[f.cidade, f.estado].filter(Boolean).join(' / ') || '—'}</td>
                    <td>{f._count?.funcionarios ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Modal open={isModalOpen} title={editingId ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={closeModal}>
        <form className="form-grid form-grid--4" onSubmit={handleSubmit}>

          <div className="field field--span-2">
            <label>Razão Social *</label>
            <input value={form.razaoSocial} onChange={(e) => setForm((c) => ({ ...c, razaoSocial: e.target.value }))} required />
          </div>

          <div className="field field--span-2">
            <label>Nome Fantasia</label>
            <input value={form.nomeFantasia} onChange={(e) => setForm((c) => ({ ...c, nomeFantasia: e.target.value }))} />
          </div>

          <div className="field field--span-2">
            <label>CNPJ</label>
            <input value={form.cnpj} onChange={(e) => setForm((c) => ({ ...c, cnpj: maskCpfCnpj(e.target.value) }))} placeholder="00.000.000/0000-00" />
          </div>

          <div className="field">
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </div>

          <div className="field">
            <label>Telefone da empresa</label>
            <input value={form.telefoneEmpresa} onChange={(e) => setForm((c) => ({ ...c, telefoneEmpresa: maskPhone(e.target.value) }))} placeholder="(00) 0000-0000" />
          </div>

          {/* Endereço */}
          <div className="field field--span-2">
            <label>Logradouro</label>
            <input value={form.logradouro} onChange={(e) => setForm((c) => ({ ...c, logradouro: e.target.value }))} />
          </div>

          <div className="field">
            <label>Número</label>
            <input value={form.numero} onChange={(e) => setForm((c) => ({ ...c, numero: e.target.value }))} />
          </div>

          <div className="field">
            <label>Complemento</label>
            <input value={form.complemento} onChange={(e) => setForm((c) => ({ ...c, complemento: e.target.value }))} />
          </div>

          <div className="field">
            <label>Bairro</label>
            <input value={form.bairro} onChange={(e) => setForm((c) => ({ ...c, bairro: e.target.value }))} />
          </div>

          <div className="field">
            <label>Cidade</label>
            <input value={form.cidade} onChange={(e) => setForm((c) => ({ ...c, cidade: e.target.value }))} />
          </div>

          <div className="field">
            <label>Estado</label>
            <input value={form.estado} onChange={(e) => setForm((c) => ({ ...c, estado: e.target.value }))} maxLength={2} placeholder="SP" />
          </div>

          <div className="field">
            <label>CEP</label>
            <input value={form.cep} onChange={(e) => setForm((c) => ({ ...c, cep: e.target.value }))} placeholder="00000-000" />
          </div>

          {/* Contato */}
          <div className="field field--span-2">
            <label>Nome do contato</label>
            <input value={form.nomeContato} onChange={(e) => setForm((c) => ({ ...c, nomeContato: e.target.value }))} />
          </div>

          <div className="field">
            <label>Telefone do contato</label>
            <input value={form.telefoneContato} onChange={(e) => setForm((c) => ({ ...c, telefoneContato: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
          </div>

          <div className="field">
            <label>WhatsApp do contato</label>
            <input value={form.whatsapp} onChange={(e) => setForm((c) => ({ ...c, whatsapp: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
          </div>

          <div className="field field--span-3">
            <label>Observações</label>
            <textarea rows={2} value={form.observacoes} onChange={(e) => setForm((c) => ({ ...c, observacoes: e.target.value }))} />
          </div>

          <div className="field field--checkbox">
            <label>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((c) => ({ ...c, ativo: e.target.checked }))} />
              Ativo
            </label>
          </div>

          <div className="field field--span-4">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar fornecedor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
