import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import SystemNav from '../../components/SystemNav';
import BackButton from '../../components/BackButton';
import type { Fornecedor, Funcionario } from '../../types/api';
import { formatDate } from '../../utils/format';

function calcIdade(dataNascimento: string | null | undefined): string {
  if (!dataNascimento) return '—';
  const nasc = new Date(dataNascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
  return `${anos} anos`;
}

const initialForm = {
  nome: '',
  documento: '',
  tipoDocumento: 'CPF',
  email: '',
  telefone: '',
  sexo: '',
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
  usuarioId: '',
  fornecedorId: '',
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

function toFormState(f: Funcionario): FormState {
  return {
    nome: f.nome,
    documento: f.documento ?? f.cpf ?? '',
    tipoDocumento: f.tipoDocumento ?? 'CPF',
    email: f.email ?? '',
    telefone: f.telefone ?? '',
    sexo: f.sexo ?? '',
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
    usuarioId: f.usuarioId ?? '',
    fornecedorId: f.fornecedorId ?? '',
    observacoes: f.observacoes ?? '',
    ativo: f.ativo,
  };
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtroAtivos, setFiltroAtivos] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [fRes, fornRes] = await Promise.all([
        http.get<Funcionario[]>('/funcionarios'),
        http.get<Fornecedor[]>('/fornecedores'),
      ]);
      setFuncionarios(fRes.data);
      setFornecedores(fornRes.data);
    } catch (err) {
      setError(apiError(err, 'Falha ao carregar dados.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const lista = useMemo(
    () => filtroAtivos ? funcionarios.filter((f) => f.ativo) : funcionarios,
    [funcionarios, filtroAtivos],
  );

  const selected = useMemo(() => funcionarios.find((f) => f.id === selectedId) ?? null, [funcionarios, selectedId]);

  function openNew() {
    setEditingId(null);
    setForm(initialForm);
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(f: Funcionario) {
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
        nome: form.nome,
        documento: form.documento || undefined,
        tipoDocumento: form.tipoDocumento || undefined,
        email: form.email || undefined,
        telefone: form.telefone || undefined,
        sexo: form.sexo || undefined,
        cargo: form.cargo || undefined,
        vinculo: form.vinculo,
        salario: form.salario ? Number(form.salario) : undefined,
        dataAdmissao: form.dataAdmissao || undefined,
        dataDemissao: form.dataDemissao || undefined,
        dataNascimento: form.dataNascimento || undefined,
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        cidade: form.cidade || undefined,
        estado: form.estado || undefined,
        cep: form.cep || undefined,
        contaBancariaNome: form.contaBancariaNome || undefined,
        contaBancariaAgencia: form.contaBancariaAgencia || undefined,
        contaBancariaConta: form.contaBancariaConta || undefined,
        contaBancariaBanco: form.contaBancariaBanco || undefined,
        contaBancariaPix: form.contaBancariaPix || undefined,
        fornecedorId: form.vinculo === 'PJ' ? form.fornecedorId || undefined : undefined,
        observacoes: form.observacoes || undefined,
        ativo: form.ativo,
      };

      if (editingId) {
        await http.put(`/funcionarios/${editingId}`, payload);
        setSuccess('Funcionário atualizado.');
      } else {
        const res = await http.post<Funcionario>('/funcionarios', payload);
        setSelectedId(res.data.id);
        setSuccess('Funcionário cadastrado.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: Funcionario) {
    if (!window.confirm(`Excluir "${f.nome}"?`)) return;
    try {
      await http.delete(`/funcionarios/${f.id}`);
      setSuccess('Funcionário excluído.');
      if (selectedId === f.id) setSelectedId(null);
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Falha ao excluir.'));
    }
  }

  async function handleFotoUpload(file: File) {
    if (!editingId && !selectedId) return;
    const targetId = editingId ?? selectedId!;
    setUploadingFoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await http.post(`/funcionarios/${targetId}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Foto atualizada.');
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Falha ao enviar foto.'));
    } finally {
      setUploadingFoto(false);
    }
  }

  const idade = calcIdade(form.dataNascimento || null);

  return (
    <div className="page-stack">
      <BackButton />
      <PageHeader
        title="Funcionários"
        subtitle="Cadastro de colaboradores e contratados da empresa."
        chips={[
          { label: `${funcionarios.filter((f) => f.ativo).length} ativo(s)` },
          { label: `${funcionarios.filter((f) => !f.ativo).length} inativo(s)` },
        ]}
      />
      <SystemNav />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel">
        <div className="panel__header panel__header--row panel__header--sticky">
          <div>
            <h3>Lista de funcionários</h3>
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
        {!loading && lista.length === 0 ? <EmptyState message="Nenhum funcionário cadastrado." /> : null}
        {!loading && lista.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Vínculo</th>
                  <th>Cargo</th>
                  <th>Admissão</th>
                  <th>Nascimento / Idade</th>
                  <th>Contato</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((f) => (
                  <tr key={f.id} className={selectedId === f.id ? 'table-row--selected' : ''} onClick={() => setSelectedId(f.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {f.fotoUrl ? (
                          <img src={f.fotoUrl} alt={f.nome} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                            {f.nome.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <strong>{f.nome}</strong>
                          {!f.ativo ? <span className="badge badge--muted" style={{ marginLeft: 6, fontSize: 10 }}>Inativo</span> : null}
                        </div>
                      </div>
                    </td>
                    <td>{f.documento ? `${f.tipoDocumento ?? 'CPF'}: ${f.documento}` : '—'}</td>
                    <td><span className="badge badge--muted">{f.vinculo}</span>{f.vinculo === 'PJ' && f.fornecedor ? <div className="table-subline">{f.fornecedor.razaoSocial}</div> : null}</td>
                    <td>{f.cargo ?? '—'}</td>
                    <td>{formatDate(f.dataAdmissao)}</td>
                    <td>{formatDate(f.dataNascimento)}<div className="table-subline">{calcIdade(f.dataNascimento)}</div></td>
                    <td>{f.email ?? '—'}<div className="table-subline">{f.telefone ?? ''}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Modal open={isModalOpen} title={editingId ? 'Editar funcionário' : 'Novo funcionário'} onClose={closeModal}>
        <form className="form-grid form-grid--4" onSubmit={handleSubmit}>

          {/* Foto */}
          {editingId ? (
            <div className="field field--span-4" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {(() => {
                const atual = funcionarios.find((f) => f.id === editingId);
                return atual?.fotoUrl ? (
                  <img src={atual.fotoUrl} alt="foto" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-bg, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                    {form.nome.charAt(0).toUpperCase() || '?'}
                  </span>
                );
              })()}
              <div>
                <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) void handleFotoUpload(e.target.files[0]); }} />
                <button type="button" className="button button--ghost button--small" disabled={uploadingFoto} onClick={() => fotoInputRef.current?.click()}>
                  {uploadingFoto ? 'Enviando...' : 'Alterar foto'}
                </button>
              </div>
            </div>
          ) : null}

          {/* Dados pessoais */}
          <div className="field field--span-2">
            <label>Nome completo *</label>
            <input value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} required />
          </div>

          <div className="field">
            <label>Tipo de documento</label>
            <select value={form.tipoDocumento} onChange={(e) => setForm((c) => ({ ...c, tipoDocumento: e.target.value }))}>
              <option value="CPF">CPF</option>
              <option value="RG">RG</option>
            </select>
          </div>

          <div className="field">
            <label>{form.tipoDocumento}</label>
            <input value={form.documento} onChange={(e) => setForm((c) => ({ ...c, documento: e.target.value }))} placeholder={form.tipoDocumento === 'CPF' ? '000.000.000-00' : '00.000.000-0'} />
          </div>

          <div className="field">
            <label>Data de nascimento</label>
            <input type="date" value={form.dataNascimento} onChange={(e) => setForm((c) => ({ ...c, dataNascimento: e.target.value }))} />
            {form.dataNascimento ? <small>{idade}</small> : null}
          </div>

          <div className="field">
            <label>Sexo</label>
            <select value={form.sexo} onChange={(e) => setForm((c) => ({ ...c, sexo: e.target.value }))}>
              <option value="">Não informado</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>

          <div className="field">
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </div>

          <div className="field">
            <label>Telefone</label>
            <input value={form.telefone} onChange={(e) => setForm((c) => ({ ...c, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
          </div>

          {/* Dados profissionais */}
          <div className="field">
            <label>Cargo</label>
            <input value={form.cargo} onChange={(e) => setForm((c) => ({ ...c, cargo: e.target.value }))} />
          </div>

          <div className="field">
            <label>Vínculo</label>
            <select value={form.vinculo} onChange={(e) => setForm((c) => ({ ...c, vinculo: e.target.value, fornecedorId: '' }))}>
              <option value="CLT">CLT</option>
              <option value="PJ">PJ (Pessoa Jurídica)</option>
              <option value="FREELANCER">Freelancer</option>
              <option value="ESTAGIO">Estágio</option>
            </select>
          </div>

          <div className="field">
            <label>Data de admissão</label>
            <input type="date" value={form.dataAdmissao} onChange={(e) => setForm((c) => ({ ...c, dataAdmissao: e.target.value }))} />
          </div>

          <div className="field">
            <label>Data de demissão</label>
            <input type="date" value={form.dataDemissao} onChange={(e) => setForm((c) => ({ ...c, dataDemissao: e.target.value }))} />
          </div>

          {form.vinculo === 'PJ' ? (
            <div className="field field--span-4">
              <label>Fornecedor vinculado (PJ)</label>
              <select value={form.fornecedorId} onChange={(e) => setForm((c) => ({ ...c, fornecedorId: e.target.value }))}>
                <option value="">Selecione ou cadastre o fornecedor em Fornecedores</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.razaoSocial}{f.nomeFantasia ? ` — ${f.nomeFantasia}` : ''}</option>
                ))}
              </select>
              <small>Para cadastrar um novo fornecedor, acesse o módulo Fornecedores e depois volte aqui.</small>
            </div>
          ) : null}

          <div className="field">
            <label>Salário (R$)</label>
            <input type="number" min="0" step="0.01" value={form.salario} onChange={(e) => setForm((c) => ({ ...c, salario: e.target.value }))} />
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

          {/* Dados bancários */}
          <div className="field field--span-2">
            <label>Nome (conta bancária)</label>
            <input value={form.contaBancariaNome} onChange={(e) => setForm((c) => ({ ...c, contaBancariaNome: e.target.value }))} />
          </div>

          <div className="field">
            <label>Banco</label>
            <input value={form.contaBancariaBanco} onChange={(e) => setForm((c) => ({ ...c, contaBancariaBanco: e.target.value }))} />
          </div>

          <div className="field">
            <label>Agência</label>
            <input value={form.contaBancariaAgencia} onChange={(e) => setForm((c) => ({ ...c, contaBancariaAgencia: e.target.value }))} />
          </div>

          <div className="field">
            <label>Conta</label>
            <input value={form.contaBancariaConta} onChange={(e) => setForm((c) => ({ ...c, contaBancariaConta: e.target.value }))} />
          </div>

          <div className="field">
            <label>Chave Pix</label>
            <input value={form.contaBancariaPix} onChange={(e) => setForm((c) => ({ ...c, contaBancariaPix: e.target.value }))} />
          </div>

          {/* Observações e status */}
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
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar funcionário'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
