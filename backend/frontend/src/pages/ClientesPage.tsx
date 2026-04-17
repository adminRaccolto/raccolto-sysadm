import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import type { Cliente, StatusCliente, TipoPessoa } from '../types/api';
import { formatDate, labelize, maskCep, maskCpfCnpj, maskPhone, onlyDigits } from '../utils/format';

const initialForm = {
  tipoPessoa: 'PESSOA_JURIDICA' as TipoPessoa,
  razaoSocial: '',
  nomeFantasia: '',
  cpfCnpj: '',
  inscricaoEstadual: '',
  email: '',
  telefone: '',
  whatsapp: '',
  contatoPrincipal: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  nomeFazenda: '',
  distanciaKm: '',
  precoKmReembolso: '',
  status: 'ATIVO' as StatusCliente,
};

type ClienteForm = typeof initialForm;

type ViaCepResponse = {
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === selectedId) ?? null,
    [clientes, selectedId],
  );

  async function loadClientes() {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get<Cliente[]>('/clientes');
      setClientes(response.data);
      if (!selectedId && response.data.length > 0) {
        setSelectedId(response.data[0].id);
      }
    } catch (err) {
      handleApiError(err, 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClientes();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function openNewModal() {
    resetForm();
    setIsModalOpen(true);
    setSuccess(null);
    setError(null);
  }

  function closeModal() {
    if (saving) return;
    resetForm();
    setIsModalOpen(false);
  }

  function startEdit(cliente: Cliente) {
    setSelectedId(cliente.id);
    setEditingId(cliente.id);
    setForm({
      tipoPessoa: cliente.tipoPessoa,
      razaoSocial: cliente.razaoSocial,
      nomeFantasia: cliente.nomeFantasia || '',
      cpfCnpj: cliente.cpfCnpj || '',
      inscricaoEstadual: cliente.inscricaoEstadual || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      whatsapp: cliente.whatsapp || '',
      contatoPrincipal: cliente.contatoPrincipal || '',
      cep: cliente.cep || '',
      logradouro: cliente.logradouro || '',
      numero: cliente.numero || '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      nomeFazenda: cliente.nomeFazenda || '',
      distanciaKm: cliente.distanciaKm != null ? String(cliente.distanciaKm) : '',
      precoKmReembolso: cliente.precoKmReembolso != null ? String(cliente.precoKmReembolso) : '',
      status: cliente.status,
    });
    setSuccess(null);
    setError(null);
    setIsModalOpen(true);
  }

  async function handleCepBlur() {
    const cep = onlyDigits(form.cep);
    if (cep.length !== 8) return;

    setLoadingCep(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        setError('CEP não encontrado para preenchimento automático.');
        return;
      }

      setForm((current) => ({
        ...current,
        logradouro: data.logradouro || current.logradouro,
        complemento: current.complemento || data.complemento || '',
        bairro: data.bairro || current.bairro,
        cidade: data.localidade || current.cidade,
        estado: data.uf || current.estado,
      }));
    } catch {
      setError('Não foi possível consultar o CEP agora.');
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...form,
        nomeFantasia: form.nomeFantasia || undefined,
        cpfCnpj: form.cpfCnpj || undefined,
        inscricaoEstadual: form.inscricaoEstadual || undefined,
        email: form.email || undefined,
        telefone: form.telefone || undefined,
        whatsapp: form.whatsapp || undefined,
        contatoPrincipal: form.contatoPrincipal || undefined,
        cep: form.cep || undefined,
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        cidade: form.cidade || undefined,
        estado: form.estado || undefined,
        nomeFazenda: form.nomeFazenda || undefined,
        distanciaKm: form.distanciaKm ? parseFloat(form.distanciaKm) : undefined,
        precoKmReembolso: form.precoKmReembolso ? parseFloat(form.precoKmReembolso) : undefined,
      };

      if (editingId) {
        await http.put(`/clientes/${editingId}`, payload);
        setSuccess('Cliente atualizado com sucesso.');
      } else {
        await http.post('/clientes', payload);
        setSuccess('Cliente cadastrado com sucesso.');
      }
      closeModal();
      await loadClientes();
    } catch (err) {
      handleApiError(err, editingId ? 'Falha ao atualizar cliente.' : 'Falha ao cadastrar cliente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cliente: Cliente) {
    const confirmed = window.confirm(
      `Excluir o cliente ${cliente.razaoSocial}? Essa ação só funciona se não houver vínculos operacionais.`,
    );
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    try {
      await http.delete(`/clientes/${cliente.id}`);
      setSuccess('Cliente excluído com sucesso.');
      if (editingId === cliente.id) closeModal();
      await loadClientes();
    } catch (err) {
      handleApiError(err, 'Falha ao excluir cliente.');
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
        title="Clientes"
        subtitle="A base de clientes permanece visível na tela e os cadastros abrem em modal para edição e inclusão mais rápidas."
        chips={loading ? [] : [
          { label: `${clientes.filter((c) => c.status === 'ATIVO').length} ativos` },
          ...(clientes.filter((c) => c.status !== 'ATIVO').length > 0
            ? [{ label: `${clientes.filter((c) => c.status !== 'ATIVO').length} inativos` }]
            : []),
        ]}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div>
            <h3>Base atual</h3>
            <p>{clientes.length} cliente(s) cadastrados.</p>
          </div>
          <div className="table-actions-toolbar">
            <button className="button button--ghost button--small" type="button" onClick={openNewModal}>
              Novo
            </button>
            <button
              className="button button--ghost button--small"
              type="button"
              disabled={!selectedCliente}
              onClick={() => selectedCliente && startEdit(selectedCliente)}
            >
              Editar
            </button>
            <button
              className="button button--danger button--small"
              type="button"
              disabled={!selectedCliente}
              onClick={() => selectedCliente && void handleDelete(selectedCliente)}
            >
              Excluir
            </button>
          </div>
        </div>

        {selectedCliente ? (
          <div className="selection-note">
            Selecionado: <strong>{selectedCliente.razaoSocial}</strong>
          </div>
        ) : null}

        {loading ? <LoadingBlock label="Carregando clientes..." /> : null}
        {!loading && clientes.length === 0 ? (
          <EmptyState message="Cadastre o primeiro cliente para começar a operação." />
        ) : null}

        {!loading && clientes.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contato</th>
                  <th>Endereço</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className={selectedId === cliente.id ? 'table-row--selected' : ''}
                    onClick={() => setSelectedId(cliente.id)}
                  >
                    <td>
                      <strong>{cliente.razaoSocial}</strong>
                      <div className="table-subline">{labelize(cliente.tipoPessoa)} · {labelize(cliente.status)}</div>
                    </td>
                    <td>
                      {cliente.cpfCnpj || '—'}
                      <div className="table-subline">IE: {cliente.inscricaoEstadual || '—'}</div>
                    </td>
                    <td>
                      {cliente.whatsapp || cliente.telefone || cliente.email || '—'}
                      <div className="table-subline">{cliente.contatoPrincipal || 'Sem contato principal'}</div>
                    </td>
                    <td>
                      {cliente.logradouro || '—'}
                      <div className="table-subline">{cliente.cidade || '—'} / {cliente.estado || '—'} · Criado em {formatDate(cliente.createdAt)}</div>
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
        title={editingId ? 'Editar cliente' : 'Novo cliente'}
        subtitle="O CEP já pode puxar o endereço base automaticamente."
        onClose={closeModal}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label>Tipo de pessoa</label>
            <select value={form.tipoPessoa} onChange={(e) => setForm((c) => ({ ...c, tipoPessoa: e.target.value as TipoPessoa }))}>
              <option value="PESSOA_JURIDICA">Pessoa jurídica</option>
              <option value="PESSOA_FISICA">Pessoa física</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as StatusCliente }))}>
              <option value="PROSPECT">Prospect</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>

          <div className="field field--span-2">
            <label>{form.tipoPessoa === 'PESSOA_JURIDICA' ? 'Razão social' : 'Nome completo'}</label>
            <input value={form.razaoSocial} onChange={(e) => setForm((c) => ({ ...c, razaoSocial: e.target.value }))} required />
          </div>

          <div className="field">
            <label>Nome fantasia</label>
            <input value={form.nomeFantasia} onChange={(e) => setForm((c) => ({ ...c, nomeFantasia: e.target.value }))} />
          </div>
          <div className="field">
            <label>{form.tipoPessoa === 'PESSOA_JURIDICA' ? 'CNPJ' : 'CPF'}</label>
            <input value={form.cpfCnpj} onChange={(e) => setForm((c) => ({ ...c, cpfCnpj: maskCpfCnpj(e.target.value) }))} />
          </div>

          <div className="field">
            <label>Inscrição estadual</label>
            <input value={form.inscricaoEstadual} onChange={(e) => setForm((c) => ({ ...c, inscricaoEstadual: e.target.value }))} />
          </div>
          <div className="field">
            <label>Contato principal</label>
            <input value={form.contatoPrincipal} onChange={(e) => setForm((c) => ({ ...c, contatoPrincipal: e.target.value }))} />
          </div>

          <div className="field">
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Telefone</label>
            <input value={form.telefone} onChange={(e) => setForm((c) => ({ ...c, telefone: maskPhone(e.target.value) }))} />
          </div>

          <div className="field">
            <label>WhatsApp</label>
            <input value={form.whatsapp} onChange={(e) => setForm((c) => ({ ...c, whatsapp: maskPhone(e.target.value) }))} />
          </div>
          <div className="field">
            <label>CEP</label>
            <input
              value={form.cep}
              onChange={(e) => setForm((c) => ({ ...c, cep: maskCep(e.target.value) }))}
              onBlur={() => void handleCepBlur()}
              placeholder="00000-000"
            />
            {loadingCep ? <small>Buscando endereço...</small> : <small>Ao sair do campo, o endereço base é preenchido automaticamente.</small>}
          </div>

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
            <label>UF</label>
            <input value={form.estado} maxLength={2} onChange={(e) => setForm((c) => ({ ...c, estado: e.target.value.toUpperCase() }))} />
          </div>

          <div className="field field--span-2">
            <label>Nome da fazenda / propriedade</label>
            <input value={form.nomeFazenda} onChange={(e) => setForm((c) => ({ ...c, nomeFazenda: e.target.value }))} placeholder="Ex.: Fazenda São João" />
          </div>
          <div className="field">
            <label>Distância p/ deslocamento (km)</label>
            <input type="number" min="0" step="0.1" value={form.distanciaKm} onChange={(e) => setForm((c) => ({ ...c, distanciaKm: e.target.value }))} placeholder="0" />
          </div>
          <div className="field">
            <label>Preço por km (R$)</label>
            <input type="number" min="0" step="0.01" value={form.precoKmReembolso} onChange={(e) => setForm((c) => ({ ...c, precoKmReembolso: e.target.value }))} placeholder="0,00" />
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
