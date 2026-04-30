import { FormEvent, useState } from 'react';
import axios from 'axios';
import { http } from '../api/http';

// ── Constantes ────────────────────────────────────────────────────────────────

const PROFISSOES = [
  { value: 'agricultor', label: 'Agricultor' },
  { value: 'gestor_agro', label: 'Gestor do Agro' },
  { value: 'prestador_servico', label: 'Prestador de Serviço do Agro' },
  { value: 'fornecedor', label: 'Fornecedor do Agro' },
  { value: 'outro', label: 'Outro' },
];

const CULTURAS_OPCOES = ['Soja', 'Milho', 'Algodão', 'Gado'];

const OPERACOES_OPCOES = [
  { value: 'nenhuma', label: 'Não temos operações terceirizadas' },
  { value: 'plantio', label: 'Plantio' },
  { value: 'pulverizacao', label: 'Pulverização' },
  { value: 'colheita', label: 'Colheita' },
  { value: 'frete', label: 'Frete Lavoura' },
];

const SAFRAS = [
  { key: 's2022_2023_1', label: 'Safra 2022/2023 — 1ª' },
  { key: 's2022_2023_2', label: 'Safra 2022/2023 — 2ª' },
  { key: 's2023_2024_1', label: 'Safra 2023/2024 — 1ª' },
  { key: 's2023_2024_2', label: 'Safra 2023/2024 — 2ª' },
  { key: 's2024_2025_1', label: 'Safra 2024/2025 — 1ª' },
  { key: 's2024_2025_2', label: 'Safra 2024/2025 — 2ª' },
];

const CUSTEIO_OPCOES = ['Não utilizo Custeio', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'];

const STEPS = ['Seus Dados', 'Bloco 1 – Operação', 'Bloco 2 – Receitas', 'Bloco 3 – Financeiro', 'Bloco 4 – Gestão'];

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProdMedia { cultura: string; media: string; }
interface FrustEntry { checked: boolean; producao: string; }
type FrustMap = Record<string, FrustEntry>;

interface Form {
  nome: string; email: string; telefone: string; idade: string;
  cidade: string; profissao: string;
  nomeFazenda: string; culturas: string[]; culturasOutros: string[];
  percentualArrendado: string; operacoesTerceirizadas: string[];
  temSiloArmazem: boolean | undefined;
  produtividadeMedia: ProdMedia[];
  custosInsumosDiretos: string; hectaresPorTrabalhador: string;
  travaAntecipada: boolean | undefined; boaLeituraComercializacao: boolean | undefined;
  frustracaoSafra: FrustMap;
  percentualCusteio: string; captouMaisQuePageu: boolean | undefined;
  usaSoftwareGestao: string; sabeCustoPorSaca: boolean | undefined;
  clarezaCustos: boolean | undefined; baseDecisoes: string; reuniaoFechamento: boolean | undefined;
}

function emptyForm(): Form {
  const frustracaoSafra: FrustMap = {};
  SAFRAS.forEach((s) => { frustracaoSafra[s.key] = { checked: false, producao: '' }; });
  return {
    nome: '', email: '', telefone: '', idade: '', cidade: '', profissao: '',
    nomeFazenda: '', culturas: [], culturasOutros: [''], percentualArrendado: '',
    operacoesTerceirizadas: [], temSiloArmazem: undefined,
    produtividadeMedia: [],
    custosInsumosDiretos: '', hectaresPorTrabalhador: '',
    travaAntecipada: undefined, boaLeituraComercializacao: undefined,
    frustracaoSafra,
    percentualCusteio: '', captouMaisQuePageu: undefined,
    usaSoftwareGestao: '', sabeCustoPorSaca: undefined,
    clarezaCustos: undefined, baseDecisoes: '', reuniaoFechamento: undefined,
  };
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
        {label}{required ? <span style={{ color: '#e8a020', marginLeft: 2 }}>*</span> : null}
      </label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  border: '1px solid #d1d5db', borderRadius: 6, padding: '9px 12px',
  fontSize: 14, width: '100%', boxSizing: 'border-box', background: '#fff',
  outline: 'none', fontFamily: 'inherit',
};

function YesNo({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  const btn = (v: boolean) => ({
    padding: '8px 20px', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 500,
    border: value === v ? '2px solid #e8a020' : '1px solid #d1d5db',
    background: value === v ? '#fff8ed' : '#fff', color: value === v ? '#92400e' : '#374151',
  } as React.CSSProperties);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" style={btn(true)} onClick={() => onChange(true)}>Sim</button>
      <button type="button" style={btn(false)} onClick={() => onChange(false)}>Não</button>
    </div>
  );
}

function Block({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28, marginBottom: 20 }}>
      <div style={{ borderBottom: '2px solid #e8a020', paddingBottom: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{title}</h2>
        {subtitle ? <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{subtitle}</p> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function DiagnosticoLeadPage({ empresaId }: { empresaId: string }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Sincroniza produtividadeMedia quando culturas mudam
  function syncProdMedia(culturas: string[], culturasOutros: string[]) {
    const todasCulturas = [
      ...culturas.filter((c) => c !== 'Outros'),
      ...culturasOutros.filter(Boolean),
    ];
    setForm((f) => ({
      ...f, culturas, culturasOutros,
      produtividadeMedia: todasCulturas.map(
        (c) => f.produtividadeMedia.find((p) => p.cultura === c) ?? { cultura: c, media: '' }
      ),
    }));
  }

  function toggleCultura(cultura: string) {
    const culturas = form.culturas.includes(cultura)
      ? form.culturas.filter((c) => c !== cultura)
      : [...form.culturas, cultura];
    syncProdMedia(culturas, form.culturasOutros);
  }

  function toggleOperacao(op: string) {
    const ops = form.operacoesTerceirizadas;
    if (op === 'nenhuma') {
      set('operacoesTerceirizadas', ops.includes('nenhuma') ? [] : ['nenhuma']);
      return;
    }
    const sem = ops.filter((o) => o !== 'nenhuma');
    set('operacoesTerceirizadas', sem.includes(op) ? sem.filter((o) => o !== op) : [...sem, op]);
  }

  function toggleFrustracao(key: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      frustracaoSafra: {
        ...f.frustracaoSafra,
        [key]: { ...f.frustracaoSafra[key], checked, producao: checked ? f.frustracaoSafra[key].producao : '' },
      },
    }));
  }

  function setFrustProducao(key: string, producao: string) {
    setForm((f) => ({
      ...f,
      frustracaoSafra: { ...f.frustracaoSafra, [key]: { ...f.frustracaoSafra[key], producao } },
    }));
  }

  function setProdMedia(cultura: string, media: string) {
    setForm((f) => ({
      ...f,
      produtividadeMedia: f.produtividadeMedia.map((p) => p.cultura === cultura ? { ...p, media } : p),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const frustracao: Record<string, number | null> = {};
      SAFRAS.forEach((s) => {
        const e = form.frustracaoSafra[s.key];
        if (e.checked) frustracao[s.key] = e.producao ? Number(e.producao) : null;
      });

      const allCulturas = [
        ...form.culturas.filter((c) => c !== 'Outros'),
        ...form.culturasOutros.filter(Boolean),
      ];

      const payload = {
        nome: form.nome, email: form.email, telefone: form.telefone,
        idade: form.idade ? Number(form.idade) : undefined,
        cidade: form.cidade || undefined, profissao: form.profissao || undefined,
        nomeFazenda: form.nomeFazenda || undefined,
        culturas: allCulturas,
        percentualArrendado: form.percentualArrendado ? Number(form.percentualArrendado) : undefined,
        operacoesTerceirizadas: form.operacoesTerceirizadas,
        temSiloArmazem: form.temSiloArmazem,
        produtividadeMedia: form.produtividadeMedia.filter((p) => p.media).map((p) => ({ cultura: p.cultura, media: Number(p.media) })),
        custosInsumosDiretos: form.custosInsumosDiretos || undefined,
        hectaresPorTrabalhador: form.hectaresPorTrabalhador ? Number(form.hectaresPorTrabalhador) : undefined,
        travaAntecipada: form.travaAntecipada,
        boaLeituraComercializacao: form.boaLeituraComercializacao,
        frustracaoSafra: Object.keys(frustracao).length ? frustracao : undefined,
        percentualCusteio: form.percentualCusteio || undefined,
        captouMaisQuePageu: form.captouMaisQuePageu,
        usaSoftwareGestao: form.usaSoftwareGestao || undefined,
        sabeCustoPorSaca: form.sabeCustoPorSaca,
        clarezaCustos: form.clarezaCustos,
        baseDecisoes: form.baseDecisoes || undefined,
        reuniaoFechamento: form.reuniaoFechamento,
      };

      await http.post(`/diagnostico-lead/publico/${empresaId}`, payload);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(' | ') : msg || 'Falha ao enviar.');
      } else {
        setError('Falha ao enviar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Telas de estado ─────────────────────────────────────────────────────────

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a3d55', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
        <img src="/Ativo 9.png" alt="Raccolto" style={{ height: 52 }} />
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e8a020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#fff' }}>✓</div>
        <h2 style={{ margin: 0, color: '#fff', fontSize: 22, textAlign: 'center' }}>Diagnóstico enviado com sucesso!</h2>
        <p style={{ color: '#94b8c8', textAlign: 'center', maxWidth: 440, lineHeight: 1.6 }}>
          Obrigado, <strong style={{ color: '#e8a020' }}>{form.nome.split(' ')[0]}</strong>! Nossa equipe da Raccolto irá analisar suas respostas e você receberá o diagnóstico em breve.
        </p>
      </div>
    );
  }

  // ── Header + Progress ────────────────────────────────────────────────────────

  const header = (
    <div style={{ background: '#0a3d55', padding: '20px 16px 0', textAlign: 'center' }}>
      <img src="/Ativo 9.png" alt="Raccolto" style={{ height: 44, marginBottom: 16 }} />
      <h1 style={{ margin: '0 0 20px', color: '#fff', fontSize: 22, fontWeight: 700 }}>Diagnóstico de Fazenda</h1>
      {/* Progress bar */}
      <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                background: i < step ? '#e8a020' : i === step ? '#fff' : 'rgba(255,255,255,0.2)',
                color: i < step ? '#fff' : i === step ? '#0a3d55' : 'rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 10, color: i === step ? '#e8a020' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${(step / (STEPS.length - 1)) * 100}%`, background: '#e8a020', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>
    </div>
  );

  const navBtns = (canNext: boolean, isLast?: boolean) => (
    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
      {step > 0 ? (
        <button type="button" onClick={() => { setStep((s) => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{ flex: 1, padding: '12px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
          Voltar
        </button>
      ) : null}
      {!isLast ? (
        <button type="button" disabled={!canNext}
          onClick={() => { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 8, background: canNext ? '#e8a020' : '#d1d5db', color: '#fff', fontSize: 15, fontWeight: 600, cursor: canNext ? 'pointer' : 'not-allowed' }}>
          Próximo
        </button>
      ) : (
        <button type="submit" disabled={saving}
          style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 8, background: saving ? '#d1d5db' : '#16a34a', color: '#fff', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Enviando...' : 'Enviar Diagnóstico'}
        </button>
      )}
    </div>
  );

  // ── Conteúdo por etapa ───────────────────────────────────────────────────────

  const allCulturas = [...form.culturas.filter((c) => c !== 'Outros'), ...form.culturasOutros.filter(Boolean)];
  const step0Valid = !!form.nome.trim() && !!form.email.trim() && !!form.telefone.trim();

  const stepContent = [
    // Step 0 — Pré-cadastro
    <Block key="s0" title="Seus Dados" subtitle="Precisamos de algumas informações para criar seu diagnóstico.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Nome Completo" required>
            <input style={inp} value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="João da Silva" />
          </Field>
        </div>
        <Field label="Idade">
          <input style={inp} type="number" min={18} max={99} value={form.idade} onChange={(e) => set('idade', e.target.value)} placeholder="42" />
        </Field>
        <Field label="Cidade">
          <input style={inp} value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Sorriso – MT" />
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Profissão">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PROFISSOES.map((p) => (
                <button key={p.value} type="button"
                  onClick={() => set('profissao', p.value)}
                  style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                    border: form.profissao === p.value ? '2px solid #e8a020' : '1px solid #d1d5db',
                    background: form.profissao === p.value ? '#fff8ed' : '#fff',
                    color: form.profissao === p.value ? '#92400e' : '#374151',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label="Telefone / WhatsApp" required>
          <input style={inp} value={form.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(66) 9 9999-9999" />
        </Field>
        <Field label="E-mail" required>
          <input style={inp} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="joao@fazenda.com.br" />
        </Field>
      </div>
      {navBtns(step0Valid)}
    </Block>,

    // Step 1 — Bloco 1 Operação
    <Block key="s1" title="Bloco 1 — Operação" subtitle="Conte-nos sobre a estrutura da sua fazenda.">
      <Field label="Qual o nome da Fazenda onde é proprietário ou trabalha?">
        <input style={inp} value={form.nomeFazenda} onChange={(e) => set('nomeFazenda', e.target.value)} placeholder="Fazenda Santa Fé" />
      </Field>

      <Field label="Quais são as culturas que geralmente plantam e colhem?">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CULTURAS_OPCOES.map((c) => (
            <button key={c} type="button" onClick={() => toggleCultura(c)}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                border: form.culturas.includes(c) ? '2px solid #e8a020' : '1px solid #d1d5db',
                background: form.culturas.includes(c) ? '#fff8ed' : '#fff',
                color: form.culturas.includes(c) ? '#92400e' : '#374151',
              }}>
              {c}
            </button>
          ))}
          <button type="button" onClick={() => toggleCultura('Outros')}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500,
              border: form.culturas.includes('Outros') ? '2px solid #e8a020' : '1px solid #d1d5db',
              background: form.culturas.includes('Outros') ? '#fff8ed' : '#fff',
              color: form.culturas.includes('Outros') ? '#92400e' : '#374151',
            }}>
            Outros
          </button>
        </div>
        {form.culturas.includes('Outros') ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {form.culturasOutros.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} value={v} placeholder={`Cultura ${i + 1}`}
                  onChange={(e) => {
                    const nos = [...form.culturasOutros]; nos[i] = e.target.value;
                    syncProdMedia(form.culturas, nos);
                  }} />
                {form.culturasOutros.length > 1 ? (
                  <button type="button" onClick={() => { const nos = form.culturasOutros.filter((_, j) => j !== i); syncProdMedia(form.culturas, nos); }}
                    style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18 }}>✕</button>
                ) : null}
              </div>
            ))}
            <button type="button" onClick={() => syncProdMedia(form.culturas, [...form.culturasOutros, ''])}
              style={{ alignSelf: 'flex-start', border: '1px dashed #d1d5db', borderRadius: 6, padding: '5px 12px', background: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
              + Adicionar outra cultura
            </button>
          </div>
        ) : null}
      </Field>

      <Field label="Qual a porcentagem de terras arrendadas? (%)">
        <div style={{ maxWidth: 200 }}>
          <input style={inp} type="number" min={0} max={100} value={form.percentualArrendado}
            onChange={(e) => set('percentualArrendado', e.target.value)} placeholder="30" />
        </div>
      </Field>

      <Field label="Quais operações são terceirizadas?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {OPERACOES_OPCOES.map((op) => (
            <label key={op.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
              <input type="checkbox" style={{ accentColor: '#e8a020', flexShrink: 0, width: 16, height: 16 }}
                checked={form.operacoesTerceirizadas.includes(op.value)}
                onChange={() => toggleOperacao(op.value)} />
              {op.label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="A fazenda dispõe de Silo ou Armazém?">
        <YesNo value={form.temSiloArmazem} onChange={(v) => set('temSiloArmazem', v)} />
      </Field>
      {navBtns(true)}
    </Block>,

    // Step 2 — Bloco 2 Receitas e Custos
    <Block key="s2" title="Bloco 2 — Receitas e Custos" subtitle="Informações sobre produtividade e gestão financeira da produção.">
      {allCulturas.length > 0 ? (
        <Field label="Qual a média de produtividade de cada cultura? (sc/ha)">
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Cultura</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Média (sc/ha)</th>
                </tr>
              </thead>
              <tbody>
                {form.produtividadeMedia.map((p) => (
                  <tr key={p.cultura}>
                    <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>{p.cultura}</td>
                    <td style={{ padding: '6px 14px', borderBottom: '1px solid #f1f5f9' }}>
                      <input type="number" min={0} step={0.1} value={p.media}
                        onChange={(e) => setProdMedia(p.cultura, e.target.value)}
                        style={{ ...inp, maxWidth: 120, padding: '6px 10px' }} placeholder="60" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Field>
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>Selecione as culturas no Bloco 1 para preencher a produtividade.</p>
      )}

      <Field label="Você considera que seus custos com Insumos Diretos estão:">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { value: 'abaixo', label: 'a — Abaixo da média' },
            { value: 'esperado', label: 'b — Dentro da faixa histórica (esperado)' },
            { value: 'altos', label: 'c — Altos' },
          ].map((opt) => (
            <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" style={{ accentColor: '#e8a020', width: 16, height: 16 }}
                checked={form.custosInsumosDiretos === opt.value}
                onChange={() => set('custosInsumosDiretos', opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Mão de Obra de Campo — quantos hectares por trabalhador?">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ maxWidth: 180 }}>
            <input style={inp} type="number" min={1} value={form.hectaresPorTrabalhador}
              onChange={(e) => set('hectaresPorTrabalhador', e.target.value)} placeholder="300" />
          </div>
          <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>hectares por trabalhador</span>
        </div>
      </Field>

      <Field label="Travar o custo antecipadamente com venda de produção é uma prática na fazenda?">
        <YesNo value={form.travaAntecipada} onChange={(v) => set('travaAntecipada', v)} />
      </Field>

      <Field label="Você considera que sua comercialização tem boa leitura do momento de fechar as vendas?">
        <YesNo value={form.boaLeituraComercializacao} onChange={(v) => set('boaLeituraComercializacao', v)} />
      </Field>
      {navBtns(true)}
    </Block>,

    // Step 3 — Bloco 3 Financeiro
    <Block key="s3" title="Bloco 3 — Financeiro" subtitle="Situação financeira das safras dos últimos anos.">
      <Field label="Houve alguma frustração de safra nos últimos 3 anos? Se sim, qual foi a produção por hectare?">
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Safra</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Frustração?</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Produção (sc/ha)</th>
              </tr>
            </thead>
            <tbody>
              {SAFRAS.map((s) => {
                const entry = form.frustracaoSafra[s.key];
                return (
                  <tr key={s.key}>
                    <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 500, fontSize: 13 }}>{s.label}</td>
                    <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <input type="checkbox" style={{ accentColor: '#e8a020', width: 16, height: 16, cursor: 'pointer' }}
                        checked={entry.checked} onChange={(e) => toggleFrustracao(s.key, e.target.checked)} />
                    </td>
                    <td style={{ padding: '6px 14px', borderBottom: '1px solid #f1f5f9' }}>
                      {entry.checked ? (
                        <input type="number" min={0} step={0.1} value={entry.producao}
                          onChange={(e) => setFrustProducao(s.key, e.target.value)}
                          style={{ ...inp, maxWidth: 120, padding: '6px 10px' }} placeholder="45" />
                      ) : <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Field>

      <Field label="Quantos % de Custeio utiliza para financiar a safra?">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CUSTEIO_OPCOES.map((opt) => (
            <button key={opt} type="button" onClick={() => set('percentualCusteio', opt)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                border: form.percentualCusteio === opt ? '2px solid #e8a020' : '1px solid #d1d5db',
                background: form.percentualCusteio === opt ? '#fff8ed' : '#fff',
                color: form.percentualCusteio === opt ? '#92400e' : '#374151',
              }}>
              {opt}
            </button>
          ))}
        </div>
      </Field>

      <Field label="No último ano precisou captar mais recurso de banco do que pagou?">
        <YesNo value={form.captouMaisQuePageu} onChange={(v) => set('captouMaisQuePageu', v)} />
      </Field>
      {navBtns(true)}
    </Block>,

    // Step 4 — Bloco 4 Gestão
    <Block key="s4" title="Bloco 4 — Gestão" subtitle="Como você toma decisões e gerencia a fazenda.">
      <Field label="Você utiliza software de gestão e confia nos dados que estão nele?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { value: 'nao_utilizo', label: 'Não utilizo software de gestão' },
            { value: 'utilizo_sem_seguranca', label: 'Utilizo software, mas estou inseguro quanto aos dados que estão nele' },
            { value: 'so_escritorio', label: 'Utilizo software, mas somente o escritório acessa. Eu nunca olhei' },
            { value: 'utilizo_confio', label: 'Utilizo software, e confio nos dados que estão lá' },
          ].map((opt) => (
            <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" style={{ accentColor: '#e8a020', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                checked={form.usaSoftwareGestao === opt.value}
                onChange={() => set('usaSoftwareGestao', opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Você sabe exatamente quanto custa produzir cada saca da cultura da fazenda?">
        <YesNo value={form.sabeCustoPorSaca} onChange={(v) => set('sabeCustoPorSaca', v)} />
      </Field>

      <Field label="Você tem clareza de todos os custos e despesas envolvidas na fazenda?">
        <YesNo value={form.clarezaCustos} onChange={(v) => set('clarezaCustos', v)} />
      </Field>

      <Field label="Você toma decisões de investimento, comercialização e compra baseado em:">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { value: 'dados', label: 'Baseada em dados financeiros e operacionais confiáveis' },
            { value: 'experiencia', label: 'Pela experiência dos anos de profissão' },
            { value: 'ambos', label: 'Utilizo os dois para tomar minhas decisões' },
          ].map((opt) => (
            <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" style={{ accentColor: '#e8a020', width: 16, height: 16, flexShrink: 0 }}
                checked={form.baseDecisoes === opt.value}
                onChange={() => set('baseDecisoes', opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Você costuma fazer reuniões de fechamento de safra e utiliza dados para discutir acertos e erros em cada ano?">
        <YesNo value={form.reuniaoFechamento} onChange={(v) => set('reuniaoFechamento', v)} />
      </Field>

      {error ? <p style={{ margin: 0, color: '#dc2626', fontSize: 14, fontWeight: 500 }}>{error}</p> : null}
      {navBtns(true, true)}
    </Block>,
  ];

  return (
    <form onSubmit={handleSubmit} style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {header}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px' }}>
        {stepContent[step]}
      </div>
    </form>
  );
}
