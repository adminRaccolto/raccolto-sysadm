// Uso: EMAIL=seu@email.com PASSWORD=suasenha node scripts/criar-bpmn-qualificacao.mjs
// Ou:  node scripts/criar-bpmn-qualificacao.mjs seu@email.com suasenha

const API = process.env.API_URL || 'https://raccolto-sysadm-production.up.railway.app/api';
const email = process.env.EMAIL || process.argv[2] || 'gino@raccolto.com.br';
const password = process.env.PASSWORD || process.argv[3];
const empresaId = process.env.EMPRESA_ID || 'cmns2521r000001o00bz2z9yu';

if (!email || !password) {
  console.error('Uso: EMAIL=x@x.com PASSWORD=xxx node scripts/criar-bpmn-qualificacao.mjs');
  process.exit(1);
}

// ── Constantes visuais ──────────────────────────────────────────────────────
const EDGE = {
  type: 'smoothstep',
  markerEnd: { type: 'arrowclosed', width: 14, height: 14, color: '#64748b' },
  style: { strokeWidth: 1.5, stroke: '#64748b' },
};
const EDGE_LABEL = (label) => ({
  ...EDGE,
  label,
  style: { ...EDGE.style },
  labelStyle: { fontSize: 11, fill: '#64748b', fontFamily: 'system-ui,sans-serif' },
  labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
});

function node(id, shapeType, label, x, y, w, h, fill, stroke) {
  return {
    id,
    type: 'diagramNode',
    position: { x, y },
    style: { width: w, height: h },
    data: { shapeType, label, fill, stroke, w, h },
  };
}

// ── Layout ──────────────────────────────────────────────────────────────────
// y_center = 100 para todos os elementos da linha principal
// Tarefas 60px: y = 70   |  Eventos 48px: y = 76   |  Gateways 56px: y = 72
// Linha NO (não qualificado): y_center = 260  →  tarefas y=230, eventos y=236

const Y   = { task: 70, event: 76, gw: 72 };
const YNQ = { task: 230, event: 236, gw: 232 };

const nodes = [
  // ── Início ──────────────────────────────────────────────────────────────
  node('start',        'bpmn-start',      '',                   40,    Y.event, 48,  48,  '#dcfce7', '#16a34a'),

  // ── Pré-cadastro ────────────────────────────────────────────────────────
  node('pre-cad',      'bpmn-user',       'Pré-cadastro',      118,    Y.task,  140, 60,  '#ede9fe', '#7c3aed'),

  // ── Verificação ─────────────────────────────────────────────────────────
  node('envia-cod',    'bpmn-service',    'Envia código',      280,    Y.task,  140, 60,  '#fff',    '#64748b'),
  node('digita-cod',   'bpmn-user',       'Digita código',     440,    Y.task,  140, 60,  '#ede9fe', '#7c3aed'),
  node('xor-valido',   'bpmn-xor',        '',                  600,    Y.gw,    56,  56,  '#fef9c3', '#ca8a04'),

  // ── 1ª Automação ────────────────────────────────────────────────────────
  node('lead-crm',     'bpmn-service',    'Lead no CRM',       676,    Y.task,  140, 60,  '#dbeafe', '#2563eb'),
  node('annot-auto',   'bpmn-annotation', '1ª Automação',      676,    175,     140, 36,  'none',    '#2563eb'),

  // ── Diagnóstico ─────────────────────────────────────────────────────────
  node('diagnostico',  'bpmn-subprocess', 'Diagnóstico',       836,    Y.task,  160, 60,  '#f0fdf4', '#16a34a'),
  node('annot-ind',    'bpmn-annotation', 'Indicador 1',       836,    175,     160, 36,  'none',    '#15803d'),

  // ── Revisão ─────────────────────────────────────────────────────────────
  node('aguarda-rev',  'bpmn-timer',      '',                 1016,    Y.event, 48,  48,  '#fff',    '#64748b'),
  node('time-revisa',  'bpmn-user',       'Time revisa',      1084,    Y.task,  140, 60,  '#ede9fe', '#7c3aed'),
  node('xor-qual',     'bpmn-xor',        '',                 1244,    Y.gw,    56,  56,  '#fef9c3', '#ca8a04'),

  // ── Caminho SIM (qualificado) ────────────────────────────────────────────
  node('ia-rel-q',     'bpmn-service',    'IA — Relatório Q', 1320,    Y.task,  140, 60,  '#fff',    '#64748b'),
  node('email-hub',    'bpmn-service',    'Email + convite HUB', 1480, Y.task,  160, 60,  '#dcfce7', '#16a34a'),
  node('end-q',        'bpmn-end',        '',                 1660,    Y.event, 48,  48,  '#dcfce7', '#16a34a'),

  // ── Caminho NÃO (não qualificado) ───────────────────────────────────────
  node('ia-rel-nq',    'bpmn-service',    'IA — Relatório NQ',1320,   YNQ.task, 140, 60,  '#fff',    '#64748b'),
  node('email-nq',     'bpmn-service',    'Email feedback',   1480,   YNQ.task, 140, 60,  '#fee2e2', '#dc2626'),
  node('end-nq',       'bpmn-error',      '',                 1660,   YNQ.event, 48, 48,  '#fee2e2', '#dc2626'),
];

const edges = [
  { id: 'e-start-precad',     source: 'start',       target: 'pre-cad',     ...EDGE },
  { id: 'e-precad-envio',     source: 'pre-cad',     target: 'envia-cod',   ...EDGE },
  { id: 'e-envio-digita',     source: 'envia-cod',   target: 'digita-cod',  ...EDGE },
  { id: 'e-digita-xor',       source: 'digita-cod',  target: 'xor-valido',  ...EDGE },
  { id: 'e-xor-valido-crm',   source: 'xor-valido',  target: 'lead-crm',    ...EDGE_LABEL('Válido') },
  { id: 'e-xor-invalido',     source: 'xor-valido',  target: 'digita-cod',  ...EDGE_LABEL('Inválido') },
  { id: 'e-crm-diag',         source: 'lead-crm',    target: 'diagnostico', ...EDGE },
  { id: 'e-diag-aguarda',     source: 'diagnostico', target: 'aguarda-rev', ...EDGE },
  { id: 'e-aguarda-revisa',   source: 'aguarda-rev', target: 'time-revisa', ...EDGE },
  { id: 'e-revisa-xorq',      source: 'time-revisa', target: 'xor-qual',    ...EDGE },
  { id: 'e-xorq-sim',         source: 'xor-qual',    target: 'ia-rel-q',    ...EDGE_LABEL('Sim') },
  { id: 'e-relq-emailhub',    source: 'ia-rel-q',    target: 'email-hub',   ...EDGE },
  { id: 'e-emailhub-endq',    source: 'email-hub',   target: 'end-q',       ...EDGE },
  { id: 'e-xorq-nao',         source: 'xor-qual',    target: 'ia-rel-nq',   ...EDGE_LABEL('Não') },
  { id: 'e-relnq-emailnq',    source: 'ia-rel-nq',   target: 'email-nq',    ...EDGE },
  { id: 'e-emailnq-endnq',    source: 'email-nq',    target: 'end-nq',      ...EDGE },
];

const conteudo = { _tipo: 'fluxo', nodes, edges };

// ── Execução ────────────────────────────────────────────────────────────────
async function run() {
  // Login
  console.log(`Autenticando em ${API}...`);
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: password, empresaId }),
  });
  if (!loginRes.ok) {
    console.error('Login falhou:', await loginRes.text());
    process.exit(1);
  }
  const { accessToken: access_token } = await loginRes.json();
  console.log('Login OK.');

  // Criar diagrama
  const res = await fetch(`${API}/diagramas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
    body: JSON.stringify({ titulo: 'BPMN — Fluxo de Qualificação de Lead', conteudo }),
  });
  if (!res.ok) {
    console.error('Erro ao criar diagrama:', await res.text());
    process.exit(1);
  }
  const diagrama = await res.json();
  console.log('\n✓ Diagrama criado com sucesso!');
  console.log(`  ID: ${diagrama.id}`);
  console.log(`  Abra em: Diagramas → "${diagrama.titulo}"`);
}

run().catch(console.error);
