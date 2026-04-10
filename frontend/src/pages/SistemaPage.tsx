import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import SystemNav from '../components/SystemNav';
import BackButton from '../components/BackButton';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import type { ContaBancaria, Empresa } from '../types/api';

export default function SistemaPage() {
  const { user, refreshMe, switchCompany } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [form, setForm] = useState({
    nome: '',
    nomeFantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    representanteNome: '',
    representanteCargo: '',
    infBancarias: '',
    logoUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Nova empresa modal
  const [novaEmpresaOpen, setNovaEmpresaOpen] = useState(false);
  const [novaEmpresaForm, setNovaEmpresaForm] = useState({ nome: '', nomeFantasia: '', cnpj: '' });
  const [savingNova, setSavingNova] = useState(false);

  const totalEmpresas = useMemo(() => empresas.length || 1, [empresas.length]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [empresaResponse, empresasResponse, contasBancariasResponse] = await Promise.all([
        http.get<Empresa>('/empresas/me'),
        http.get<Empresa[]>('/empresas'),
        http.get<ContaBancaria[]>('/financeiro/contas-bancarias'),
      ]);
      setEmpresa(empresaResponse.data);
      setEmpresas(empresasResponse.data);
      setContasBancarias(contasBancariasResponse.data);
      setForm({
        nome: empresaResponse.data.nome || '',
        nomeFantasia: empresaResponse.data.nomeFantasia || '',
        cnpj: empresaResponse.data.cnpj || '',
        email: empresaResponse.data.email || '',
        telefone: empresaResponse.data.telefone || '',
        logradouro: empresaResponse.data.logradouro || '',
        numero: empresaResponse.data.numero || '',
        complemento: empresaResponse.data.complemento || '',
        bairro: empresaResponse.data.bairro || '',
        cidade: empresaResponse.data.cidade || '',
        estado: empresaResponse.data.estado || '',
        cep: empresaResponse.data.cep || '',
        representanteNome: empresaResponse.data.representanteNome || '',
        representanteCargo: empresaResponse.data.representanteCargo || '',
        infBancarias: (empresaResponse.data as Empresa & { infBancarias?: string }).infBancarias || '',
        logoUrl: empresaResponse.data.logoUrl || '',
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data?.message;
        setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Falha ao consultar o sistema.');
      } else {
        setError('Falha ao consultar o sistema.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleSalvarEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEmpresa(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await http.put<Empresa>('/empresas/me', {
        nome: form.nome,
        nomeFantasia: form.nomeFantasia || undefined,
        cnpj: form.cnpj || undefined,
        email: form.email || undefined,
        telefone: form.telefone || undefined,
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        cidade: form.cidade || undefined,
        estado: form.estado || undefined,
        cep: form.cep || undefined,
        representanteNome: form.representanteNome || undefined,
        representanteCargo: form.representanteCargo || undefined,
        infBancarias: form.infBancarias || undefined,
        logoUrl: form.logoUrl || undefined,
      });
      setEmpresa(response.data);
      setForm((c) => ({ ...c, logoUrl: response.data.logoUrl || c.logoUrl }));
      setSuccess('Identidade da empresa atualizada com sucesso.');
      await refreshMe();
      await load();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data?.message;
        setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Falha ao salvar a empresa.');
      } else {
        setError('Falha ao salvar a empresa.');
      }
    } finally {
      setSavingEmpresa(false);
    }
  }

  async function handleUploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    setUploadingLogo(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await http.post<Empresa>('/empresas/me/logo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEmpresa(response.data);
      setForm((c) => ({ ...c, logoUrl: response.data.logoUrl || '' }));
      setSuccess('Logo da empresa atualizada com sucesso.');
      await refreshMe();
      await load();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data?.message;
        setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Falha ao enviar a logo.');
      } else {
        setError('Falha ao enviar a logo.');
      }
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  }

  async function handleCriarEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingNova(true);
    setError(null);
    try {
      await http.post('/empresas', {
        nome: novaEmpresaForm.nome,
        nomeFantasia: novaEmpresaForm.nomeFantasia || undefined,
        cnpj: novaEmpresaForm.cnpj || undefined,
      });
      setNovaEmpresaOpen(false);
      setNovaEmpresaForm({ nome: '', nomeFantasia: '', cnpj: '' });
      setSuccess('Empresa criada. Troque para ela e complete os dados em Identidade.');
      await load();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data?.message;
        setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Falha ao criar empresa.');
      } else {
        setError('Falha ao criar empresa.');
      }
    } finally {
      setSavingNova(false);
    }
  }

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Sistema & suporte"
        subtitle="Identidade da empresa ativa, empresas vinculadas e configurações administrativas."
        actions={<BackButton fallbackPath="/dashboard" />}
      />
      <SystemNav />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}
      {loading ? <LoadingBlock label="Carregando configurações do sistema..." /> : null}

      {!loading ? (
        <section className="two-columns two-columns--left-wide two-columns--compact">

          {/* ── COLUNA ESQUERDA: IDENTIDADE ─────────────────────────── */}
          <form className="panel logo-form-grid panel--compact" onSubmit={handleSalvarEmpresa}>
            <div className="panel__header panel__header--row">
              <div>
                <h3>Identidade da empresa</h3>
                <p>Nome, contatos, representante, dados bancários e logo usados nos documentos.</p>
              </div>
              <div className="compact-chip">Empresa ativa</div>
            </div>

            <div className="brand-upload-card">
              {empresa?.logoUrl || form.logoUrl ? (
                <img className="logo-preview logo-preview--large" src={form.logoUrl || empresa?.logoUrl || ''} alt={empresa?.nomeFantasia || empresa?.nome || 'Empresa'} />
              ) : (
                <div className="logo-preview logo-preview--large logo-preview--placeholder">
                  {(empresa?.nomeFantasia || empresa?.nome || 'R').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="file-upload-row">
                <label className="button button--ghost button--small file-upload-button" htmlFor="logo-file-input">
                  {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
                </label>
                <input id="logo-file-input" type="file" accept="image/*" onChange={handleUploadLogo} hidden />
                <span className="file-upload-meta">PNG, JPG ou WEBP.</span>
              </div>
            </div>

            <div className="field">
              <label>Nome da empresa</label>
              <input value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Nome fantasia</label>
              <input value={form.nomeFantasia} onChange={(e) => setForm((c) => ({ ...c, nomeFantasia: e.target.value }))} />
            </div>
            <div className="field">
              <label>CNPJ</label>
              <input value={form.cnpj} onChange={(e) => setForm((c) => ({ ...c, cnpj: e.target.value }))} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input value={form.telefone} onChange={(e) => setForm((c) => ({ ...c, telefone: e.target.value }))} />
            </div>
            <div className="field field--span-2">
              <label>Informações bancárias / PIX</label>
              <input value={form.infBancarias} onChange={(e) => setForm((c) => ({ ...c, infBancarias: e.target.value }))} placeholder="Ex.: PIX CNPJ · Banco Itaú Ag 0001 C/C 12345-6" />
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
              <label>Estado</label>
              <input value={form.estado} onChange={(e) => setForm((c) => ({ ...c, estado: e.target.value }))} />
            </div>
            <div className="field">
              <label>CEP</label>
              <input value={form.cep} onChange={(e) => setForm((c) => ({ ...c, cep: e.target.value }))} />
            </div>
            <div className="field">
              <label>Representante legal</label>
              <input value={form.representanteNome} onChange={(e) => setForm((c) => ({ ...c, representanteNome: e.target.value }))} />
            </div>
            <div className="field">
              <label>Cargo do representante</label>
              <input value={form.representanteCargo} onChange={(e) => setForm((c) => ({ ...c, representanteCargo: e.target.value }))} />
            </div>
            <div className="field field--span-2">
              <label>Logo por URL (opcional)</label>
              <input value={form.logoUrl} onChange={(e) => setForm((c) => ({ ...c, logoUrl: e.target.value }))} placeholder="URL externa" />
            </div>
            <button className="button" type="submit" disabled={savingEmpresa}>
              {savingEmpresa ? 'Salvando...' : 'Salvar identidade'}
            </button>
          </form>

          {/* ── COLUNA DIREITA ──────────────────────────────────────── */}
          <div className="page-stack page-stack--compact">

            {/* Resumo */}
            <div className="panel panel--compact">
              <div className="panel__header">
                <h3>Resumo</h3>
              </div>
              {empresa ? (
                <div className="table-wrap">
                  <table>
                    <tbody>
                      <tr><th>Empresa ativa</th><td>{empresa.nomeFantasia || empresa.nome}</td></tr>
                      <tr><th>Empresas vinculadas</th><td>{totalEmpresas}</td></tr>
                      <tr><th>Usuários</th><td>{empresa._count?.usuarios ?? '—'}</td></tr>
                      <tr><th>Clientes</th><td>{empresa._count?.clientes ?? '—'}</td></tr>
                      <tr><th>Contratos</th><td>{empresa._count?.contratos ?? '—'}</td></tr>
                      <tr><th>Projetos</th><td>{empresa._count?.projetos ?? '—'}</td></tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="Empresa atual não disponível." />
              )}
            </div>

            {/* Empresas vinculadas */}
            <div className="panel panel--compact">
              <div className="panel__header panel__header--row">
                <div>
                  <h3>Empresas vinculadas</h3>
                  <p>{empresas.length} empresa(s) no seu acesso.</p>
                </div>
                <button className="button button--ghost button--small" type="button" onClick={() => setNovaEmpresaOpen(true)}>
                  + Nova empresa
                </button>
              </div>
              {empresas.length === 0 ? <EmptyState message="Nenhuma empresa disponível." /> : null}
              {empresas.length > 0 ? (
                <div className="stack-list stack-list--compact">
                  {empresas.map((emp) => {
                    const atual = user?.empresaId === emp.id;
                    return (
                      <div key={emp.id} className="list-card list-card--compact">
                        <div>
                          <strong>{emp.nomeFantasia || emp.nome}</strong>
                          {emp.nomeFantasia ? <p className="muted">{emp.nome}</p> : null}
                          <small className="muted">
                            Clientes: {emp._count?.clientes ?? 0} · Contratos: {emp._count?.contratos ?? 0}
                          </small>
                        </div>
                        <div className="table-actions">
                          {atual
                            ? <span className="compact-chip">Ativa</span>
                            : <button className="button button--ghost button--small" type="button" onClick={() => void switchCompany(emp.id)}>Trocar</button>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Atalhos administrativos */}
            <div className="panel panel--compact">
              <div className="panel__header">
                <h3>Administração</h3>
              </div>
              <div className="stack-list stack-list--compact">
                <Link className="list-card list-card--compact list-card--link" to="/usuarios">
                  <div>
                    <strong>Usuários</strong>
                    <p className="muted">Gerencie acessos por pessoa e empresa.</p>
                  </div>
                </Link>
                <Link className="list-card list-card--compact list-card--link" to="/perfis-acesso">
                  <div>
                    <strong>Perfis & permissões</strong>
                    <p className="muted">Defina a matriz dinâmica de permissões.</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Contas bancárias */}
            <div className="panel panel--compact">
              <div className="panel__header">
                <h3>Contas bancárias</h3>
                <p>{contasBancarias.length} conta(s) cadastrada(s).</p>
              </div>
              {contasBancarias.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Conta</th>
                        <th>Banco</th>
                        <th>Tipo</th>
                        <th>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contasBancarias.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.nome}</strong><div className="table-subline">{item.numeroConta || 'Sem número'}</div></td>
                          <td>{item.banco || '—'}</td>
                          <td>{item.tipo}</td>
                          <td>{item.saldoAtual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="Nenhuma conta bancária cadastrada." />
              )}
            </div>

          </div>
        </section>
      ) : null}

      {/* ── MODAL: NOVA EMPRESA ─────────────────────────────────────────── */}
      <Modal
        open={novaEmpresaOpen}
        title="Nova empresa"
        subtitle="Informe o nome para criar a empresa. Troque para ela e complete os dados em Identidade."
        onClose={() => { if (!savingNova) { setNovaEmpresaOpen(false); } }}
      >
        <form className="form-grid" onSubmit={(e) => void handleCriarEmpresa(e)}>
          <div className="field field--span-2">
            <label>Nome da empresa</label>
            <input value={novaEmpresaForm.nome} onChange={(e) => setNovaEmpresaForm((f) => ({ ...f, nome: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Nome fantasia</label>
            <input value={novaEmpresaForm.nomeFantasia} onChange={(e) => setNovaEmpresaForm((f) => ({ ...f, nomeFantasia: e.target.value }))} />
          </div>
          <div className="field">
            <label>CNPJ</label>
            <input value={novaEmpresaForm.cnpj} onChange={(e) => setNovaEmpresaForm((f) => ({ ...f, cnpj: e.target.value }))} />
          </div>
          <div className="field field--span-2">
            <button className="button" type="submit" disabled={savingNova}>
              {savingNova ? 'Criando...' : 'Criar empresa'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
