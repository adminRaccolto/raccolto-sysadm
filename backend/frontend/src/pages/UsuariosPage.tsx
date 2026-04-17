import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import SystemNav from '../components/SystemNav';
import type { Empresa, PerfilAcesso, UsuarioAdmin } from '../types/api';
import type { PerfilUsuario } from '../types/auth';

const initialForm = {
  nome: '',
  email: '',
  senha: '',
  perfil: 'ANALISTA' as PerfilUsuario,
  perfilAcessoId: '',
  empresaIdsAcesso: [] as string[],
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UsuarioAdmin[]>([]);
  const [profiles, setProfiles] = useState<PerfilAcesso[]>([]);
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, profilesResponse, companiesResponse] = await Promise.all([
        http.get<UsuarioAdmin[]>('/usuarios'),
        http.get<PerfilAcesso[]>('/perfis-acesso'),
        http.get<Empresa[]>('/empresas'),
      ]);
      setUsers(usersResponse.data);
      setProfiles(profilesResponse.data);
      setCompanies(companiesResponse.data);
      if (!form.empresaIdsAcesso.length && companiesResponse.data.length > 0) {
        setForm((current) => ({ ...current, empresaIdsAcesso: [companiesResponse.data[0].id] }));
      }
    } catch (err) {
      handleError(err, 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post('/usuarios', {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        perfil: form.perfil,
        perfilAcessoId: form.perfilAcessoId || undefined,
        empresaIdsAcesso: form.empresaIdsAcesso,
      });
      setForm(initialForm);
      setSuccess('Usuário criado com sucesso.');
      await load();
    } catch (err) {
      handleError(err, 'Falha ao criar usuário.');
    } finally {
      setSaving(false);
    }
  }

  function handleError(err: unknown, fallback: string) {
    if (axios.isAxiosError(err)) {
      const payload = err.response?.data?.message;
      setError(Array.isArray(payload) ? payload.join(' | ') : payload || fallback);
      return;
    }
    setError(fallback);
  }

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader title="Usuários" subtitle="Cadastre usuários e vincule o acesso deles a perfis e empresas." actions={<BackButton fallbackPath="/sistema" />} />
      <SystemNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="two-columns two-columns--left-wide two-columns--compact">
        <form className="panel form-grid panel--compact" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>Novo usuário</h3>
            <p>O usuário nasce com uma empresa principal e pode receber acesso adicional a outras empresas.</p>
          </div>
          <div className="field">
            <label>Nome</label>
            <input required value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input required value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" required value={form.senha} onChange={(e) => setForm((c) => ({ ...c, senha: e.target.value }))} />
          </div>
          <div className="field">
            <label>Perfil base</label>
            <select value={form.perfil} onChange={(e) => setForm((c) => ({ ...c, perfil: e.target.value as PerfilUsuario }))}>
              <option value="ADMIN">ADMIN</option>
              <option value="ANALISTA">ANALISTA</option>
              <option value="CLIENTE">CLIENTE</option>
            </select>
          </div>
          <div className="field field--span-2">
            <label>Perfil de acesso da empresa atual</label>
            <select value={form.perfilAcessoId} onChange={(e) => setForm((c) => ({ ...c, perfilAcessoId: e.target.value }))}>
              <option value="">Selecionar automaticamente pelo perfil base</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.nome}</option>
              ))}
            </select>
          </div>
          <div className="field field--span-2">
            <label>Empresas com acesso</label>
            <div className="checkbox-list compact-gap">
              {companies.map((company) => (
                <label key={company.id} className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.empresaIdsAcesso.includes(company.id)}
                    onChange={(e) => setForm((current) => ({
                      ...current,
                      empresaIdsAcesso: e.target.checked
                        ? Array.from(new Set([...current.empresaIdsAcesso, company.id]))
                        : current.empresaIdsAcesso.filter((item) => item !== company.id),
                    }))}
                  />
                  {company.nomeFantasia || company.nome}
                </label>
              ))}
            </div>
          </div>
          <button className="button" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar usuário'}</button>
        </form>

        <div className="panel panel--compact">
          <div className="panel__header">
            <h3>Usuários da empresa atual</h3>
            <p>{users.length} usuário(s) com acesso ao contexto selecionado.</p>
          </div>
          {loading ? <LoadingBlock label="Carregando usuários..." /> : null}
          {!loading && users.length === 0 ? <EmptyState message="Nenhum usuário encontrado." /> : null}
          {!loading && users.length > 0 ? (
            <div className="stack-list stack-list--compact">
              {users.map((item) => (
                <div key={item.id} className="list-card list-card--compact">
                  <div>
                    <strong>{item.nome}</strong>
                    <p className="muted">{item.email}</p>
                    <small className="muted">Perfil base: {item.perfil} · Perfil dinâmico: {item.perfilAcessoAtual?.nome || 'Não vinculado'}</small>
                  </div>
                  <div className="table-actions">
                    <span className="compact-chip">{item.empresasDisponiveis?.length || 1} empresa(s)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
