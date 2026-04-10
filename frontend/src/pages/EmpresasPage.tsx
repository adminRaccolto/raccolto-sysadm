import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import SystemNav from '../components/SystemNav';
import { useAuth } from '../contexts/AuthContext';
import type { Empresa } from '../types/api';

const initialForm = { nome: '', nomeFantasia: '', cnpj: '', email: '', telefone: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '', representanteNome: '', representanteCargo: '', infBancarias: '' };

export default function EmpresasPage() {
  const { user, switchCompany } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await http.get<Empresa[]>('/empresas');
      setEmpresas(response.data);
    } catch (err) {
      handleError(err, 'Falha ao carregar empresas.');
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
      await http.post('/empresas', {
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
      });
      setForm(initialForm);
      setSuccess('Empresa criada e vinculada ao seu acesso.');
      await load();
    } catch (err) {
      handleError(err, 'Falha ao criar empresa.');
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
      <PageHeader title="Empresas" subtitle="Base operacional do multiempresa: cadastre empresas e alterne o contexto atual." actions={<BackButton fallbackPath="/sistema" />} />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}
      <SystemNav />

      <section className="two-columns two-columns--left-wide two-columns--compact">
        <form className="panel form-grid panel--compact" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>Nova empresa</h3>
            <p>Ao criar uma nova empresa, seu usuário recebe acesso administrativo automaticamente.</p>
          </div>
          <div className="field field--span-2">
            <label>Nome</label>
            <input required value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} />
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
            <label>Informações bancárias / PIX</label>
            <input value={form.infBancarias} onChange={(e) => setForm((c) => ({ ...c, infBancarias: e.target.value }))} placeholder="Ex.: PIX CNPJ · Banco Itaú Ag 0001 C/C 12345-6" />
          </div>
          <button className="button" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar empresa'}</button>
        </form>

        <div className="panel panel--compact">
          <div className="panel__header">
            <h3>Empresas disponíveis</h3>
            <p>{empresas.length} empresa(s) vinculada(s) ao seu usuário.</p>
          </div>
          {loading ? <LoadingBlock label="Carregando empresas..." /> : null}
          {!loading && empresas.length === 0 ? <EmptyState message="Nenhuma empresa disponível." /> : null}
          {!loading && empresas.length > 0 ? (
            <div className="stack-list stack-list--compact">
              {empresas.map((empresa) => {
                const atual = user?.empresaId === empresa.id;
                return (
                  <div key={empresa.id} className="list-card list-card--compact">
                    <div>
                      <strong>{empresa.nomeFantasia || empresa.nome}</strong>
                      <p className="muted">{empresa.nome}</p>
                      <small className="muted">
                        Clientes: {empresa._count?.clientes ?? 0} · Contratos: {empresa._count?.contratos ?? 0}
                      </small>
                    </div>
                    <div className="table-actions">
                      {atual ? <span className="compact-chip">Empresa atual</span> : null}
                      {!atual ? (
                        <button className="button button--ghost button--small" type="button" onClick={() => void switchCompany(empresa.id)}>
                          Trocar para esta
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
