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
import type { Funcionario } from '../../types/api';

const initialForm = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  cargo: '',
  vinculo: 'CLT',
  salario: '',
  dataAdmissao: '',
  dataDemissao: '',
  dataNascimento: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  contaBancariaNome: '',
  contaBancariaAgencia: '',
  contaBancariaConta: '',
  contaBancariaBanco: '',
  contaBancariaPix: '',
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

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toFormState(f: Funcionario): FormState {
  return {
    nome: f.nome,
    cpf: f.cpf ?? '',
    email: f.email ?? '',
    telefone: f.telefone ?? '',
    cargo: f.cargo ?? '',
    vinculo: f.vinculo,
    salario: f.salario != null ? String(f.salario) : '',
    dataAdmissao: f.dataAdmissao ? f.dataAdmissao.slice(0, 10) : '',
    dataDemissao: f.dataDemissao ? f.dataDemissao.slice(0, 10) : '',
    dataNascimento: f.dataNascimento ? f.dataNascimento.slice(0, 10) : '',
    logradouro: f.logradouro ?? '',
    numero: f.numero ?? '',
    complemento: f.complemento ?? '',
    bairro: f.bairro ?? '',
    cidade: f.cidade ?? '',
    estado: f.estado ?? '',
    cep: f.cep ?? '',
    contaBancariaNome: f.contaBancariaNome ?? '',
    contaBancariaAgencia: f.contaBancariaAgencia ?? '',
    contaBancariaConta: f.contaBancariaConta ?? '',
    contaBancariaBanco: f.contaBancariaBanco ?? '',
    contaBancariaPix: f.contaBancariaPix ?? '',
    observacoes: f.observacoes ?? '',
    ativo: f.ativo,
  };
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [tab, setTab] = useState<'dados' | 'endereco' | 'pagamento'>('dados');
  const [showInativos, setShowInativos] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await http.get<Funcionario[]>('/funcionarios');
      setFuncionarios(res.data);
    } catch (err) {
      setError(apiError(err, 'Falha ao carregar funcionários.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openNew() {
    setForm(initialForm);
    setEditingId(null);
    setError(null);
    setTab('dados');
    setOpen(true);
  }

  function openEdit(f: Funcionario) {
    setForm(toFormState(f));
    setEditingId(f.id);
    setError(null);
    setTab('dados');
    setOpen(true);
  }

  function closeModal() { if (saving) return; setOpen(false); }

  function field(key: keyof FormState) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((x) => ({ ...x, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      salario: form.salario ? parseFloat(form.salario) : null,
      dataAdmissao: form.dataAdmissao || null,
      dataDemissao: form.dataDemissao || null,
      dataNascimento: form.dataNascimento || null,
      cpf: form.cpf || null,
      email: form.email || null,
      telefone: form.telefone || null,
      cargo: form.cargo || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      cep: form.cep || null,
      contaBancariaNome: form.contaBancariaNome || null,
      contaBancariaAgencia: form.contaBancariaAgencia || null,
      contaBancariaConta: form.contaBancariaConta || null,
      contaBancariaBanco: form.contaBancariaBanco || null,
      contaBancariaPix: form.contaBancariaPix || null,
      observacoes: form.observacoes || null,
    };
    try {
      if (editingId) {
        await http.put(`/funcionarios/${editingId}`, payload);
        setSuccess('Funcionário atualizado.');
      } else {
        await http.post('/funcionarios', payload);
        setSuccess('Funcionário cadastrado.');
      }
      closeModal();
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar funcionário.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: Funcionario) {
    if (!confirm(`Excluir funcionário "${f.nome}"?`)) return;
    try {
      await http.delete(`/funcionarios/${f.id}`);
      setSuccess('Funcionário excluído.');
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao excluir funcionário.'));
    }
  }

  const lista = showInativos ? funcionarios : funcionarios.filter((f) => f.ativo);

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Funcionários"
        subtitle="Cadastro de colaboradores CLT e prestadores PJ vinculados à empresa."
        actions={<BackButton fallbackPath="/sistema" />}
      />
      <SystemNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel panel--compact">
        <div className="panel__header panel__header--row panel__header--sticky">
          <h3>Funcionários</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="checkbox-label" style={{ fontSize: 13 }}>
              <input type="checkbox" checked={showInativos} onChange={(e) => setShowInativos(e.target.checked)} />
              Mostrar inativos
            </label>
            <button className="button button--ghost button--small" type="button" onClick={openNew}>+ Novo funcionário</button>
          </div>
        </div>
        {loading ? <LoadingBlock label="Carregando..." /> : null}
        {!loading && lista.length === 0 ? <EmptyState message="Nenhum funcionário cadastrado." /> : null}
        {!loading && lista.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Cargo</th>
                  <th>Vínculo</th>
                  <th>Salário</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((f) => (
                  <tr key={f.id}>
                    <td><strong>{f.nome}</strong></td>
                    <td>{f.cpf ?? '—'}</td>
                    <td>{f.cargo ?? '—'}</td>
                    <td><span className="badge badge--muted">{f.vinculo}</span></td>
                    <td>{fmt(f.salario)}</td>
                    <td>
                      <span className={`badge ${f.ativo ? 'badge--success' : 'badge--muted'}`}>
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-toolbar">
                        <button className="button button--ghost button--small" type="button" onClick={() => openEdit(f)}>Editar</button>
                        <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(f)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={open} title={editingId ? 'Editar funcionário' : 'Novo funcionário'} onClose={closeModal}>
        <div className="tab-pills" style={{ marginBottom: 16 }}>
          <button type="button" className={`tab-pill${tab === 'dados' ? ' tab-pill--active' : ''}`} onClick={() => setTab('dados')}>Dados</button>
          <button type="button" className={`tab-pill${tab === 'endereco' ? ' tab-pill--active' : ''}`} onClick={() => setTab('endereco')}>Endereço</button>
          <button type="button" className={`tab-pill${tab === 'pagamento' ? ' tab-pill--active' : ''}`} onClick={() => setTab('pagamento')}>Dados Bancários</button>
        </div>
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
          {tab === 'dados' && (
            <>
              <div className="field field--span-2">
                <label>Nome completo</label>
                <input {...field('nome')} required />
              </div>
              <div className="field">
                <label>CPF</label>
                <input {...field('cpf')} placeholder="000.000.000-00" />
              </div>
              <div className="field">
                <label>Data de nascimento</label>
                <input type="date" {...field('dataNascimento')} />
              </div>
              <div className="field">
                <label>E-mail</label>
                <input type="email" {...field('email')} />
              </div>
              <div className="field">
                <label>Telefone</label>
                <input {...field('telefone')} placeholder="(00) 00000-0000" />
              </div>
              <div className="field">
                <label>Cargo / Função</label>
                <input {...field('cargo')} />
              </div>
              <div className="field">
                <label>Vínculo</label>
                <select value={form.vinculo} onChange={(e) => setForm((x) => ({ ...x, vinculo: e.target.value }))}>
                  <option value="CLT">CLT</option>
                  <option value="PJ">PJ</option>
                </select>
              </div>
              <div className="field">
                <label>Salário / Remuneração (R$)</label>
                <input type="number" step="0.01" {...field('salario')} placeholder="0,00" />
              </div>
              <div className="field">
                <label>Data de admissão</label>
                <input type="date" {...field('dataAdmissao')} />
              </div>
              <div className="field">
                <label>Data de demissão</label>
                <input type="date" {...field('dataDemissao')} />
              </div>
              <div className="field field--span-2">
                <label>Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm((x) => ({ ...x, observacoes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="field">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((x) => ({ ...x, ativo: e.target.checked }))} />
                  Ativo
                </label>
              </div>
            </>
          )}

          {tab === 'endereco' && (
            <>
              <div className="field">
                <label>CEP</label>
                <input {...field('cep')} placeholder="00000-000" />
              </div>
              <div className="field field--span-2">
                <label>Logradouro</label>
                <input {...field('logradouro')} />
              </div>
              <div className="field">
                <label>Número</label>
                <input {...field('numero')} />
              </div>
              <div className="field">
                <label>Complemento</label>
                <input {...field('complemento')} />
              </div>
              <div className="field">
                <label>Bairro</label>
                <input {...field('bairro')} />
              </div>
              <div className="field">
                <label>Cidade</label>
                <input {...field('cidade')} />
              </div>
              <div className="field">
                <label>Estado</label>
                <select value={form.estado} onChange={(e) => setForm((x) => ({ ...x, estado: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {tab === 'pagamento' && (
            <>
              <div className="field field--span-2">
                <label>Banco para pagamento</label>
                <input {...field('contaBancariaBanco')} placeholder="Ex.: Itaú, Bradesco..." />
              </div>
              <div className="field">
                <label>Nome do titular</label>
                <input {...field('contaBancariaNome')} />
              </div>
              <div className="field">
                <label>Agência</label>
                <input {...field('contaBancariaAgencia')} placeholder="0001" />
              </div>
              <div className="field field--span-2">
                <label>Conta</label>
                <input {...field('contaBancariaConta')} placeholder="12345-6" />
              </div>
              <div className="field field--span-2">
                <label>Chave PIX</label>
                <input {...field('contaBancariaPix')} placeholder="CPF, e-mail, telefone ou chave aleatória" />
              </div>
            </>
          )}

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
