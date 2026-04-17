import { FormEvent, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { http } from '../api/http';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import type { Cliente } from '../types/api';

const CULTURAS_OPCOES = [
  { value: 'SOJA', label: 'Soja' },
  { value: 'MILHO', label: 'Milho' },
  { value: 'MILHO_PIPOCA', label: 'Milho Pipoca' },
  { value: 'ALGODAO', label: 'Algodão' },
  { value: 'CULTURA_COBERTURA', label: 'Cultura de Cobertura' },
  { value: 'OUTRO', label: 'Outro' },
];

interface CulturaArea { cultura: string; area?: number; mediaHistorica?: number; }
interface Frustracao { ano?: string; cultura?: string; mediaColhida?: number; }

interface Fazenda {
  nomeFazenda: string;
  areaTotal?: number;
  areaPlantio?: number;
  areaPlantioPropia?: number;
  areaPlantioArrendada?: number;
  culturas: string[];
  culturaOutro?: string;
  culturasAreas: CulturaArea[];
  frustracaoSafra: boolean;
  frustracoes: Frustracao[];
}

interface FormState {
  fazendas: Fazenda[];
  negocioFamiliar?: boolean;
  membrosEnvolvidos?: number;
  decisaoPorConselho?: boolean;
  emSucessao?: boolean;
  geracaoSucessao?: string;
  funcoesDefinidas?: boolean;
  governancaImplantada?: boolean;
  utilizaSistemaGestao?: boolean;
  qualSistema?: string;
  sabeCustoProduzir?: boolean;
  temFluxoCaixaProjetado?: boolean;
  sabeCompromissoFuturo?: boolean;
  baseComercializacao?: string;
  travaComercializacao?: boolean;
  negocioAlavancado?: boolean;
  expectativaParceria?: string;
}

function emptyFazenda(): Fazenda {
  return { nomeFazenda: '', culturas: [], culturasAreas: [], frustracaoSafra: false, frustracoes: [] };
}

const initialForm: FormState = { fazendas: [emptyFazenda()] };

function YesNo({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <input type="radio" checked={value === true} onChange={() => onChange(true)} /> Sim
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <input type="radio" checked={value === false} onChange={() => onChange(false)} /> Não
      </label>
    </div>
  );
}

export default function ChecklistDiagnosticoPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) return;
    void (async () => {
      setLoading(true);
      try {
        const [clienteRes, checklistRes] = await Promise.all([
          http.get<Cliente>(`/clientes/${clienteId}`),
          http.get<any>(`/checklist-diagnostico/${clienteId}`),
        ]);
        setCliente(clienteRes.data);
        const c = checklistRes.data;
        if (c) {
          setForm({
            fazendas: c.fazendas?.length ? c.fazendas.map((f: any) => ({
              nomeFazenda: f.nomeFazenda,
              areaTotal: f.areaTotal ?? undefined,
              areaPlantio: f.areaPlantio ?? undefined,
              areaPlantioPropia: f.areaPlantioPropia ?? undefined,
              areaPlantioArrendada: f.areaPlantioArrendada ?? undefined,
              culturas: f.culturas ?? [],
              culturaOutro: f.culturaOutro ?? undefined,
              culturasAreas: f.culturasAreas ?? [],
              frustracaoSafra: f.frustracaoSafra ?? false,
              frustracoes: f.frustracoes ?? [],
            })) : [emptyFazenda()],
            negocioFamiliar: c.negocioFamiliar ?? undefined,
            membrosEnvolvidos: c.membrosEnvolvidos ?? undefined,
            decisaoPorConselho: c.decisaoPorConselho ?? undefined,
            emSucessao: c.emSucessao ?? undefined,
            geracaoSucessao: c.geracaoSucessao ?? '',
            funcoesDefinidas: c.funcoesDefinidas ?? undefined,
            governancaImplantada: c.governancaImplantada ?? undefined,
            utilizaSistemaGestao: c.utilizaSistemaGestao ?? undefined,
            qualSistema: c.qualSistema ?? '',
            sabeCustoProduzir: c.sabeCustoProduzir ?? undefined,
            temFluxoCaixaProjetado: c.temFluxoCaixaProjetado ?? undefined,
            sabeCompromissoFuturo: c.sabeCompromissoFuturo ?? undefined,
            baseComercializacao: c.baseComercializacao ?? undefined,
            travaComercializacao: c.travaComercializacao ?? undefined,
            negocioAlavancado: c.negocioAlavancado ?? undefined,
            expectativaParceria: c.expectativaParceria ?? '',
          });
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status !== 404) {
          setError('Falha ao carregar dados.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [clienteId]);

  function setFazenda(index: number, patch: Partial<Fazenda>) {
    setForm((c) => {
      const fazendas = [...c.fazendas];
      fazendas[index] = { ...fazendas[index], ...patch };
      return { ...c, fazendas };
    });
  }

  function addFazenda() {
    setForm((c) => ({ ...c, fazendas: [...c.fazendas, emptyFazenda()] }));
  }

  function removeFazenda(index: number) {
    setForm((c) => ({ ...c, fazendas: c.fazendas.filter((_, i) => i !== index) }));
  }

  function toggleCultura(fazendaIdx: number, cultura: string) {
    const fazenda = form.fazendas[fazendaIdx];
    const has = fazenda.culturas.includes(cultura);
    const novasCulturas = has ? fazenda.culturas.filter((c) => c !== cultura) : [...fazenda.culturas, cultura];
    const novasAreas: CulturaArea[] = novasCulturas.map((c) => {
      const existente = fazenda.culturasAreas.find((ca) => ca.cultura === c);
      return existente ?? { cultura: c };
    });
    setFazenda(fazendaIdx, { culturas: novasCulturas, culturasAreas: novasAreas });
  }

  function setCulturaArea(fazendaIdx: number, cultura: string, field: keyof CulturaArea, value: number | string) {
    const fazenda = form.fazendas[fazendaIdx];
    const novasAreas = fazenda.culturasAreas.map((ca) =>
      ca.cultura === cultura ? { ...ca, [field]: value } : ca,
    );
    setFazenda(fazendaIdx, { culturasAreas: novasAreas });
  }

  function addFrustracao(fazendaIdx: number) {
    const fazenda = form.fazendas[fazendaIdx];
    setFazenda(fazendaIdx, { frustracoes: [...fazenda.frustracoes, {}] });
  }

  function setFrustracao(fazendaIdx: number, row: number, patch: Partial<Frustracao>) {
    const fazenda = form.fazendas[fazendaIdx];
    const novas = fazenda.frustracoes.map((f, i) => (i === row ? { ...f, ...patch } : f));
    setFazenda(fazendaIdx, { frustracoes: novas });
  }

  function removeFrustracao(fazendaIdx: number, row: number) {
    const fazenda = form.fazendas[fazendaIdx];
    setFazenda(fazendaIdx, { frustracoes: fazenda.frustracoes.filter((_, i) => i !== row) });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clienteId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post(`/checklist-diagnostico/${clienteId}`, form);
      setSuccess('Diagnóstico salvo com sucesso.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(' | ') : msg || 'Falha ao salvar.');
      } else {
        setError('Falha ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-stack"><LoadingBlock label="Carregando diagnóstico..." /></div>;

  const nomeCliente = cliente?.nomeFantasia || cliente?.razaoSocial || '—';

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Diagnóstico Inicial"
        subtitle={`Cliente: ${nomeCliente}`}
        actions={<BackButton fallbackPath="/clientes" />}
      />

      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <form onSubmit={handleSubmit}>

        {/* BLOCO 1 */}
        <div className="panel panel--compact" style={{ marginBottom: 16 }}>
          <div className="panel__header">
            <h3>Bloco 1 — Dados do Cliente</h3>
            <p>Informações cadastradas no sistema.</p>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <div className="form-grid">
              <div className="field">
                <label>Nome / Razão Social</label>
                <input readOnly value={cliente?.razaoSocial || ''} style={{ background: 'var(--surface-muted, #f8fafc)' }} />
              </div>
              <div className="field">
                <label>Nome Fantasia</label>
                <input readOnly value={cliente?.nomeFantasia || ''} style={{ background: 'var(--surface-muted, #f8fafc)' }} />
              </div>
              <div className="field">
                <label>CPF / CNPJ</label>
                <input readOnly value={cliente?.cpfCnpj || ''} style={{ background: 'var(--surface-muted, #f8fafc)' }} />
              </div>
              <div className="field">
                <label>E-mail</label>
                <input readOnly value={cliente?.email || ''} style={{ background: 'var(--surface-muted, #f8fafc)' }} />
              </div>
              <div className="field">
                <label>Telefone</label>
                <input readOnly value={cliente?.telefone || ''} style={{ background: 'var(--surface-muted, #f8fafc)' }} />
              </div>
              <div className="field">
                <label>Cidade / Estado</label>
                <input readOnly value={[cliente?.cidade, cliente?.estado].filter(Boolean).join(' — ') || ''} style={{ background: 'var(--surface-muted, #f8fafc)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* BLOCO 2 */}
        <div className="panel panel--compact" style={{ marginBottom: 16 }}>
          <div className="panel__header panel__header--row">
            <div>
              <h3>Bloco 2 — Estrutura Física e Produção</h3>
              <p>{form.fazendas.length} fazenda(s) cadastrada(s).</p>
            </div>
            <button type="button" className="button button--small" onClick={addFazenda}>+ Adicionar Fazenda</button>
          </div>

          {form.fazendas.map((fazenda, fi) => (
            <div key={fi} style={{ borderTop: '1px solid var(--border)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <strong style={{ color: 'var(--primary)' }}>Fazenda {fi + 1}</strong>
                {form.fazendas.length > 1 ? (
                  <button type="button" className="button button--ghost button--small" style={{ color: '#dc2626' }} onClick={() => removeFazenda(fi)}>Remover</button>
                ) : null}
              </div>

              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="field field--span-2">
                  <label>Nome da Fazenda</label>
                  <input required value={fazenda.nomeFazenda} onChange={(e) => setFazenda(fi, { nomeFazenda: e.target.value })} />
                </div>
                <div className="field">
                  <label>Área Total (ha)</label>
                  <input type="number" step="0.01" min="0" value={fazenda.areaTotal ?? ''} onChange={(e) => setFazenda(fi, { areaTotal: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="field">
                  <label>Área de Plantio (ha)</label>
                  <input type="number" step="0.01" min="0" value={fazenda.areaPlantio ?? ''} onChange={(e) => setFazenda(fi, { areaPlantio: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="field">
                  <label>Área Própria (ha)</label>
                  <input type="number" step="0.01" min="0" value={fazenda.areaPlantioPropia ?? ''} onChange={(e) => setFazenda(fi, { areaPlantioPropia: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="field">
                  <label>Área Arrendada (ha)</label>
                  <input type="number" step="0.01" min="0" value={fazenda.areaPlantioArrendada ?? ''} onChange={(e) => setFazenda(fi, { areaPlantioArrendada: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label>Culturas Aplicadas</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
                  {CULTURAS_OPCOES.map((opt) => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={fazenda.culturas.includes(opt.value)}
                        onChange={() => toggleCultura(fi, opt.value)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {fazenda.culturas.includes('OUTRO') ? (
                  <input
                    style={{ marginTop: 8 }}
                    placeholder="Qual cultura?"
                    value={fazenda.culturaOutro ?? ''}
                    onChange={(e) => setFazenda(fi, { culturaOutro: e.target.value })}
                  />
                ) : null}
              </div>

              {fazenda.culturas.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>Área por Cultura</label>
                  <div className="table-wrap">
                    <table className="table table--dense" style={{ fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Cultura</th>
                          <th>Qtd. Área (ha)</th>
                          <th>Média Histórica (sc/ha)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fazenda.culturasAreas.map((ca) => {
                          const label = CULTURAS_OPCOES.find((o) => o.value === ca.cultura)?.label ?? ca.cultura;
                          return (
                            <tr key={ca.cultura}>
                              <td style={{ fontWeight: 500 }}>{label}</td>
                              <td>
                                <input
                                  type="number" step="0.01" min="0" style={{ width: 120 }}
                                  value={ca.area ?? ''}
                                  onChange={(e) => setCulturaArea(fi, ca.cultura, 'area', e.target.value ? Number(e.target.value) : '')}
                                />
                              </td>
                              <td>
                                <input
                                  type="number" step="0.01" min="0" style={{ width: 120 }}
                                  value={ca.mediaHistorica ?? ''}
                                  onChange={(e) => setCulturaArea(fi, ca.cultura, 'mediaHistorica', e.target.value ? Number(e.target.value) : '')}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="field" style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Houve frustração de safra nos últimos 5 anos?</label>
                <YesNo value={fazenda.frustracaoSafra || undefined} onChange={(v) => setFazenda(fi, { frustracaoSafra: v, frustracoes: v ? fazenda.frustracoes : [] })} />
              </div>

              {fazenda.frustracaoSafra ? (
                <div>
                  <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>Frustrações de Safra</label>
                  <div className="table-wrap" style={{ marginBottom: 8 }}>
                    <table className="table table--dense" style={{ fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Ano</th>
                          <th>Cultura</th>
                          <th>Média Colhida (sc/ha)</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fazenda.frustracoes.map((fr, ri) => (
                          <tr key={ri}>
                            <td><input style={{ width: 80 }} placeholder="2021" value={fr.ano ?? ''} onChange={(e) => setFrustracao(fi, ri, { ano: e.target.value })} /></td>
                            <td><input style={{ width: 130 }} placeholder="Soja" value={fr.cultura ?? ''} onChange={(e) => setFrustracao(fi, ri, { cultura: e.target.value })} /></td>
                            <td><input type="number" step="0.01" style={{ width: 130 }} value={fr.mediaColhida ?? ''} onChange={(e) => setFrustracao(fi, ri, { mediaColhida: e.target.value ? Number(e.target.value) : undefined })} /></td>
                            <td><button type="button" className="button button--ghost button--small" style={{ color: '#dc2626' }} onClick={() => removeFrustracao(fi, ri)}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="button button--ghost button--small" onClick={() => addFrustracao(fi)}>+ Linha</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* BLOCO 3 */}
        <div className="panel panel--compact" style={{ marginBottom: 16 }}>
          <div className="panel__header">
            <h3>Bloco 3 — Estrutura Familiar</h3>
          </div>
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div className="field">
              <label style={{ display: 'block', marginBottom: 6 }}>O negócio é familiar?</label>
              <YesNo value={form.negocioFamiliar} onChange={(v) => setForm((c) => ({ ...c, negocioFamiliar: v }))} />
            </div>

            {form.negocioFamiliar ? (
              <>
                <div className="form-grid">
                  <div className="field">
                    <label>Quantos estão envolvidos na operação?</label>
                    <input type="number" min="1" value={form.membrosEnvolvidos ?? ''} onChange={(e) => setForm((c) => ({ ...c, membrosEnvolvidos: e.target.value ? Number(e.target.value) : undefined }))} />
                  </div>
                  <div className="field">
                    <label style={{ display: 'block', marginBottom: 6 }}>As decisões são tomadas em conselho ou unicamente pelo gestor?</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" checked={form.decisaoPorConselho === true} onChange={() => setForm((c) => ({ ...c, decisaoPorConselho: true }))} /> Conselho
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" checked={form.decisaoPorConselho === false} onChange={() => setForm((c) => ({ ...c, decisaoPorConselho: false }))} /> Somente pelo gestor
                      </label>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label style={{ display: 'block', marginBottom: 6 }}>A família está passando por sucessão?</label>
                  <YesNo value={form.emSucessao} onChange={(v) => setForm((c) => ({ ...c, emSucessao: v }))} />
                </div>

                {form.emSucessao ? (
                  <div className="field" style={{ maxWidth: 320 }}>
                    <label>Qual geração está em sucessão?</label>
                    <input value={form.geracaoSucessao ?? ''} onChange={(e) => setForm((c) => ({ ...c, geracaoSucessao: e.target.value }))} placeholder="Ex: 2ª geração" />
                  </div>
                ) : null}

                <div className="field">
                  <label style={{ display: 'block', marginBottom: 6 }}>As funções de cada membro são bem definidas?</label>
                  <YesNo value={form.funcoesDefinidas} onChange={(v) => setForm((c) => ({ ...c, funcoesDefinidas: v }))} />
                </div>

                <div className="field">
                  <label style={{ display: 'block', marginBottom: 6 }}>Já iniciaram a implantação de governança e compliance?</label>
                  <YesNo value={form.governancaImplantada} onChange={(v) => setForm((c) => ({ ...c, governancaImplantada: v }))} />
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* BLOCO 4 */}
        <div className="panel panel--compact" style={{ marginBottom: 16 }}>
          <div className="panel__header">
            <h3>Bloco 4 — Conhecimento do Negócio</h3>
          </div>
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div className="field">
              <label style={{ display: 'block', marginBottom: 6 }}>Utiliza sistema de gestão?</label>
              <YesNo value={form.utilizaSistemaGestao} onChange={(v) => setForm((c) => ({ ...c, utilizaSistemaGestao: v }))} />
            </div>

            {form.utilizaSistemaGestao ? (
              <div className="field" style={{ maxWidth: 400 }}>
                <label>Qual sistema?</label>
                <input value={form.qualSistema ?? ''} onChange={(e) => setForm((c) => ({ ...c, qualSistema: e.target.value }))} placeholder="Nome do sistema" />
              </div>
            ) : null}

            <div className="field">
              <label style={{ display: 'block', marginBottom: 6 }}>Sabe exatamente quanto custa para produzir cada saca/kg/arroba?</label>
              <YesNo value={form.sabeCustoProduzir} onChange={(v) => setForm((c) => ({ ...c, sabeCustoProduzir: v }))} />
            </div>

            <div className="field">
              <label style={{ display: 'block', marginBottom: 6 }}>Tem fluxo de caixa projetado para pelo menos 1 safra à frente?</label>
              <YesNo value={form.temFluxoCaixaProjetado} onChange={(v) => setForm((c) => ({ ...c, temFluxoCaixaProjetado: v }))} />
            </div>

            <div className="field">
              <label style={{ display: 'block', marginBottom: 6 }}>Sabe exatamente o comprometimento futuro com custos e despesas da próxima safra?</label>
              <YesNo value={form.sabeCompromissoFuturo} onChange={(v) => setForm((c) => ({ ...c, sabeCompromissoFuturo: v }))} />
            </div>

            <div className="field">
              <label style={{ display: 'block', marginBottom: 6 }}>Sua comercialização é feita baseada no mercado somente ou seus custos te auxiliam na decisão?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="radio" checked={form.baseComercializacao === 'SOMENTE_MERCADO'} onChange={() => setForm((c) => ({ ...c, baseComercializacao: 'SOMENTE_MERCADO' }))} />
                  Somente Mercado
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="radio" checked={form.baseComercializacao === 'CONJUNTO_FATORES'} onChange={() => setForm((c) => ({ ...c, baseComercializacao: 'CONJUNTO_FATORES' }))} />
                  Tomo decisão baseado num conjunto de fatores
                </label>
              </div>
            </div>

            <div className="field">
              <label style={{ display: 'block', marginBottom: 6 }}>Costuma travar seus custos com comercialização futura?</label>
              <YesNo value={form.travaComercializacao} onChange={(v) => setForm((c) => ({ ...c, travaComercializacao: v }))} />
            </div>

            <div className="field">
              <label style={{ display: 'block', marginBottom: 6 }}>Considera que seu negócio está alavancado com empréstimos e custeios?</label>
              <YesNo value={form.negocioAlavancado} onChange={(v) => setForm((c) => ({ ...c, negocioAlavancado: v }))} />
            </div>
          </div>
        </div>

        {/* BLOCO 5 */}
        <div className="panel panel--compact" style={{ marginBottom: 24 }}>
          <div className="panel__header">
            <h3>Bloco 5 — Expectativas</h3>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <div className="field">
              <label>Descreva aqui sua expectativa com a parceria com Raccolto</label>
              <textarea
                rows={5}
                value={form.expectativaParceria ?? ''}
                onChange={(e) => setForm((c) => ({ ...c, expectativaParceria: e.target.value }))}
                placeholder="Escreva livremente sobre suas expectativas..."
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingBottom: 32 }}>
          <button className="button" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Diagnóstico'}
          </button>
          <button className="button button--ghost" type="button" onClick={() => navigate('/clientes')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
