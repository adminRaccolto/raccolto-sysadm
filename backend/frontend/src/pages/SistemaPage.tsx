import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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

type Aba = 'cadastro' | 'configuracao' | 'fiscal';

const REGIMES = [
  { value: '', label: 'Não informado' },
  { value: 'MEI', label: 'MEI' },
  { value: 'SIMPLES', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL', label: 'Lucro Real' },
];

type EmpresaExt = Empresa & {
  infBancarias?: string | null;
  regimeTributario?: string | null;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  certificadoDigitalValidade?: string | null;
  certificadoDigitalStatus?: string | null;
  certificadoDigitalUrl?: string | null;
  issAliquota?: number | null;
  itemListaServico?: string | null;
  codigoTributacaoMunicipio?: string | null;
  cnaeServico?: string | null;
  enotasEmpresaId?: string | null;
  enotasToken?: string | null;
  nfseAtivo?: boolean;
  nfseAmbiente?: string | null;
};

export default function SistemaPage() {
  const { user, refreshMe, switchCompany } = useAuth();
  const [empresa, setEmpresa] = useState<EmpresaExt | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [aba, setAba] = useState<Aba>('cadastro');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Nova empresa modal
  const [novaEmpresaOpen, setNovaEmpresaOpen] = useState(false);
  const [novaEmpresaForm, setNovaEmpresaForm] = useState({ nome: '', nomeFantasia: '', cnpj: '' });
  const [savingNova, setSavingNova] = useState(false);

  // ── Aba 1: Cadastro ──
  const [formCadastro, setFormCadastro] = useState({
    nome: '', nomeFantasia: '', cnpj: '', email: '', telefone: '',
    logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '',
    representanteNome: '', representanteCargo: '', infBancarias: '', logoUrl: '',
  });

  // ── Aba 2: Configuração da Empresa ──
  const [formConfig, setFormConfig] = useState({
    regimeTributario: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    certificadoDigitalValidade: '',
    certificadoDigitalStatus: '',
    certSenha: '',
  });

  // ── Aba 3: Configuração Fiscal ──
  const [formFiscal, setFormFiscal] = useState({
    issAliquota: '',
    itemListaServico: '',
    codigoTributacaoMunicipio: '',
    cnaeServico: '',
    enotasEmpresaId: '',
    enotasToken: '',
    nfseAtivo: false,
    nfseAmbiente: 'homologacao',
  });

  const totalEmpresas = useMemo(() => empresas.length || 1, [empresas.length]);

  function populate(e: EmpresaExt) {
    setFormCadastro({
      nome: e.nome || '',
      nomeFantasia: e.nomeFantasia || '',
      cnpj: e.cnpj || '',
      email: e.email || '',
      telefone: e.telefone || '',
      logradouro: e.logradouro || '',
      numero: e.numero || '',
      complemento: e.complemento || '',
      bairro: e.bairro || '',
      cidade: e.cidade || '',
      estado: e.estado || '',
      cep: e.cep || '',
      representanteNome: e.representanteNome || '',
      representanteCargo: e.representanteCargo || '',
      infBancarias: e.infBancarias || '',
      logoUrl: e.logoUrl || '',
    });
    setFormConfig({
      regimeTributario: e.regimeTributario || '',
      inscricaoEstadual: e.inscricaoEstadual || '',
      inscricaoMunicipal: e.inscricaoMunicipal || '',
      certificadoDigitalValidade: e.certificadoDigitalValidade || '',
      certificadoDigitalStatus: e.certificadoDigitalStatus || '',
      certSenha: '',
    });
    setFormFiscal({
      issAliquota: e.issAliquota != null ? String(e.issAliquota) : '',
      itemListaServico: e.itemListaServico || '',
      codigoTributacaoMunicipio: e.codigoTributacaoMunicipio || '',
      cnaeServico: e.cnaeServico || '',
      enotasEmpresaId: e.enotasEmpresaId || '',
      enotasToken: e.enotasToken || '',
      nfseAtivo: e.nfseAtivo ?? false,
      nfseAmbiente: e.nfseAmbiente || 'homologacao',
    });
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [empRes, empsRes, contasRes] = await Promise.all([
        http.get<EmpresaExt>('/empresas/me'),
        http.get<Empresa[]>('/empresas'),
        http.get<ContaBancaria[]>('/financeiro/contas-bancarias'),
      ]);
      setEmpresa(empRes.data);
      setEmpresas(empsRes.data);
      setContasBancarias(contasRes.data);
      populate(empRes.data);
    } catch (err) {
      setError(apiError(err, 'Falha ao consultar o sistema.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function apiError(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message;
      return Array.isArray(msg) ? msg.join(' | ') : msg || fallback;
    }
    return fallback;
  }

  async function handleSalvarCadastro(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(null);
    try {
      await http.put('/empresas/me', {
        nome: formCadastro.nome,
        nomeFantasia: formCadastro.nomeFantasia || undefined,
        cnpj: formCadastro.cnpj || undefined,
        email: formCadastro.email || undefined,
        telefone: formCadastro.telefone || undefined,
        logradouro: formCadastro.logradouro || undefined,
        numero: formCadastro.numero || undefined,
        complemento: formCadastro.complemento || undefined,
        bairro: formCadastro.bairro || undefined,
        cidade: formCadastro.cidade || undefined,
        estado: formCadastro.estado || undefined,
        cep: formCadastro.cep || undefined,
        representanteNome: formCadastro.representanteNome || undefined,
        representanteCargo: formCadastro.representanteCargo || undefined,
        infBancarias: formCadastro.infBancarias || undefined,
        logoUrl: formCadastro.logoUrl || undefined,
      });
      setSuccess('Cadastro atualizado.');
      await refreshMe();
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar cadastro.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarConfig(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(null);
    try {
      await http.put('/empresas/me', {
        regimeTributario: formConfig.regimeTributario || undefined,
        inscricaoEstadual: formConfig.inscricaoEstadual || undefined,
        inscricaoMunicipal: formConfig.inscricaoMunicipal || undefined,
        certificadoDigitalValidade: formConfig.certificadoDigitalValidade || undefined,
        certificadoDigitalStatus: formConfig.certificadoDigitalStatus || undefined,
      });
      setSuccess('Configuração salva.');
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar configuração.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarFiscal(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(null);
    try {
      await http.put('/empresas/me', {
        issAliquota: formFiscal.issAliquota ? parseFloat(formFiscal.issAliquota) : undefined,
        itemListaServico: formFiscal.itemListaServico || undefined,
        codigoTributacaoMunicipio: formFiscal.codigoTributacaoMunicipio || undefined,
        cnaeServico: formFiscal.cnaeServico || undefined,
        enotasEmpresaId: formFiscal.enotasEmpresaId || undefined,
        enotasToken: formFiscal.enotasToken || undefined,
        nfseAtivo: formFiscal.nfseAtivo,
        nfseAmbiente: formFiscal.nfseAmbiente,
      });
      setSuccess('Configuração fiscal salva.');
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar configuração fiscal.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    setUploadingLogo(true); setError(null); setSuccess(null);
    try {
      const res = await http.post<EmpresaExt>('/empresas/me/logo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEmpresa(res.data);
      setFormCadastro((c) => ({ ...c, logoUrl: res.data.logoUrl || '' }));
      setSuccess('Logo atualizada.');
      await refreshMe();
    } catch (err) {
      setError(apiError(err, 'Falha ao enviar logo.'));
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  }

  async function handleUploadCertificado(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    if (formConfig.certSenha) data.append('senha', formConfig.certSenha);
    setUploadingCert(true); setError(null); setSuccess(null);
    try {
      await http.post('/empresas/me/certificado', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Certificado digital enviado.');
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao enviar certificado.'));
    } finally {
      setUploadingCert(false);
      event.target.value = '';
    }
  }

  async function handleCriarEmpresa(e: FormEvent) {
    e.preventDefault();
    setSavingNova(true); setError(null);
    try {
      await http.post('/empresas', {
        nome: novaEmpresaForm.nome,
        nomeFantasia: novaEmpresaForm.nomeFantasia || undefined,
        cnpj: novaEmpresaForm.cnpj || undefined,
      });
      setNovaEmpresaOpen(false);
      setNovaEmpresaForm({ nome: '', nomeFantasia: '', cnpj: '' });
      setSuccess('Empresa criada. Troque para ela e complete os dados.');
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao criar empresa.'));
    } finally {
      setSavingNova(false);
    }
  }

  const abaClass = (a: Aba) =>
    `tab-pill${aba === a ? ' tab-pill--active' : ''}`;

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Sistema & suporte"
        subtitle="Dados cadastrais, configuração tributária e fiscal da empresa ativa."
        actions={<BackButton fallbackPath="/dashboard" />}
      />
      <SystemNav />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}
      {loading ? <LoadingBlock label="Carregando configurações..." /> : null}

      {!loading && (
        <section className="two-columns two-columns--left-wide two-columns--compact">

          {/* ── COLUNA ESQUERDA: ABAS ─────────────────────────────────── */}
          <div className="panel panel--compact">
            <div className="panel__header panel__header--row">
              <div>
                <h3>{empresa?.nomeFantasia || empresa?.nome || 'Empresa'}</h3>
                <p>Empresa ativa no contexto atual.</p>
              </div>
              <div className="compact-chip">Empresa ativa</div>
            </div>

            {/* Tab pills */}
            <div className="tab-pills">
              <button type="button" className={abaClass('cadastro')} onClick={() => setAba('cadastro')}>
                Cadastro
              </button>
              <button type="button" className={abaClass('configuracao')} onClick={() => setAba('configuracao')}>
                Configuração
              </button>
              <button type="button" className={abaClass('fiscal')} onClick={() => setAba('fiscal')}>
                Configuração Fiscal
              </button>
            </div>

            {/* ── ABA 1: CADASTRO ────────────────────────────────────── */}
            {aba === 'cadastro' && (
              <form className="form-grid" onSubmit={(e) => void handleSalvarCadastro(e)}>
                {/* Logo */}
                <div className="brand-upload-card field--span-2">
                  {formCadastro.logoUrl || empresa?.logoUrl ? (
                    <img className="logo-preview logo-preview--large" src={formCadastro.logoUrl || empresa?.logoUrl || ''} alt="Logo" />
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
                  <input value={formCadastro.nome} onChange={(e) => setFormCadastro((c) => ({ ...c, nome: e.target.value }))} required />
                </div>
                <div className="field">
                  <label>Nome fantasia</label>
                  <input value={formCadastro.nomeFantasia} onChange={(e) => setFormCadastro((c) => ({ ...c, nomeFantasia: e.target.value }))} />
                </div>
                <div className="field">
                  <label>CNPJ</label>
                  <input value={formCadastro.cnpj} onChange={(e) => setFormCadastro((c) => ({ ...c, cnpj: e.target.value }))} />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input type="email" value={formCadastro.email} onChange={(e) => setFormCadastro((c) => ({ ...c, email: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input value={formCadastro.telefone} onChange={(e) => setFormCadastro((c) => ({ ...c, telefone: e.target.value }))} />
                </div>
                <div className="field field--span-2">
                  <label>Informações bancárias / PIX</label>
                  <input value={formCadastro.infBancarias} onChange={(e) => setFormCadastro((c) => ({ ...c, infBancarias: e.target.value }))} placeholder="Ex.: PIX CNPJ · Banco Itaú Ag 0001 C/C 12345-6" />
                </div>
                <div className="field field--span-2">
                  <label>Logradouro</label>
                  <input value={formCadastro.logradouro} onChange={(e) => setFormCadastro((c) => ({ ...c, logradouro: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Número</label>
                  <input value={formCadastro.numero} onChange={(e) => setFormCadastro((c) => ({ ...c, numero: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Complemento</label>
                  <input value={formCadastro.complemento} onChange={(e) => setFormCadastro((c) => ({ ...c, complemento: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Bairro</label>
                  <input value={formCadastro.bairro} onChange={(e) => setFormCadastro((c) => ({ ...c, bairro: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Cidade</label>
                  <input value={formCadastro.cidade} onChange={(e) => setFormCadastro((c) => ({ ...c, cidade: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <input value={formCadastro.estado} onChange={(e) => setFormCadastro((c) => ({ ...c, estado: e.target.value }))} />
                </div>
                <div className="field">
                  <label>CEP</label>
                  <input value={formCadastro.cep} onChange={(e) => setFormCadastro((c) => ({ ...c, cep: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Representante legal</label>
                  <input value={formCadastro.representanteNome} onChange={(e) => setFormCadastro((c) => ({ ...c, representanteNome: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Cargo do representante</label>
                  <input value={formCadastro.representanteCargo} onChange={(e) => setFormCadastro((c) => ({ ...c, representanteCargo: e.target.value }))} />
                </div>
                <div className="field field--span-2">
                  <label>Logo por URL (opcional)</label>
                  <input value={formCadastro.logoUrl} onChange={(e) => setFormCadastro((c) => ({ ...c, logoUrl: e.target.value }))} placeholder="URL externa" />
                </div>
                <div className="field field--span-2">
                  <button className="button" type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar cadastro'}
                  </button>
                </div>
              </form>
            )}

            {/* ── ABA 2: CONFIGURAÇÃO DA EMPRESA ─────────────────────── */}
            {aba === 'configuracao' && (
              <form className="form-grid" onSubmit={(e) => void handleSalvarConfig(e)}>
                <div className="field field--span-2">
                  <label>Regime tributário</label>
                  <select value={formConfig.regimeTributario} onChange={(e) => setFormConfig((c) => ({ ...c, regimeTributario: e.target.value }))}>
                    {REGIMES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Inscrição estadual</label>
                  <input value={formConfig.inscricaoEstadual} onChange={(e) => setFormConfig((c) => ({ ...c, inscricaoEstadual: e.target.value }))} placeholder="IE ou ISENTO" />
                </div>
                <div className="field">
                  <label>Inscrição municipal</label>
                  <input value={formConfig.inscricaoMunicipal} onChange={(e) => setFormConfig((c) => ({ ...c, inscricaoMunicipal: e.target.value }))} />
                </div>

                {/* Certificado digital */}
                <div className="field field--span-2">
                  <label style={{ fontWeight: 600, marginBottom: 4 }}>Certificado digital A1 (.pfx)</label>
                  {empresa?.certificadoDigitalUrl ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span className="badge badge--success">Certificado enviado</span>
                      {empresa.certificadoDigitalValidade && (
                        <small className="table-subline">Validade: {empresa.certificadoDigitalValidade}</small>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>Nenhum certificado enviado.</p>
                  )}
                </div>
                <div className="field">
                  <label>Senha do certificado</label>
                  <input
                    type="password"
                    value={formConfig.certSenha}
                    onChange={(e) => setFormConfig((c) => ({ ...c, certSenha: e.target.value }))}
                    placeholder="Informe antes de enviar o arquivo"
                    autoComplete="new-password"
                  />
                </div>
                <div className="field" style={{ alignSelf: 'end' }}>
                  <label className="button button--ghost button--small file-upload-button" htmlFor="cert-file-input" style={{ display: 'inline-block' }}>
                    {uploadingCert ? 'Enviando...' : empresa?.certificadoDigitalUrl ? 'Substituir .pfx' : 'Enviar .pfx'}
                  </label>
                  <input id="cert-file-input" type="file" accept=".pfx,.p12" onChange={handleUploadCertificado} hidden />
                </div>
                <div className="field">
                  <label>Validade (informativo)</label>
                  <input
                    type="text"
                    value={formConfig.certificadoDigitalValidade}
                    onChange={(e) => setFormConfig((c) => ({ ...c, certificadoDigitalValidade: e.target.value }))}
                    placeholder="Ex.: 12/2026"
                  />
                </div>
                <div className="field">
                  <label>Status do certificado</label>
                  <input
                    value={formConfig.certificadoDigitalStatus}
                    onChange={(e) => setFormConfig((c) => ({ ...c, certificadoDigitalStatus: e.target.value }))}
                    placeholder="Ex.: Válido, Vencido, Revogado"
                  />
                </div>
                <div className="field field--span-2">
                  <button className="button" type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar configuração'}
                  </button>
                </div>
              </form>
            )}

            {/* ── ABA 3: CONFIGURAÇÃO FISCAL ─────────────────────────── */}
            {aba === 'fiscal' && (
              <form className="form-grid" onSubmit={(e) => void handleSalvarFiscal(e)}>
                <div className="field field--span-2" style={{ background: 'var(--color-surface-2,#f3f4f6)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--color-muted)' }}>
                  <strong>Integração eNotas</strong> — configure o ID e token da sua empresa no painel eNotas para habilitar emissão de NFS-e diretamente pelo Raccolto.
                </div>

                <div className="field">
                  <label>Alíquota ISS (%)</label>
                  <input type="number" min="0" max="10" step="0.01" value={formFiscal.issAliquota} onChange={(e) => setFormFiscal((c) => ({ ...c, issAliquota: e.target.value }))} placeholder="5.00" />
                </div>
                <div className="field">
                  <label>Código tributação municipal</label>
                  <input value={formFiscal.codigoTributacaoMunicipio} onChange={(e) => setFormFiscal((c) => ({ ...c, codigoTributacaoMunicipio: e.target.value }))} placeholder="Ex.: 17.06" />
                </div>
                <div className="field">
                  <label>Item lista de serviços (LC 116/03)</label>
                  <input value={formFiscal.itemListaServico} onChange={(e) => setFormFiscal((c) => ({ ...c, itemListaServico: e.target.value }))} placeholder="Ex.: 17.06" />
                </div>
                <div className="field">
                  <label>CNAE do serviço</label>
                  <input value={formFiscal.cnaeServico} onChange={(e) => setFormFiscal((c) => ({ ...c, cnaeServico: e.target.value }))} placeholder="Ex.: 7020-4/00" />
                </div>
                <div className="field">
                  <label>ID da empresa no eNotas</label>
                  <input value={formFiscal.enotasEmpresaId} onChange={(e) => setFormFiscal((c) => ({ ...c, enotasEmpresaId: e.target.value }))} placeholder="UUID fornecido pelo eNotas" />
                </div>
                <div className="field">
                  <label>Token / API Key do eNotas</label>
                  <input type="password" value={formFiscal.enotasToken} onChange={(e) => setFormFiscal((c) => ({ ...c, enotasToken: e.target.value }))} placeholder="Chave de autenticação" autoComplete="new-password" />
                </div>
                <div className="field">
                  <label>Ambiente NFS-e</label>
                  <select value={formFiscal.nfseAmbiente} onChange={(e) => setFormFiscal((c) => ({ ...c, nfseAmbiente: e.target.value }))}>
                    <option value="homologacao">Homologação (testes)</option>
                    <option value="producao">Produção</option>
                  </select>
                </div>
                <div className="field">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={formFiscal.nfseAtivo} onChange={(e) => setFormFiscal((c) => ({ ...c, nfseAtivo: e.target.checked }))} />
                    NFS-e habilitada
                  </label>
                </div>
                <div className="field field--span-2">
                  <button className="button" type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar configuração fiscal'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── COLUNA DIREITA ──────────────────────────────────────── */}
          <div className="page-stack page-stack--compact">

            {/* Resumo */}
            <div className="panel panel--compact">
              <div className="panel__header"><h3>Resumo</h3></div>
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
              ) : <EmptyState message="Empresa não disponível." />}
            </div>

            {/* Empresas vinculadas */}
            <div className="panel panel--compact">
              <div className="panel__header panel__header--row">
                <div>
                  <h3>Empresas vinculadas</h3>
                  <p>{empresas.length} empresa(s).</p>
                </div>
                <button className="button button--ghost button--small" type="button" onClick={() => setNovaEmpresaOpen(true)}>
                  + Nova
                </button>
              </div>
              {empresas.length === 0 ? <EmptyState message="Nenhuma empresa." /> : null}
              {empresas.length > 0 && (
                <div className="stack-list stack-list--compact">
                  {empresas.map((emp) => {
                    const atual = user?.empresaId === emp.id;
                    return (
                      <div key={emp.id} className="list-card list-card--compact">
                        <div>
                          <strong>{emp.nomeFantasia || emp.nome}</strong>
                          {emp.nomeFantasia ? <p className="muted">{emp.nome}</p> : null}
                          <small className="muted">Clientes: {emp._count?.clientes ?? 0} · Contratos: {emp._count?.contratos ?? 0}</small>
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
              )}
            </div>

            {/* Administração */}
            <div className="panel panel--compact">
              <div className="panel__header"><h3>Administração</h3></div>
              <div className="stack-list stack-list--compact">
                <a className="list-card list-card--compact list-card--link" href="/usuarios">
                  <div><strong>Usuários</strong><p className="muted">Gerencie acessos por pessoa e empresa.</p></div>
                </a>
                <a className="list-card list-card--compact list-card--link" href="/perfis-acesso">
                  <div><strong>Perfis & permissões</strong><p className="muted">Defina a matriz de permissões.</p></div>
                </a>
              </div>
            </div>

            {/* Contas bancárias */}
            {contasBancarias.length > 0 && (
              <div className="panel panel--compact">
                <div className="panel__header">
                  <h3>Contas bancárias</h3>
                  <p>{contasBancarias.length} conta(s).</p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Conta</th><th>Banco</th><th>Tipo</th><th>Saldo</th></tr>
                    </thead>
                    <tbody>
                      {contasBancarias.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.nome}</strong><div className="table-subline">{item.numeroConta || '—'}</div></td>
                          <td>{item.banco || '—'}</td>
                          <td>{item.tipo}</td>
                          <td>{item.saldoAtual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── MODAL: NOVA EMPRESA ─────────────────────────────────────── */}
      <Modal
        open={novaEmpresaOpen}
        title="Nova empresa"
        subtitle="Crie a empresa e complete os dados depois em Cadastro."
        onClose={() => { if (!savingNova) setNovaEmpresaOpen(false); }}
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
