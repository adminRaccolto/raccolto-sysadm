import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import SystemNav from '../components/SystemNav';
import type { PerfilAcesso, RecursoSistema } from '../types/api';

interface PermissionFormItem {
  recursoSistemaId: string;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  aprovar: boolean;
  administrar: boolean;
}

const COLS: { key: keyof PermissionFormItem; label: string }[] = [
  { key: 'visualizar', label: 'Ver' },
  { key: 'criar',      label: 'Criar' },
  { key: 'editar',     label: 'Editar' },
  { key: 'excluir',    label: 'Excluir' },
  { key: 'aprovar',    label: 'Aprovar' },
  { key: 'administrar',label: 'Admin' },
];

const initialMeta = { nome: '', descricao: '', ativo: true };

export default function PerfisAcessoPage() {
  const [resources, setResources] = useState<RecursoSistema[]>([]);
  const [profiles, setProfiles] = useState<PerfilAcesso[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [meta, setMeta] = useState(initialMeta);
  const [permissions, setPermissions] = useState<PermissionFormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const emptyPermissions = useMemo(
    () => resources.map((r) => ({ recursoSistemaId: r.id, visualizar: true, criar: false, editar: false, excluir: false, aprovar: false, administrar: false })),
    [resources],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [resourcesResponse, profilesResponse] = await Promise.all([
        http.get<RecursoSistema[]>('/perfis-acesso/resources'),
        http.get<PerfilAcesso[]>('/perfis-acesso'),
      ]);
      setResources(resourcesResponse.data);
      setProfiles(profilesResponse.data);
      if (!editingId) setPermissions(resourcesResponse.data.map((r) => ({ recursoSistemaId: r.id, visualizar: true, criar: false, editar: false, excluir: false, aprovar: false, administrar: false })));
    } catch (err) {
      handleError(err, 'Falha ao carregar perfis e recursos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setMeta(initialMeta);
    setPermissions(emptyPermissions);
  }

  function openNew() {
    setEditingId(null);
    setMeta(initialMeta);
    setPermissions(emptyPermissions);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(profile: PerfilAcesso) {
    setEditingId(profile.id);
    setMeta({ nome: profile.nome, descricao: profile.descricao || '', ativo: profile.ativo });
    setPermissions(resources.map((r) => {
      const cur = profile.permissoes.find((p) => p.recursoSistemaId === r.id);
      return {
        recursoSistemaId: r.id,
        visualizar:  cur?.visualizar  ?? true,
        criar:       cur?.criar       ?? false,
        editar:      cur?.editar      ?? false,
        excluir:     cur?.excluir     ?? false,
        aprovar:     cur?.aprovar     ?? false,
        administrar: cur?.administrar ?? false,
      };
    }));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { ...meta, permissoes: permissions };
      if (editingId) {
        await http.put(`/perfis-acesso/${editingId}`, payload);
        setSuccess('Perfil atualizado com sucesso.');
      } else {
        await http.post('/perfis-acesso', payload);
        setSuccess('Perfil criado com sucesso.');
      }
      resetForm();
      await load();
    } catch (err) {
      handleError(err, 'Falha ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  }

  function toggleAll(field: keyof PermissionFormItem, value: boolean) {
    setPermissions((cur) => cur.map((p) => ({ ...p, [field]: value })));
  }

  function updatePermission(resourceId: string, field: keyof PermissionFormItem, value: boolean) {
    setPermissions((cur) => cur.map((p) => (p.recursoSistemaId === resourceId ? { ...p, [field]: value } : p)));
  }

  function handleError(err: unknown, fallback: string) {
    if (axios.isAxiosError(err)) {
      const payload = err.response?.data?.message;
      setError(Array.isArray(payload) ? payload.join(' | ') : payload || fallback);
      return;
    }
    setError(fallback);
  }

  const editableProfiles = profiles.filter((p) => p.nome !== 'Cliente');
  const clienteProfile = profiles.find((p) => p.nome === 'Cliente');

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader title="Perfis & Permissões" subtitle="Gerencie os perfis de acesso e as permissões por módulo do sistema." actions={<BackButton fallbackPath="/sistema" />} />
      <SystemNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      {showForm ? (
        <div className="panel panel--compact">
          <div className="panel__header panel__header--row panel__header--sticky">
            <div>
              <h3>{editingId ? <>Editando: <span style={{ color: 'var(--primary)' }}>{meta.nome}</span></> : 'Novo perfil'}</h3>
              <p>Configure nome e a matriz de permissões por módulo.</p>
            </div>
            <button className="button button--ghost button--small" type="button" onClick={resetForm}>Cancelar</button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '16px 20px 20px' }}>
            <div className="form-grid" style={{ marginBottom: 20 }}>
              <div className="field">
                <label>Nome do perfil</label>
                <input required value={meta.nome} onChange={(e) => setMeta((c) => ({ ...c, nome: e.target.value }))} />
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={meta.ativo} onChange={(e) => setMeta((c) => ({ ...c, ativo: e.target.checked }))} />
                  Perfil ativo
                </label>
              </div>
              <div className="field field--span-2">
                <label>Descrição</label>
                <textarea rows={2} value={meta.descricao} onChange={(e) => setMeta((c) => ({ ...c, descricao: e.target.value }))} />
              </div>
            </div>

            <div className="table-wrap" style={{ marginBottom: 20 }}>
              <table className="table table--dense" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Módulo</th>
                    {COLS.map((col) => (
                      <th key={col.key} style={{ textAlign: 'center', width: 72 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span>{col.label}</span>
                          <input
                            type="checkbox"
                            title={`Marcar/desmarcar todos — ${col.label}`}
                            checked={permissions.every((p) => Boolean(p[col.key]))}
                            onChange={(e) => toggleAll(col.key, e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => {
                    const resource = resources.find((r) => r.id === perm.recursoSistemaId);
                    return (
                      <tr key={perm.recursoSistemaId}>
                        <td style={{ fontWeight: 500 }}>{resource?.nome || perm.recursoSistemaId}</td>
                        {COLS.map((col) => (
                          <td key={col.key} style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(perm[col.key])}
                              onChange={(e) => updatePermission(perm.recursoSistemaId, col.key, e.target.checked)}
                              style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="button" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar perfil' : 'Criar perfil'}
              </button>
              <button className="button button--ghost" type="button" onClick={resetForm}>Cancelar</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="panel panel--compact">
        <div className="panel__header panel__header--row">
          <div>
            <h3>Perfis da empresa</h3>
            <p>{editableProfiles.length} perfil(is) configurado(s).</p>
          </div>
          {!showForm ? (
            <button className="button button--small" type="button" onClick={openNew}>+ Novo perfil</button>
          ) : null}
        </div>

        {loading ? <LoadingBlock label="Carregando perfis..." /> : null}
        {!loading && profiles.length === 0 ? <EmptyState message="Nenhum perfil encontrado." /> : null}

        {!loading && profiles.length > 0 ? (
          <div className="table-wrap table-wrap--full">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th style={{ textAlign: 'center' }}>Usuários</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {editableProfiles.map((profile) => (
                  <tr key={profile.id} style={editingId === profile.id ? { background: 'var(--primary-soft)' } : undefined}>
                    <td>
                      <strong>{profile.nome}</strong>
                      {profile.padraoSistema ? <span className="compact-chip compact-chip--muted" style={{ marginLeft: 8 }}>Padrão</span> : null}
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>{profile.descricao || '—'}</td>
                    <td style={{ textAlign: 'center' }}><span className="compact-chip">{profile._count?.usuariosEmpresa ?? 0}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`compact-chip${profile.ativo ? ' compact-chip--success' : ' compact-chip--danger'}`}>
                        {profile.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <button className="button button--ghost button--small" type="button" onClick={() => startEdit(profile)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {clienteProfile ? (
                  <tr style={{ opacity: 0.6 }}>
                    <td>
                      <strong>{clienteProfile.nome}</strong>
                      <span className="compact-chip compact-chip--muted" style={{ marginLeft: 8 }}>Padrão</span>
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>{clienteProfile.descricao || 'Acesso externo restrito.'}</td>
                    <td style={{ textAlign: 'center' }}><span className="compact-chip">{clienteProfile._count?.usuariosEmpresa ?? 0}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="compact-chip compact-chip--muted">Fixo</span>
                    </td>
                    <td><span style={{ fontSize: 12, color: '#94a3b8' }}>Sem edição</span></td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
