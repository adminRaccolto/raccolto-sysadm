import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { http } from '../api/http';

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
  areaTotal?: number; areaPlantio?: number;
  areaPlantioPropia?: number; areaPlantioArrendada?: number;
  culturas: string[]; culturaOutro?: string;
  culturasAreas: CulturaArea[];
  frustracaoSafra: boolean; frustracoes: Frustracao[];
}
interface FormState {
  fazendas: Fazenda[];
  negocioFamiliar?: boolean; membrosEnvolvidos?: number;
  decisaoPorConselho?: boolean; emSucessao?: boolean;
  geracaoSucessao?: string; funcoesDefinidas?: boolean;
  governancaImplantada?: boolean; utilizaSistemaGestao?: boolean;
  qualSistema?: string; sabeCustoProduzir?: boolean;
  temFluxoCaixaProjetado?: boolean; sabeCompromissoFuturo?: boolean;
  baseComercializacao?: string; travaComercializacao?: boolean;
  negocioAlavancado?: boolean; expectativaParceria?: string;
}

function emptyFazenda(): Fazenda {
  return { nomeFazenda: '', culturas: [], culturasAreas: [], frustracaoSafra: false, frustracoes: [] };
}

function YesNo({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <input type="radio" style={{ flexShrink: 0, accentColor: '#e8a020' }} checked={value === true} onChange={() => onChange(true)} /> Sim
      </label>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <input type="radio" style={{ flexShrink: 0, accentColor: '#e8a020' }} checked={value === false} onChange={() => onChange(false)} /> Não
      </label>
    </div>
  );
}

export default function DiagnosticoPublicoPage() {
  const { token } = useParams<{ token: string }>();
  const [cliente, setCliente] = useState<any>(null);
  const [, setChecklistStatus] = useState<string>('PENDENTE');
  const [form, setForm] = useState<FormState>({ fazendas: [emptyFazenda()] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await http.get<any>(`/checklist-diagnostico/publico/${token}`);
        const c = res.data;
        setCliente(c.cliente);
        setChecklistStatus(c.status);
        if (c.status === 'RESPONDIDO') { setEnviado(true); }
        if (c.fazendas?.length) {
          setForm({
            fazendas: c.fazendas.map((f: any) => ({
              nomeFazenda: f.nomeFazenda, areaTotal: f.areaTotal ?? undefined,
              areaPlantio: f.areaPlantio ?? undefined, areaPlantioPropia: f.areaPlantioPropia ?? undefined,
              areaPlantioArrendada: f.areaPlantioArrendada ?? undefined,
              culturas: f.culturas ?? [], culturaOutro: f.culturaOutro ?? undefined,
              culturasAreas: f.culturasAreas ?? [], frustracaoSafra: f.frustracaoSafra ?? false,
              frustracoes: f.frustracoes ?? [],
            })),
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
      } catch {
        setError('Link inválido ou expirado.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function setFazenda(index: number, patch: Partial<Fazenda>) {
    setForm((c) => { const f = [...c.fazendas]; f[index] = { ...f[index], ...patch }; return { ...c, fazendas: f }; });
  }
  function addFazenda() { setForm((c) => ({ ...c, fazendas: [...c.fazendas, emptyFazenda()] })); }
  function removeFazenda(i: number) { setForm((c) => ({ ...c, fazendas: c.fazendas.filter((_, idx) => idx !== i) })); }

  function toggleCultura(fi: number, cultura: string) {
    const faz = form.fazendas[fi];
    const has = faz.culturas.includes(cultura);
    const novas = has ? faz.culturas.filter((c) => c !== cultura) : [...faz.culturas, cultura];
    const areas: CulturaArea[] = novas.map((c) => faz.culturasAreas.find((ca) => ca.cultura === c) ?? { cultura: c });
    setFazenda(fi, { culturas: novas, culturasAreas: areas });
  }

  function setCulturaArea(fi: number, cultura: string, field: keyof CulturaArea, value: any) {
    const areas = form.fazendas[fi].culturasAreas.map((ca) => ca.cultura === cultura ? { ...ca, [field]: value } : ca);
    setFazenda(fi, { culturasAreas: areas });
  }

  function addFrustracao(fi: number) { setFazenda(fi, { frustracoes: [...form.fazendas[fi].frustracoes, {}] }); }
  function setFrustracao(fi: number, ri: number, patch: Partial<Frustracao>) {
    setFazenda(fi, { frustracoes: form.fazendas[fi].frustracoes.map((f, i) => i === ri ? { ...f, ...patch } : f) });
  }
  function removeFrustracao(fi: number, ri: number) {
    setFazenda(fi, { frustracoes: form.fazendas[fi].frustracoes.filter((_, i) => i !== ri) });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await http.post(`/checklist-diagnostico/publico/${token}/responder`, form);
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(' | ') : msg || 'Falha ao enviar.');
      } else {
        setError('Falha ao enviar.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a3d55' }}>
        <p style={{ color: '#94b8c8' }}>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#0a3d55' }}>
        <p style={{ color: '#fca5a5', fontWeight: 600 }}>{error}</p>
        <p style={{ color: '#94b8c8', fontSize: 14 }}>Verifique o link recebido ou entre em contato com a Raccolto.</p>
      </div>
    );
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#0a3d55', padding: 24 }}>
        <img src="/Ativo 9.png" alt="Raccolto" style={{ height: 56, marginBottom: 8 }} />
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e8a020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff' }}>✓</div>
        <h2 style={{ margin: 0, color: '#fff' }}>Diagnóstico enviado!</h2>
        <p style={{ color: '#94b8c8', textAlign: 'center', maxWidth: 420 }}>
          Obrigado por preencher o diagnóstico. Nossa equipe da Raccolto irá analisar suas respostas e entrar em contato em breve.
        </p>
      </div>
    );
  }

  const nomeCliente = cliente?.nomeFantasia || cliente?.razaoSocial || '';

  return (
    <div style={{ minHeight: '100vh', background: '#0a3d55', padding: '0 0 48px' }}>
      {/* Header strip */}
      <div style={{ background: '#0a3d55', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '20px 16px', textAlign: 'center', marginBottom: 32 }}>
        <img src="/Ativo 9.png" alt="Raccolto" style={{ height: 48, marginBottom: 20 }} />
        <h1 style={{ margin: '0 0 6px', color: '#fff', fontSize: 26, fontWeight: 700 }}>Diagnóstico Inicial</h1>
        {nomeCliente ? <p style={{ margin: 0, color: '#e8a020', fontSize: 15 }}>Olá, <strong>{nomeCliente}</strong>! Preencha o formulário abaixo.</p> : null}
      </div>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>

        <form onSubmit={handleSubmit}>

          {/* Bloco 1 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>Bloco 1 — Seus Dados</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Nome / Razão Social', value: cliente?.razaoSocial },
                { label: 'Nome Fantasia', value: cliente?.nomeFantasia },
                { label: 'CPF / CNPJ', value: cliente?.cpfCnpj },
                { label: 'E-mail', value: cliente?.email },
                { label: 'Telefone', value: cliente?.telefone },
                { label: 'Cidade / Estado', value: [cliente?.cidade, cliente?.estado].filter(Boolean).join(' — ') },
              ].map((item) => (
                <div key={item.label}>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>{item.label}</label>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: 14, color: '#1e293b' }}>{item.value || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 2 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Bloco 2 — Estrutura Física e Produção</h2>
              <button type="button" style={{ background: '#e8a020', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }} onClick={addFazenda}>+ Fazenda</button>
            </div>

            {form.fazendas.map((fazenda, fi) => (
              <div key={fi} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <strong style={{ color: '#e8a020' }}>Fazenda {fi + 1}</strong>
                  {form.fazendas.length > 1 ? <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }} onClick={() => removeFazenda(fi)}>Remover</button> : null}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 4 }}>Nome da Fazenda *</label>
                    <input required value={fazenda.nomeFazenda} onChange={(e) => setFazenda(fi, { nomeFazenda: e.target.value })} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  {[
                    { label: 'Área Total (ha)', field: 'areaTotal' as const },
                    { label: 'Área de Plantio (ha)', field: 'areaPlantio' as const },
                    { label: 'Área Própria (ha)', field: 'areaPlantioPropia' as const },
                    { label: 'Área Arrendada (ha)', field: 'areaPlantioArrendada' as const },
                  ].map((item) => (
                    <div key={item.field}>
                      <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 4 }}>{item.label}</label>
                      <input type="number" step="0.01" min="0" value={fazenda[item.field] ?? ''} onChange={(e) => setFazenda(fi, { [item.field]: e.target.value ? Number(e.target.value) : undefined })} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>Culturas Aplicadas</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {CULTURAS_OPCOES.map((opt) => (
                      <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={fazenda.culturas.includes(opt.value)} onChange={() => toggleCultura(fi, opt.value)} style={{ accentColor: '#e8a020', flexShrink: 0 }} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {fazenda.culturas.includes('OUTRO') ? <input placeholder="Qual cultura?" value={fazenda.culturaOutro ?? ''} onChange={(e) => setFazenda(fi, { culturaOutro: e.target.value })} style={{ marginTop: 8, width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} /> : null}
                </div>

                {fazenda.culturas.length > 0 ? (
                  <div style={{ marginBottom: 12, overflowX: 'auto' }}>
                    <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>Área por Cultura</label>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Cultura</th><th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Qtd. Área (ha)</th><th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Média Histórica (sc/ha)</th></tr></thead>
                      <tbody>
                        {fazenda.culturasAreas.map((ca) => {
                          const label = CULTURAS_OPCOES.find((o) => o.value === ca.cultura)?.label ?? ca.cultura;
                          return (
                            <tr key={ca.cultura}>
                              <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>{label}</td>
                              <td style={{ padding: '4px 10px', borderBottom: '1px solid #f1f5f9' }}><input type="number" step="0.01" min="0" style={{ width: 110, border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px' }} value={ca.area ?? ''} onChange={(e) => setCulturaArea(fi, ca.cultura, 'area', e.target.value ? Number(e.target.value) : '')} /></td>
                              <td style={{ padding: '4px 10px', borderBottom: '1px solid #f1f5f9' }}><input type="number" step="0.01" min="0" style={{ width: 110, border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px' }} value={ca.mediaHistorica ?? ''} onChange={(e) => setCulturaArea(fi, ca.cultura, 'mediaHistorica', e.target.value ? Number(e.target.value) : '')} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>Houve frustração de safra nos últimos 5 anos?</label>
                  <YesNo value={fazenda.frustracaoSafra || undefined} onChange={(v) => setFazenda(fi, { frustracaoSafra: v, frustracoes: v ? fazenda.frustracoes : [] })} />
                </div>

                {fazenda.frustracaoSafra ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
                      <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Ano</th><th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Cultura</th><th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Média Colhida (sc/ha)</th><th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}></th></tr></thead>
                      <tbody>
                        {fazenda.frustracoes.map((fr, ri) => (
                          <tr key={ri}>
                            <td style={{ padding: '4px 10px' }}><input style={{ width: 70, border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px' }} placeholder="2021" value={fr.ano ?? ''} onChange={(e) => setFrustracao(fi, ri, { ano: e.target.value })} /></td>
                            <td style={{ padding: '4px 10px' }}><input style={{ width: 120, border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px' }} placeholder="Soja" value={fr.cultura ?? ''} onChange={(e) => setFrustracao(fi, ri, { cultura: e.target.value })} /></td>
                            <td style={{ padding: '4px 10px' }}><input type="number" step="0.01" style={{ width: 120, border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px' }} value={fr.mediaColhida ?? ''} onChange={(e) => setFrustracao(fi, ri, { mediaColhida: e.target.value ? Number(e.target.value) : undefined })} /></td>
                            <td style={{ padding: '4px 10px' }}><button type="button" onClick={() => removeFrustracao(fi, ri)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" onClick={() => addFrustracao(fi)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, color: '#64748b' }}>+ Linha</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Bloco 3 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, color: '#1e293b' }}>Bloco 3 — Estrutura Familiar</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>O negócio é familiar?</label>
                <YesNo value={form.negocioFamiliar} onChange={(v) => setForm((c) => ({ ...c, negocioFamiliar: v }))} />
              </div>
              {form.negocioFamiliar ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 4 }}>Quantos estão envolvidos na operação?</label>
                      <input type="number" min="1" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} value={form.membrosEnvolvidos ?? ''} onChange={(e) => setForm((c) => ({ ...c, membrosEnvolvidos: e.target.value ? Number(e.target.value) : undefined }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>As decisões são tomadas em conselho ou pelo gestor?</label>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}><input type="radio" style={{ flexShrink: 0, accentColor: '#e8a020' }} checked={form.decisaoPorConselho === true} onChange={() => setForm((c) => ({ ...c, decisaoPorConselho: true }))} /> Conselho</label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}><input type="radio" style={{ flexShrink: 0, accentColor: '#e8a020' }} checked={form.decisaoPorConselho === false} onChange={() => setForm((c) => ({ ...c, decisaoPorConselho: false }))} /> Somente pelo gestor</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>A família está passando por sucessão?</label>
                    <YesNo value={form.emSucessao} onChange={(v) => setForm((c) => ({ ...c, emSucessao: v }))} />
                  </div>
                  {form.emSucessao ? (
                    <div style={{ maxWidth: 320 }}>
                      <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 4 }}>Qual geração está em sucessão?</label>
                      <input value={form.geracaoSucessao ?? ''} onChange={(e) => setForm((c) => ({ ...c, geracaoSucessao: e.target.value }))} placeholder="Ex: 2ª geração" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  ) : null}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>As funções de cada membro são bem definidas?</label>
                    <YesNo value={form.funcoesDefinidas} onChange={(v) => setForm((c) => ({ ...c, funcoesDefinidas: v }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>Já iniciaram a implantação de governança e compliance?</label>
                    <YesNo value={form.governancaImplantada} onChange={(v) => setForm((c) => ({ ...c, governancaImplantada: v }))} />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Bloco 4 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, color: '#1e293b' }}>Bloco 4 — Conhecimento do Negócio</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Utiliza sistema de gestão?', field: 'utilizaSistemaGestao' as const },
              ].map((item) => (
                <div key={item.field}>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>{item.label}</label>
                  <YesNo value={form[item.field] as boolean | undefined} onChange={(v) => setForm((c) => ({ ...c, [item.field]: v }))} />
                </div>
              ))}
              {form.utilizaSistemaGestao ? (
                <div style={{ maxWidth: 400 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 4 }}>Qual sistema?</label>
                  <input value={form.qualSistema ?? ''} onChange={(e) => setForm((c) => ({ ...c, qualSistema: e.target.value }))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ) : null}
              {[
                { label: 'Sabe exatamente quanto custa para produzir cada saca/kg/arroba?', field: 'sabeCustoProduzir' as const },
                { label: 'Tem fluxo de caixa projetado para pelo menos 1 safra à frente?', field: 'temFluxoCaixaProjetado' as const },
                { label: 'Sabe exatamente o comprometimento futuro com custos e despesas da próxima safra?', field: 'sabeCompromissoFuturo' as const },
              ].map((item) => (
                <div key={item.field}>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>{item.label}</label>
                  <YesNo value={form[item.field] as boolean | undefined} onChange={(v) => setForm((c) => ({ ...c, [item.field]: v }))} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>Sua comercialização é feita baseada no mercado somente ou seus custos te auxiliam na decisão?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}><input type="radio" style={{ flexShrink: 0 }} checked={form.baseComercializacao === 'SOMENTE_MERCADO'} onChange={() => setForm((c) => ({ ...c, baseComercializacao: 'SOMENTE_MERCADO' }))} /> Somente Mercado</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}><input type="radio" style={{ flexShrink: 0 }} checked={form.baseComercializacao === 'CONJUNTO_FATORES'} onChange={() => setForm((c) => ({ ...c, baseComercializacao: 'CONJUNTO_FATORES' }))} /> Tomo decisão baseado num conjunto de fatores</label>
                </div>
              </div>
              {[
                { label: 'Costuma travar seus custos com comercialização futura?', field: 'travaComercializacao' as const },
                { label: 'Considera que seu negócio está alavancado com empréstimos e custeios?', field: 'negocioAlavancado' as const },
              ].map((item) => (
                <div key={item.field}>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 8 }}>{item.label}</label>
                  <YesNo value={form[item.field] as boolean | undefined} onChange={(v) => setForm((c) => ({ ...c, [item.field]: v }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 5 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>Bloco 5 — Expectativas</h2>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 4 }}>Descreva sua expectativa com a parceria com Raccolto</label>
              <textarea rows={5} value={form.expectativaParceria ?? ''} onChange={(e) => setForm((c) => ({ ...c, expectativaParceria: e.target.value }))} placeholder="Escreva livremente..." style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '10px 12px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ width: '100%', background: '#e8a020', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enviando...' : 'Enviar Diagnóstico'}
          </button>
        </form>
      </div>
    </div>
  );
}

