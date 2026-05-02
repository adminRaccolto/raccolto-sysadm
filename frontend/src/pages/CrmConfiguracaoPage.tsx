import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GripVertical, Pencil, Plus, Save, Trash2, X, Zap } from 'lucide-react';
import { http } from '../api/http';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import type { CrmEtapa, CrmTag } from '../types/api';

type Tab = 'etapas' | 'tags' | 'layout' | 'automacoes';

const PRESET_COLORS = [
  '#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316',
  '#10b981', '#ef4444', '#14b8a6', '#ec4899', '#6366f1',
  '#0ea5e9', '#84cc16', '#a855f7', '#f43f5e', '#22d3ee',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [custom, setCustom] = useState(value);
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full border-2 transition-transform ${value === c ? 'border-white scale-110 shadow-md' : 'border-transparent'}`}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={custom}
        onChange={(e) => { setCustom(e.target.value); onChange(e.target.value); }}
        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
        title="Cor personalizada"
      />
    </div>
  );
}

// ── Etapas tab ─────────────────────────────────────────────────────────────

function EtapasTab() {
  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState('#6366f1');
  const [newNome, setNewNome] = useState('');
  const [newCor, setNewCor] = useState('#6366f1');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // drag state
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await http.get('/crm/etapas');
      setEtapas(data);
    } catch {
      setError('Falha ao carregar etapas.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(e: CrmEtapa) {
    setEditingId(e.id);
    setEditNome(e.nome);
    setEditCor(e.cor);
  }

  async function saveEdit(e: CrmEtapa) {
    try {
      setSaving(true);
      const updated = await http.put(`/crm/etapas/${e.id}`, { nome: editNome, cor: editCor });
      setEtapas((prev) => prev.map((x) => (x.id === e.id ? { ...x, ...updated } : x)));
      setEditingId(null);
      setSuccess('Etapa atualizada.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function reorder(list: CrmEtapa[]) {
    setEtapas(list);
    await Promise.all(
      list.map((e, i) => {
        if (e.ordem !== i) return http.put(`/crm/etapas/${e.id}`, { ordem: i });
        return Promise.resolve();
      })
    );
  }

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragEnter(i: number) { dragOverIdx.current = i; }
  function onDragEnd() {
    const from = dragIdx.current;
    const to = dragOverIdx.current;
    if (from === null || to === null || from === to) return;
    const list = [...etapas];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    dragIdx.current = null;
    dragOverIdx.current = null;
    reorder(list);
  }

  async function handleCreate() {
    if (!newNome.trim()) return;
    try {
      setSaving(true);
      const chave = newNome.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      const created = await http.post('/crm/etapas', { chave, nome: newNome.trim(), cor: newCor });
      setEtapas((prev) => [...prev, created]);
      setNewNome('');
      setNewCor('#6366f1');
      setShowNew(false);
      setSuccess('Etapa criada.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao criar etapa.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: CrmEtapa) {
    if (!confirm(`Excluir etapa "${e.nome}"? Oportunidades nessa etapa não serão afetadas.`)) return;
    try {
      await http.delete(`/crm/etapas/${e.id}`);
      setEtapas((prev) => prev.filter((x) => x.id !== e.id));
      setSuccess('Etapa excluída.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir.');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <Feedback type="error" message={error} onClose={() => setError('')} />
      <Feedback type="success" message={success} onClose={() => setSuccess('')} />

      <p className="text-sm text-gray-500">Arraste para reordenar. A ordem define as colunas do Kanban.</p>

      <div className="space-y-2">
        {etapas.map((e, i) => (
          <div
            key={e.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragEnter={() => onDragEnter(i)}
            onDragEnd={onDragEnd}
            onDragOver={(ev) => ev.preventDefault()}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: e.cor }} />

            {editingId === e.id ? (
              <>
                <input
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  value={editNome}
                  onChange={(ev) => setEditNome(ev.target.value)}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') saveEdit(e); if (ev.key === 'Escape') setEditingId(null); }}
                  autoFocus
                />
                <ColorPicker value={editCor} onChange={setEditCor} />
                <button onClick={() => saveEdit(e)} disabled={saving} className="p-1 text-green-600 hover:text-green-700">
                  <Save size={15} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-gray-800">{e.nome}</span>
                <span className="text-xs text-gray-400 font-mono">{e.chave}</span>
                <button onClick={() => startEdit(e)} className="p-1 text-gray-400 hover:text-indigo-600">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(e)} className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {showNew ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-3 space-y-3">
          <input
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            placeholder="Nome da etapa"
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            autoFocus
          />
          <ColorPicker value={newCor} onChange={setNewCor} />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newNome.trim()}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Criar
            </button>
            <button
              onClick={() => { setShowNew(false); setNewNome(''); }}
              className="px-3 py-1.5 text-gray-600 text-sm rounded hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Plus size={15} /> Nova etapa
        </button>
      )}
    </div>
  );
}

// ── Tags tab ───────────────────────────────────────────────────────────────

function TagsTab() {
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState('#6366f1');
  const [newNome, setNewNome] = useState('');
  const [newCor, setNewCor] = useState('#6366f1');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await http.get('/crm/tags');
      setTags(data);
    } catch {
      setError('Falha ao carregar tags.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newNome.trim()) return;
    try {
      setSaving(true);
      const created = await http.post('/crm/tags', { nome: newNome.trim(), cor: newCor });
      setTags((prev) => [...prev, created].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNewNome('');
      setNewCor('#6366f1');
      setShowNew(false);
      setSuccess('Tag criada.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao criar tag.');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(t: CrmTag) {
    try {
      setSaving(true);
      const updated = await http.put(`/crm/tags/${t.id}`, { nome: editNome, cor: editCor });
      setTags((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...updated } : x)).sort((a, b) => a.nome.localeCompare(b.nome)));
      setEditingId(null);
      setSuccess('Tag atualizada.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: CrmTag) {
    if (!confirm(`Excluir tag "${t.nome}"?`)) return;
    try {
      await http.delete(`/crm/tags/${t.id}`);
      setTags((prev) => prev.filter((x) => x.id !== t.id));
      setSuccess('Tag excluída.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir.');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <Feedback type="error" message={error} onClose={() => setError('')} />
      <Feedback type="success" message={success} onClose={() => setSuccess('')} />

      <p className="text-sm text-gray-500">Tags são rótulos livres que você aplica às oportunidades do CRM.</p>

      <div className="flex flex-wrap gap-2">
        {tags.map((t) =>
          editingId === t.id ? (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 space-y-2 w-full max-w-sm">
              <input
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditingId(null); }}
                autoFocus
              />
              <ColorPicker value={editCor} onChange={setEditCor} />
              <div className="flex gap-2">
                <button onClick={() => saveEdit(t)} disabled={saving} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Salvar</button>
                <button onClick={() => setEditingId(null)} className="px-2 py-1 text-gray-600 text-xs rounded hover:bg-gray-100">Cancelar</button>
              </div>
            </div>
          ) : (
            <div
              key={t.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white group relative"
              style={{ backgroundColor: t.cor }}
            >
              {t.nome}
              <button
                onClick={() => { setEditingId(t.id); setEditNome(t.nome); setEditCor(t.cor); }}
                className="opacity-0 group-hover:opacity-100 ml-1 hover:bg-white/20 rounded p-0.5 transition-opacity"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={() => handleDelete(t)}
                className="opacity-0 group-hover:opacity-100 hover:bg-white/20 rounded p-0.5 transition-opacity"
              >
                <X size={11} />
              </button>
            </div>
          )
        )}
      </div>

      {tags.length === 0 && !showNew && (
        <p className="text-sm text-gray-400 italic">Nenhuma tag cadastrada.</p>
      )}

      {showNew ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-3 space-y-3 max-w-sm">
          <input
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            placeholder="Nome da tag"
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            autoFocus
          />
          <ColorPicker value={newCor} onChange={setNewCor} />
          <div className="flex gap-2 items-center">
            <span className="px-3 py-1 rounded-full text-sm text-white font-medium" style={{ backgroundColor: newCor }}>
              {newNome || 'Prévia'}
            </span>
            <button
              onClick={handleCreate}
              disabled={saving || !newNome.trim()}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Criar
            </button>
            <button onClick={() => { setShowNew(false); setNewNome(''); }} className="px-3 py-1.5 text-gray-600 text-sm rounded hover:bg-gray-100">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Plus size={15} /> Nova tag
        </button>
      )}
    </div>
  );
}

// ── Layout tab ─────────────────────────────────────────────────────────────

const LS_LAYOUT_KEY = 'crm_layout_prefs';

function LayoutTab() {
  const [colunasPorLinha, setColunasPorLinha] = useState(4);
  const [visualizacaoPadrao, setVisualizacaoPadrao] = useState<'KANBAN' | 'LISTA'>('KANBAN');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LAYOUT_KEY);
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.colunasPorLinha) setColunasPorLinha(prefs.colunasPorLinha);
        if (prefs.visualizacaoPadrao) setVisualizacaoPadrao(prefs.visualizacaoPadrao);
      }
    } catch { /* ignore */ }
  }, []);

  function save() {
    localStorage.setItem(LS_LAYOUT_KEY, JSON.stringify({ colunasPorLinha, visualizacaoPadrao }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Visualização padrão</label>
        <div className="flex gap-3">
          {(['KANBAN', 'LISTA'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisualizacaoPadrao(v)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                visualizacaoPadrao === v
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {v === 'KANBAN' ? 'Kanban' : 'Lista'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Colunas por linha no Kanban: <span className="text-indigo-600 font-semibold">{colunasPorLinha}</span>
        </label>
        <input
          type="range"
          min={2}
          max={8}
          value={colunasPorLinha}
          onChange={(e) => setColunasPorLinha(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>2</span><span>4</span><span>6</span><span>8</span>
        </div>
      </div>

      <button
        onClick={save}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          saved ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {saved ? 'Salvo!' : 'Salvar preferências'}
      </button>

      <p className="text-xs text-gray-400">As preferências de layout são salvas localmente neste navegador.</p>
    </div>
  );
}

// ── Automações tab ─────────────────────────────────────────────────────────

function AutomacoesTab() {
  const automacoes = [
    {
      id: 'email_lead_novo',
      nome: 'E-mail de boas-vindas ao lead',
      descricao: 'Envia e-mail automático quando um lead é criado via formulário de captação.',
      ativa: true,
      gatilho: 'Lead criado via formulário',
    },
    {
      id: 'notif_responsavel',
      nome: 'Notificação ao responsável',
      descricao: 'Notifica o responsável quando uma oportunidade é atribuída a ele.',
      ativa: true,
      gatilho: 'Oportunidade atribuída',
    },
    {
      id: 'lembrete_proxima_acao',
      nome: 'Lembrete de próxima ação',
      descricao: 'Lembrete automático na data da próxima ação cadastrada na oportunidade.',
      ativa: false,
      gatilho: 'Data da próxima ação',
    },
    {
      id: 'email_proposta_aceita',
      nome: 'E-mail de confirmação de proposta aceita',
      descricao: 'Envia e-mail ao cliente quando a proposta é aceita via link.',
      ativa: true,
      gatilho: 'Proposta aceita pelo cliente',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Automações configuradas no sistema. Para ativar/desativar automações avançadas, entre em contato com o suporte.</p>

      <div className="space-y-3">
        {automacoes.map((a) => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4">
            <div className={`mt-0.5 flex-shrink-0 w-9 h-5 rounded-full relative transition-colors ${a.ativa ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${a.ativa ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{a.nome}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {a.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{a.descricao}</p>
              <p className="text-xs text-indigo-500 mt-1">
                <Zap size={11} className="inline mr-1" />
                Gatilho: {a.gatilho}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 pt-2">Automações de e-mail dependem do SMTP configurado em Configurações do Sistema.</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CrmConfiguracaoPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('etapas');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'etapas', label: 'Etapas' },
    { id: 'tags', label: 'Tags' },
    { id: 'layout', label: 'Layout' },
    { id: 'automacoes', label: 'Automações' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações do CRM"
        subtitle="Gerencie etapas, tags, layout e automações do seu funil de vendas"
        actions={
          <button
            onClick={() => navigate('/crm')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={15} /> Voltar ao CRM
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-0 -mb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'etapas' && <EtapasTab />}
          {activeTab === 'tags' && <TagsTab />}
          {activeTab === 'layout' && <LayoutTab />}
          {activeTab === 'automacoes' && <AutomacoesTab />}
        </div>
      </div>
    </div>
  );
}
