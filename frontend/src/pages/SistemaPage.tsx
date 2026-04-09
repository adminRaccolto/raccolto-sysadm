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
import { useAuth } from '../contexts/AuthContext';
import type { ContaBancaria, Empresa } from '../types/api';

const emptyCompanyForm = {
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
};

export default function SistemaPage() {
  const { refreshMe } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [form, setForm] = useState({
    ...emptyCompanyForm,
    logoUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    void load();
  }, []);

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
        logoUrl: form.logoUrl || undefined,
      });
      setEmpresa(response.data);
      setForm((current) => ({ ...current, logoUrl: response.data.logoUrl || current.logoUrl }));
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
      setForm((current) => ({ ...current, logoUrl: response.data.logoUrl || '' }));
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

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Sistema & suporte"
        subtitle="Tela principal mais limpa, com foco na identidade da empresa e no acesso rápido às áreas administrativas."
        actions={<BackButton fallbackPath="/dashboard" />}
      />
      <SystemNav />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}
      {loading ? <LoadingBlock label="Carregando configurações do sistema..." /> : null}

      {!loading ? (
        <section className="two-columns two-columns--left-wide two-columns--compact">
          <form className="panel logo-form-grid panel--compact" onSubmit={handleSalvarEmpresa}>
            <div className="panel__header panel__header--row">
              <div>
                <h3>Identidade da empresa</h3>
                <p>Nome, contatos, representantes e logo usados nos módulos e documentos do Raccolto.</p>
              </div>
              <div className="compact-chip">Empresa atual</div>
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
                  {uploadingLogo ? 'Enviando logo...' : 'Enviar logo'}
                </label>
                <input id="logo-file-input" type="file" accept="image/*" onChange={handleUploadLogo} hidden />
                <span className="file-upload-meta">PNG, JPG ou WEBP. A imagem será salva no servidor do Raccolto.</span>
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
              <input value={form.logoUrl} onChange={(e) => setForm((c) => ({ ...c, logoUrl: e.target.value }))} placeholder="Use apenas se quiser apontar para uma URL externa" />
            </div>
            <button className="button" type="submit" disabled={savingEmpresa}>
              {savingEmpresa ? 'Salvando...' : 'Salvar identidade visual'}
            </button>
          </form>

          <div className="page-stack page-stack--compact">
            <div className="panel panel--compact">
              <div className="panel__header">
                <h3>Resumo administrativo</h3>
                <p>Panorama rápido do contexto atual, sem excesso de blocos na tela principal.</p>
              </div>
              {empresa ? (
                <div className="table-wrap">
                  <table>
                    <tbody>
                      <tr><th>Empresa atual</th><td>{empresa.nomeFantasia || empresa.nome}</td></tr>
                      <tr><th>Total de empresas</th><td>{totalEmpresas}</td></tr>
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

            <div className="panel panel--compact">
              <div className="panel__header">
                <h3>Atalhos do módulo</h3>
                <p>Use o menu suspenso ou os atalhos abaixo para abrir as telas administrativas.</p>
              </div>
              <div className="stack-list stack-list--compact">
                <Link className="list-card list-card--compact list-card--link" to="/empresas">
                  <div>
                    <strong>Empresas</strong>
                    <p className="muted">Cadastre novas empresas e faça a troca de contexto.</p>
                  </div>
                </Link>
                <Link className="list-card list-card--compact list-card--link" to="/usuarios">
                  <div>
                    <strong>Usuários</strong>
                    <p className="muted">Gerencie acessos por pessoa e por empresa.</p>
                  </div>
                </Link>
                <Link className="list-card list-card--compact list-card--link" to="/perfis-acesso">
                  <div>
                    <strong>Perfis & permissões</strong>
                    <p className="muted">Defina a matriz dinâmica de permissões do sistema.</p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="panel panel--compact">
              <div className="panel__header">
                <h3>Contas bancárias cadastradas</h3>
                <p>{contasBancarias.length} conta(s) disponível(is) para a operação.</p>
              </div>
              {contasBancarias.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Conta</th>
                        <th>Banco</th>
                        <th>Tipo</th>
                        <th>Saldo atual</th>
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
                <EmptyState message="Nenhuma conta bancária cadastrada ainda." />
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
