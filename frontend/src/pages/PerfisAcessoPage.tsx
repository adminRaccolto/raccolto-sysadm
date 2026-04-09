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

const initialMeta = { nome: '', descricao: '', ativo: true };

export default function PerfisAcessoPage() {
  const [resources, setResources] = useState<RecursoSistema[]>([]);
  const [profiles, setProfiles] = useState<PerfilAcesso[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meta, setMeta] = useState(initialMeta);
  const [permissions, setPermissions] = useState<PermissionFormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const emptyPermissions = useMemo(
    () => resources.map((resource) => ({ recursoSistemaId: resource.id, visualizar: true, criar: false, editar: false, excluir: false, aprovar: false, administrar: false })),
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
      if (!editingId) setPermissions(resourcesResponse.data.map((resource) => ({ recursoSistemaId: resource.id, visualizar: true, criar: false, editar: false, excluir: false, aprovar: false, administrar: false })));
    } catch (err) {
      handleError(err, 'Falha ao carregar perfis e recursos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setMeta(initialMeta);
    setPermissions(emptyPermissions);
  }

  function startEdit(profile: PerfilAcesso) {
    setEditingId(profile.id);
    setMeta({ nome: profile.nome, descricao: profile.descricao || '', ativo: profile.ativo });
    setPermissions(resources.map((resource) => {
      const current = profile.permissoes.find((item) => item.recursoSistemaId === resource.id);
      return {
        recursoSistemaId: resource.id,
        visualizar: current?.visualizar ?? true,
        criar: current?.criar ?? false,
        editar: current?.editar ?? false,
        excluir: current?.excluir ?? false,
        aprovar: current?.aprovar ?? false,
        administrar: current?.administrar ?? false,
      };
    }));
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

  function updatePermission(resourceId: string, field: keyof PermissionFormItem, value: boolean) {
    setPermissions((current) => current.map((item) => (item.recursoSistemaId === resourceId ? { ...item, [field]: value } : item)));
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
      <PageHeader title="Perfis & permissões" subtitle="Cadastre perfis dinâmicos a partir da matriz de recursos do sistema." actions={<BackButton fallbackPath="/sistema" />} />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}
      <SystemNav />

      <section className="two-columns two-columns--left-wide two-columns--compact">
        <form className="panel form-grid panel--compact" onSubmit={handleSubmit}>
          <div className="panel__header panel__header--row">
            <div>
              <h3>{editingId ? 'Editar perfil' : 'Novo perfil'}</h3>
              <p>Essa é a base da administração dinâmica de acessos do Raccolto.</p>
            </div>
            {editingId ? <button className="button button--ghost button--small" type="button" onClick={resetForm}>Cancelar</button> : null}
          </div>
          <div className="field">
            <label>Nome do perfil</label>
            <input required value={meta.nome} onChange={(e) => setMeta((c) => ({ ...c, nome: e.target.value }))} />
          </div>
          <div className="field field--checkbox">
            <label><input type="checkbox" checked={meta.ativo} onChange={(e) => setMeta((c) => ({ ...c, ativo: e.target.checked }))} /> Perfil ativo</label>
          </div>
          <div className="field field--span-2">
            <label>Descrição</label>
            <textarea rows={2} value={meta.descricao} onChange={(e) => setMeta((c) => ({ ...c, descricao: e.target.value }))} />
          </div>

          <div className="field field--span-2">
            <label>Matriz de permissões</label>
            <div className="table-wrap">
              <table className="table table--dense">
                <thead>
                  <tr>
                    <th>Recurso</th>
                    <th>Ver</th>
                    <th>Criar</th>
                    <th>Editar</th>
                    <th>Excluir</th>
                    <th>Aprovar</th>
                    <th>Administrar</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => {
                    const resource = resources.find((item) => item.id === permission.recursoSistemaId);
                    return (
                      <tr key={permission.recursoSistemaId}>
                        <td>{resource?.nome || permission.recursoSistemaId}</td>
                        {(['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'administrar'] as Array<keyof PermissionFormItem>).map((field) => (
                          <td key={field}>
                            <input type="checkbox" checked={Boolean(permission[field])} onChange={(e) => updatePermission(permission.recursoSistemaId, field, e.target.checked)} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <button className="button" type="submit" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar perfil' : 'Criar perfil'}</button>
        </form>

        <div className="panel panel--compact">
          <div className="panel__header">
            <h3>Perfis da empresa atual</h3>
            <p>Padronize perfis e depois aloque usuários a eles.</p>
          </div>
          {loading ? <LoadingBlock label="Carregando perfis..." /> : null}
          {!loading && profiles.length === 0 ? <EmptyState message="Nenhum perfil encontrado." /> : null}
          {!loading && profiles.length > 0 ? (
            <div className="stack-list stack-list--compact">
              {profiles.map((profile) => (
                <div key={profile.id} className="list-card list-card--compact">
                  <div>
                    <strong>{profile.nome}</strong>
                    <p className="muted">{profile.descricao || 'Sem descrição.'}</p>
                    <small className="muted">{profile._count?.usuariosEmpresa ?? 0} usuário(s) vinculado(s)</small>
                  </div>
                  <div className="table-actions">
                    {profile.padraoSistema ? <span className="compact-chip">Padrão</span> : null}
                    <button className="button button--ghost button--small" type="button" onClick={() => startEdit(profile)}>Editar</button>
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
