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
  ativo: true,
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UsuarioAdmin[]>([]);
  const [profiles, setProfiles] = useState<PerfilAcesso[]>([]);
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
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
      if (!editingId && !form.empresaIdsAcesso.length && companiesResponse.data.length > 0) {
        setForm((c) => ({ ...c, empresaIdsAcesso: [companiesResponse.data[0].id] }));
      }
    } catch (err) {
      handleError(err, 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setForm({ ...initialForm, empresaIdsAcesso: companies.length > 0 ? [companies[0].id] : [] });
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...initialForm, empresaIdsAcesso: companies.length > 0 ? [companies[0].id] : [] });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(user: UsuarioAdmin) {
    setEditingId(user.id);
    const empresaIds = user.empresasDisponiveis?.map((e) => e.id) ?? [];
    const perfilAcessoId = user.perfilAcessoAtual?.id ?? '';
    setForm({
      nome: user.nome,
      email: user.email ?? '',
      senha: '',
      perfil: user.perfil as PerfilUsuario,
      perfilAcessoId,
      empresaIdsAcesso: empresaIds,
      ativo: user.ativo ?? true,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, any> = {
        nome: form.nome,
        email: form.email,
        perfil: form.perfil,
        perfilAcessoId: form.perfilAcessoId || undefined,
        empresaIdsAcesso: form.empresaIdsAcesso,
        ativo: form.ativo,
      };
      if (form.senha) payload.senha = form.senha;
      if (!editingId) {
        if (!form.senha) { setError('Senha é obrigatória para novos usuários.'); setSaving(false); return; }
        payload.senha = form.senha;
        await http.post('/usuarios', payload);
        setSuccess('Usuário criado com sucesso.');
      } else {
        await http.patch(`/usuarios/${editingId}`, payload);
        setSuccess('Usuário atualizado com sucesso.');
      }
      resetForm();
      await load();
    } catch (err) {
      handleError(err, editingId ? 'Falha ao atualizar usuário.' : 'Falha ao criar usuário.');
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
      <PageHeader title="Usuários" subtitle="Cadastre e gerencie usuários, perfis e acessos por empresa." actions={<BackButton fallbackPath="/sistema" />} />
      <SystemNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      {showForm ? (
        <div className="panel panel--compact" style={{ maxWidth: 640 }}>
          <div className="panel__header panel__header--row panel__header--sticky">
            <div>
              <h3>{editingId ? <>Editando: <span style={{ color: 'var(--primary)' }}>{form.nome}</span></> : 'Novo usuário'}</h3>
              <p>{editingId ? 'Deixe a senha em branco para não alterar.' : 'Preencha os dados do novo usuário.'}</p>
            </div>
            <button className="button button--ghost button--small" type="button" onClick={resetForm}>Cancelar</button>
          </div>

          <form className="form-grid" onSubmit={handleSubmit} style={{ padding: '16px 20px 20px' }}>
            <div className="field">
              <label>Nome completo</label>
              <input required value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input required type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
            </div>
            <div className="field">
              <label>{editingId ? 'Nova senha (opcional)' : 'Senha'}</label>
              <input type="password" required={!editingId} value={form.senha} onChange={(e) => setForm((c) => ({ ...c, senha: e.target.value }))} />
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((c) => ({ ...c, ativo: e.target.checked }))} />
                Usuário ativo
              </label>
            </div>
            <div className="field">
              <label>Perfil base</label>
              <select
                value={form.perfil}
                onChange={(e) => {
                  const novoPerfil = e.target.value as PerfilUsuario;
                  const nomeEsperado = novoPerfil === 'ADMIN' ? 'Administrador' : 'Analista';
                  const matching = profiles.find((p) => p.nome === nomeEsperado);
                  setForm((c) => ({ ...c, perfil: novoPerfil, perfilAcessoId: matching?.id || '' }));
                }}
              >
                <option value="ADMIN">Administrador</option>
                <option value="ANALISTA">Analista / Operacional</option>
              </select>
            </div>
            <div className="field">
              <label>Perfil de acesso</label>
              <select value={form.perfilAcessoId} onChange={(e) => setForm((c) => ({ ...c, perfilAcessoId: e.target.value }))}>
                <option value="">— Automático pelo perfil base —</option>
                {profiles.filter((p) => p.nome !== 'Cliente').map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
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
                      onChange={(e) => setForm((c) => ({
                        ...c,
                        empresaIdsAcesso: e.target.checked
                          ? Array.from(new Set([...c.empresaIdsAcesso, company.id]))
                          : c.empresaIdsAcesso.filter((id) => id !== company.id),
                      }))}
                    />
                    {company.nomeFantasia || company.nome}
                  </label>
                ))}
              </div>
            </div>
            <div className="field--span-2" style={{ display: 'flex', gap: 10 }}>
              <button className="button" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar usuário'}
              </button>
              <button className="button button--ghost" type="button" onClick={resetForm}>Cancelar</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="panel panel--compact">
        <div className="panel__header panel__header--row">
          <div>
            <h3>Usuários da empresa atual</h3>
            <p>{users.length} usuário(s) com acesso ao contexto selecionado.</p>
          </div>
          {!showForm ? (
            <button className="button button--small" type="button" onClick={openNew}>+ Novo usuário</button>
          ) : null}
        </div>
        {loading ? <LoadingBlock label="Carregando usuários..." /> : null}
        {!loading && users.length === 0 ? <EmptyState message="Nenhum usuário encontrado." /> : null}
        {!loading && users.length > 0 ? (
          <div className="table-wrap table-wrap--full">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil base</th>
                  <th>Perfil de acesso</th>
                  <th>Empresas</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} style={editingId === item.id ? { background: 'var(--primary-soft)' } : undefined}>
                    <td><strong>{item.nome}</strong></td>
                    <td className="muted">{item.email}</td>
                    <td><span className="compact-chip">{item.perfil}</span></td>
                    <td className="muted">{item.perfilAcessoAtual?.nome || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td className="muted">{item.empresasDisponiveis?.length ?? 1}</td>
                    <td>
                      <span className={`compact-chip${item.ativo === false ? ' compact-chip--danger' : ' compact-chip--success'}`}>
                        {item.ativo === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                      <button className="button button--ghost button--small" type="button" onClick={() => startEdit(item)}>
                        Editar
                      </button>
                      <button
                        className="button button--ghost button--small"
                        type="button"
                        style={{ color: item.ativo === false ? '#16a34a' : '#dc2626' }}
                        onClick={async () => {
                          if (!confirm(`${item.ativo === false ? 'Ativar' : 'Desativar'} o usuário ${item.nome}?`)) return;
                          try {
                            await http.patch(`/usuarios/${item.id}`, { ativo: !item.ativo });
                            await load();
                          } catch { setError('Falha ao alterar status do usuário.'); }
                        }}
                      >
                        {item.ativo === false ? 'Ativar' : 'Desativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
