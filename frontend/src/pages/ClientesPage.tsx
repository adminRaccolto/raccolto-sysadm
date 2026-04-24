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

const ARATO_URL = import.meta.env.VITE_ARATO_URL as string | undefined;
const ARATO_KEY = import.meta.env.VITE_ARATO_ADMIN_KEY as string | undefined;

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
  // Ativar no Arato
  ativarArato:    false,
  aratoFazArea:   '',
  aratoUserNome:  '',
  aratoUserEmail: '',
  aratoUserSenha: 'Arato@2025',
};

type AratoCredenciais = { user_email: string; user_senha: string };

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
  const [aratoCredenciais, setAratoCredenciais] = useState<AratoCredenciais | null>(null);
  const [copiado, setCopiado] = useState(false);

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
      ativarArato: false,
      aratoFazArea: '',
      aratoUserNome: '',
      aratoUserEmail: '',
      aratoUserSenha: 'Arato@2025',
    });
    setAratoCredenciais(null);
    setSuccess(null);
    setError(null);
    setIsModalOpen(true);
  }

  async function ativarNoArato(): Promise<AratoCredenciais | null> {
    if (!ARATO_URL || !ARATO_KEY) return null;
    try {
      const tipo = form.tipoPessoa === 'PESSOA_FISICA' ? 'pf' : 'pj';
      const res = await fetch(`${ARATO_URL}/api/admin/novo-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ARATO_KEY },
        body: JSON.stringify({
          tipo,
          nome:             form.razaoSocial,
          cpf_cnpj:         form.cpfCnpj,
          email_cliente:    form.email,
          telefone:         form.telefone,
          municipio_cliente:form.cidade,
          estado_cliente:   form.estado,
          fazenda_nome:     form.nomeFazenda || form.razaoSocial,
          fazenda_municipio:form.cidade,
          fazenda_estado:   form.estado,
          fazenda_area:     form.aratoFazArea,
          user_nome:        form.aratoUserNome,
          user_email:       form.aratoUserEmail,
          user_senha:       form.aratoUserSenha,
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? 'Erro desconhecido');
      return { user_email: form.aratoUserEmail, user_senha: form.aratoUserSenha };
    } catch (err) {
      setError('Arato: ' + String(err).replace('Error: ', ''));
      return null;
    }
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ativarArato, aratoFazArea, aratoUserNome, aratoUserEmail, aratoUserSenha, ...formBase } = form;
      const payload = {
        ...formBase,
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
        if (form.ativarArato) {
          const cred = await ativarNoArato();
          if (cred) {
            setAratoCredenciais(cred);
            setSuccess('Cliente cadastrado e ativado no Arato.');
          } else {
            setSuccess('Cliente cadastrado. Falha ao ativar no Arato (ver erro acima).');
          }
        } else {
          setSuccess('Cliente cadastrado com sucesso.');
        }
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

      {aratoCredenciais ? (
        <div style={{
          background: '#e8faf2', border: '1px solid #1f9d6840', borderRadius: 14,
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1f9d68', marginBottom: 6 }}>
              ✓ Acesso Arato criado — envie as credenciais ao cliente
            </div>
            <div style={{ fontSize: 13 }}>
              <b>E-mail:</b> {aratoCredenciais.user_email} &nbsp;|&nbsp;
              <b>Senha provisória:</b>{' '}
              <code style={{ fontFamily: 'monospace', background: '#d1fae5', padding: '1px 6px', borderRadius: 4 }}>
                {aratoCredenciais.user_senha}
              </code>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              O cliente será obrigado a trocar a senha no primeiro acesso.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              className="button button--ghost button--small"
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(
                  `E-mail: ${aratoCredenciais.user_email}\nSenha provisória: ${aratoCredenciais.user_senha}`
                );
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2500);
              }}
            >
              {copiado ? '✓ Copiado!' : 'Copiar'}
            </button>
            <button
              className="button button--ghost button--small"
              type="button"
              onClick={() => setAratoCredenciais(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}

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

          {/* ── Ativar no Arato ── */}
          <>
              <div className="field field--span-2 field--checkbox" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                <label htmlFor="ativar-arato" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    id="ativar-arato"
                    type="checkbox"
                    checked={form.ativarArato}
                    onChange={(e) => setForm((c) => ({ ...c, ativarArato: e.target.checked }))}
                  />
                  <span>
                    <strong>Ativar no Arato</strong>
                    <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>
                      — cria fazenda e login provisório no sistema agrícola
                    </span>
                  </span>
                </label>
              </div>

              {form.ativarArato ? (
                <>
                  <div className="field">
                    <label>Área da fazenda (ha)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={form.aratoFazArea}
                      onChange={(e) => setForm((c) => ({ ...c, aratoFazArea: e.target.value }))}
                      placeholder="1500"
                    />
                  </div>
                  <div className="field">
                    <label>Nome do usuário admin *</label>
                    <input
                      value={form.aratoUserNome}
                      onChange={(e) => setForm((c) => ({ ...c, aratoUserNome: e.target.value }))}
                      placeholder="João da Silva"
                      required={form.ativarArato}
                    />
                  </div>
                  <div className="field">
                    <label>E-mail de acesso ao Arato *</label>
                    <input
                      type="email"
                      value={form.aratoUserEmail}
                      onChange={(e) => setForm((c) => ({ ...c, aratoUserEmail: e.target.value }))}
                      placeholder="joao@fazenda.com.br"
                      required={form.ativarArato}
                    />
                  </div>
                  <div className="field">
                    <label>Senha provisória *</label>
                    <input
                      value={form.aratoUserSenha}
                      onChange={(e) => setForm((c) => ({ ...c, aratoUserSenha: e.target.value }))}
                      required={form.ativarArato}
                      style={{ fontFamily: 'monospace' }}
                    />
                    <small>O cliente será obrigado a trocar no primeiro acesso.</small>
                  </div>
                </>
              ) : null}
          </>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving
                ? 'Salvando...'
                : editingId
                  ? 'Salvar alterações'
                  : form.ativarArato
                    ? 'Cadastrar e ativar no Arato'
                    : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
