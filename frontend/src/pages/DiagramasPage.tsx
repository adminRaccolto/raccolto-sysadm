import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MindElixir from 'mind-elixir';
import '../styles/mind-elixir.css';
import axios from 'axios';
import { http } from '../api/http';
import EmptyState from '../components/EmptyState';
import Feedback from '../components/Feedback';
import LoadingBlock from '../components/LoadingBlock';
import PageHeader from '../components/PageHeader';
import type { DiagramaFull, DiagramaListItem, Projeto } from '../types/api';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow,
  Handle, Position, BackgroundVariant, MarkerType, ConnectionMode, NodeResizer,
  type Node, type Edge, type Connection, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type TipoDiagrama = 'mapa' | 'fluxo';

function newMindData(titulo: string) {
  return { _tipo: 'mapa' as TipoDiagrama, nodeData: { id: 'me-root', topic: titulo, children: [] } };
}
function newFluxoData() {
  return { _tipo: 'fluxo' as TipoDiagrama, nodes: [] as Node[], edges: [] as Edge[] };
}

// ── Shape palette data ───────────────────────────────────────────────────────
interface PaletteShape {
  shapeType: string; label: string;
  defaultFill: string; defaultStroke: string;
  w: number; h: number;
}
const PALETTE: { category: string; items: PaletteShape[] }[] = [
  {
    category: 'Fluxograma',
    items: [
      { shapeType: 'terminal',  label: 'Início/Fim',  defaultFill: '#dcfce7', defaultStroke: '#16a34a', w: 120, h: 48 },
      { shapeType: 'process',   label: 'Processo',    defaultFill: '#dbeafe', defaultStroke: '#2563eb', w: 140, h: 52 },
      { shapeType: 'decision',  label: 'Decisão',     defaultFill: '#fef9c3', defaultStroke: '#ca8a04', w: 96,  h: 96 },
      { shapeType: 'data',      label: 'Dados',       defaultFill: '#f3f4f6', defaultStroke: '#6b7280', w: 140, h: 52 },
      { shapeType: 'document',  label: 'Documento',   defaultFill: '#fff',    defaultStroke: '#374151', w: 140, h: 60 },
      { shapeType: 'database',  label: 'Banco',       defaultFill: '#e0f2fe', defaultStroke: '#0284c7', w: 80,  h: 70 },
    ],
  },
  {
    category: 'BPMN',
    items: [
      { shapeType: 'bpmn-start',      label: 'Start',        defaultFill: '#dcfce7', defaultStroke: '#16a34a', w: 48,  h: 48 },
      { shapeType: 'bpmn-end',        label: 'End',          defaultFill: '#fee2e2', defaultStroke: '#dc2626', w: 48,  h: 48 },
      { shapeType: 'bpmn-timer',      label: 'Timer',        defaultFill: '#fff',    defaultStroke: '#64748b', w: 48,  h: 48 },
      { shapeType: 'bpmn-interm',     label: 'Intermediário', defaultFill: '#fff',   defaultStroke: '#64748b', w: 48,  h: 48 },
      { shapeType: 'bpmn-error',      label: 'Erro',         defaultFill: '#fee2e2', defaultStroke: '#dc2626', w: 48,  h: 48 },
      { shapeType: 'bpmn-task',       label: 'Tarefa',       defaultFill: '#fff',    defaultStroke: '#64748b', w: 140, h: 60 },
      { shapeType: 'bpmn-user',       label: 'Usuário',      defaultFill: '#ede9fe', defaultStroke: '#7c3aed', w: 140, h: 60 },
      { shapeType: 'bpmn-service',    label: 'Serviço',      defaultFill: '#fff',    defaultStroke: '#64748b', w: 140, h: 60 },
      { shapeType: 'bpmn-script',     label: 'Script',       defaultFill: '#fff',    defaultStroke: '#64748b', w: 140, h: 60 },
      { shapeType: 'bpmn-call',       label: 'Call',         defaultFill: '#dbeafe', defaultStroke: '#1d4ed8', w: 140, h: 60 },
      { shapeType: 'bpmn-subprocess', label: 'Sub-processo', defaultFill: '#f0fdf4', defaultStroke: '#16a34a', w: 160, h: 80 },
      { shapeType: 'bpmn-xor',        label: 'XOR',          defaultFill: '#fef9c3', defaultStroke: '#ca8a04', w: 56,  h: 56 },
      { shapeType: 'bpmn-and',        label: 'AND',          defaultFill: '#dbeafe', defaultStroke: '#2563eb', w: 56,  h: 56 },
      { shapeType: 'bpmn-annotation', label: 'Anotação',     defaultFill: 'none',    defaultStroke: '#64748b', w: 160, h: 50 },
    ],
  },
  {
    category: 'Swimlane',
    items: [
      { shapeType: 'pool',  label: 'Pool',  defaultFill: '#f8fafc', defaultStroke: '#334155', w: 320, h: 160 },
      { shapeType: 'lane',  label: 'Lane',  defaultFill: '#f1f5f9', defaultStroke: '#64748b', w: 320, h: 80  },
    ],
  },
  {
    category: 'Geral',
    items: [
      { shapeType: 'note',  label: 'Nota',  defaultFill: '#fefce8', defaultStroke: '#a16207', w: 130, h: 70 },
      { shapeType: 'text',  label: 'Texto', defaultFill: 'none',    defaultStroke: 'none',    w: 120, h: 36 },
    ],
  },
];

// ── SVG shape renderer ───────────────────────────────────────────────────────
function ShapeSVG({ shapeType, w, h, fill, stroke, label, textColor, mini = false }: {
  shapeType: string; w: number; h: number; fill: string; stroke: string; label: string; textColor?: string; mini?: boolean;
}) {
  const sw = stroke === 'none' ? 'none' : stroke;
  const sf = fill === 'none' ? 'none' : fill;
  const fs = mini ? 9 : Math.min(13, Math.max(10, w / Math.max(label.length, 1) * 1.1));
  const tc = textColor || (stroke === 'none' ? '#374151' : stroke);
  const textEl = (cx: number, cy: number, txt: string) => txt ? (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
      fontSize={fs} fill={tc}
      fontFamily="system-ui,-apple-system,sans-serif" style={{ userSelect: 'none' }}>
      {txt}
    </text>
  ) : null;

  switch (shapeType) {
    case 'terminal':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={h / 2} fill={sf} stroke={sw} strokeWidth={1.5} />
        {textEl(w / 2, h / 2, label)}
      </>;
    case 'process':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={3} fill={sf} stroke={sw} strokeWidth={1.5} />
        {textEl(w / 2, h / 2, label)}
      </>;
    case 'bpmn-task':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={8} fill={sf} stroke={sw} strokeWidth={1.5} />
        {textEl(w / 2, h / 2, label)}
      </>;
    case 'bpmn-user':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={8} fill={sf} stroke={sw} strokeWidth={1.5} />
        {!mini && <text x={12} y={16} fontSize={13} fill={sw}>👤</text>}
        {textEl(w / 2, h / 2, label)}
      </>;
    case 'bpmn-service':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={8} fill={sf} stroke={sw} strokeWidth={1.5} />
        {!mini && (
          <g transform="translate(5,5)">
            <circle cx={7} cy={7} r={3} fill="none" stroke={sw} strokeWidth={1.2} />
            {([0, 60, 120, 180, 240, 300] as number[]).map(a => {
              const rd = a * Math.PI / 180;
              return <line key={a} x1={7 + Math.cos(rd) * 3} y1={7 + Math.sin(rd) * 3} x2={7 + Math.cos(rd) * 6} y2={7 + Math.sin(rd) * 6} stroke={sw} strokeWidth={1.6} strokeLinecap="round" />;
            })}
          </g>
        )}
        {textEl(w / 2, h / 2 + 4, label)}
      </>;
    case 'bpmn-script':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={8} fill={sf} stroke={sw} strokeWidth={1.5} />
        {!mini && <>
          <rect x={5} y={4} width={14} height={18} rx={2} fill="none" stroke={sw} strokeWidth={1} />
          <line x1={7} y1={8}  x2={17} y2={8}  stroke={sw} strokeWidth={1} />
          <line x1={7} y1={11} x2={17} y2={11} stroke={sw} strokeWidth={1} />
          <line x1={7} y1={14} x2={14} y2={14} stroke={sw} strokeWidth={1} />
        </>}
        {textEl(w / 2, h / 2 + 5, label)}
      </>;
    case 'bpmn-subprocess':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={6} fill={sf} stroke={sw} strokeWidth={1.5} />
        <rect x={w / 2 - 7} y={h - 16} width={14} height={12} rx={2} fill={sf} stroke={sw} strokeWidth={1.2} />
        <line x1={w / 2} y1={h - 14.5} x2={w / 2} y2={h - 5.5} stroke={sw} strokeWidth={1.3} />
        <line x1={w / 2 - 4.5} y1={h - 10} x2={w / 2 + 4.5} y2={h - 10} stroke={sw} strokeWidth={1.3} />
        {textEl(w / 2, h / 2 - 4, label)}
      </>;
    case 'bpmn-call':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={8} fill={sf} stroke={sw} strokeWidth={4} />
        {textEl(w / 2, h / 2, label)}
      </>;
    case 'decision':
    case 'bpmn-xor':
      return <>
        <polygon points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`} fill={sf} stroke={sw} strokeWidth={1.5} />
        {shapeType === 'bpmn-xor'
          ? <text x={w / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={20} fontWeight={600} fill={sw}>×</text>
          : textEl(w / 2, h / 2, label)}
      </>;
    case 'bpmn-and':
      return <>
        <polygon points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`} fill={sf} stroke={sw} strokeWidth={1.5} />
        <text x={w / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={22} fontWeight={600} fill={sw}>+</text>
      </>;
    case 'bpmn-start':
      return <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill={sf} stroke={sw} strokeWidth={1.5} />;
    case 'bpmn-end':
      return <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill={sf} stroke={sw} strokeWidth={4} />;
    case 'bpmn-interm':
      return <>
        <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill={sf} stroke={sw} strokeWidth={1.5} />
        <circle cx={w / 2} cy={h / 2} r={w / 2 - 5} fill="none" stroke={sw} strokeWidth={1.5} />
      </>;
    case 'bpmn-timer': {
      const r = w / 2 - 2;
      return <>
        <circle cx={w / 2} cy={h / 2} r={r} fill={sf} stroke={sw} strokeWidth={1.5} />
        {([0, 90, 180, 270] as number[]).map(a => {
          const rd = (a - 90) * Math.PI / 180;
          return <line key={a} x1={w / 2 + Math.cos(rd) * (r - 4)} y1={h / 2 + Math.sin(rd) * (r - 4)} x2={w / 2 + Math.cos(rd) * r} y2={h / 2 + Math.sin(rd) * r} stroke={sw} strokeWidth={1.5} />;
        })}
        <line x1={w / 2} y1={h / 2} x2={w / 2} y2={h / 2 - (r - 7)} stroke={sw} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={w / 2} y1={h / 2} x2={w / 2 + (r - 9)} y2={h / 2} stroke={sw} strokeWidth={1.2} strokeLinecap="round" />
      </>;
    }
    case 'bpmn-error':
      return <>
        <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill={sf} stroke={sw} strokeWidth={4} />
        <polyline points={`${w * 0.38},${h * 0.25} ${w * 0.44},${h * 0.55} ${w * 0.56},${h * 0.45} ${w * 0.62},${h * 0.75}`}
          fill="none" stroke="#fff" strokeWidth={3} />
        <polyline points={`${w * 0.38},${h * 0.25} ${w * 0.44},${h * 0.55} ${w * 0.56},${h * 0.45} ${w * 0.62},${h * 0.75}`}
          fill="none" stroke={sw} strokeWidth={1.8} />
      </>;
    case 'bpmn-annotation':
      return <>
        <path d={`M${w - 12},2 L8,2 L8,${h - 2} L${w - 12},${h - 2}`} fill="none" stroke={sw} strokeWidth={1.8} />
        {textEl(w / 2 + 6, h / 2, label)}
      </>;
    case 'data':
      return <>
        <polygon points={`16,2 ${w - 2},2 ${w - 16},${h - 2} 2,${h - 2}`} fill={sf} stroke={sw} strokeWidth={1.5} />
        {textEl(w / 2, h / 2, label)}
      </>;
    case 'document':
      return <>
        <path d={`M2,2 H${w - 2} V${h - 12} Q${w * 0.75},${h - 24} ${w / 2},${h - 12} Q${w * 0.25},${h} 2,${h - 12} Z`}
          fill={sf} stroke={sw} strokeWidth={1.5} />
        {textEl(w / 2, h / 2 - 4, label)}
      </>;
    case 'database': {
      const ry = 10, cx = w / 2;
      return <>
        <ellipse cx={cx} cy={ry + 2} rx={w / 2 - 2} ry={ry} fill={sf} stroke={sw} strokeWidth={1.5} />
        <rect x={2} y={ry + 2} width={w - 4} height={h - ry * 2 - 4} fill={sf} stroke="none" />
        <line x1={2} y1={ry + 2} x2={2} y2={h - ry - 2} stroke={sw} strokeWidth={1.5} />
        <line x1={w - 2} y1={ry + 2} x2={w - 2} y2={h - ry - 2} stroke={sw} strokeWidth={1.5} />
        <ellipse cx={cx} cy={h - ry - 2} rx={w / 2 - 2} ry={ry} fill={sf} stroke={sw} strokeWidth={1.5} />
        {textEl(cx, h / 2, label)}
      </>;
    }
    case 'pool':
    case 'lane':
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} fill={sf} stroke={sw} strokeWidth={1.5} />
        <rect x={1.5} y={1.5} width={24} height={h - 3} fill={stroke === 'none' ? '#e2e8f0' : `${stroke}20`} stroke={sw} strokeWidth={1.5} />
        <text x={13} y={h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11}
          fill={tc} fontFamily="system-ui,sans-serif" transform={`rotate(-90, 13, ${h / 2})`}>
          {label}
        </text>
      </>;
    case 'note':
      return <>
        <polygon points={`2,2 ${w - 14},2 ${w - 2},14 ${w - 2},${h - 2} 2,${h - 2}`} fill={sf} stroke={sw} strokeWidth={1.5} />
        <polyline points={`${w - 14},2 ${w - 14},14 ${w - 2},14`} fill="none" stroke={sw} strokeWidth={1.5} />
        {textEl(w / 2 - 4, h / 2, label)}
      </>;
    case 'text':
      return <text x={4} y={h / 2} dominantBaseline="middle" fontSize={13} fill={tc}
        fontFamily="system-ui,sans-serif">{label || 'Texto'}</text>;
    default:
      return <>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={4} fill={sf} stroke={sw} strokeWidth={1.5} />
        {textEl(w / 2, h / 2, label)}
      </>;
  }
}

// ── Diagram node (ReactFlow custom node) ─────────────────────────────────────
function DiagramNode({ data, id, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [w, setW] = useState((data.w as number) || 140);
  const [h, setH] = useState((data.h as number) || 52);
  const fill = (data.fill as string) || '#dbeafe';
  const stroke = (data.stroke as string) || '#2563eb';
  const label = (data.label as string) || '';
  const textColor = (data.textColor as string) || undefined;

  function commitEdit() {
    setEditing(false);
    updateNodeData(id, { label: editVal });
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    void deleteElements({ nodes: [{ id }] });
  }

  const handleStyle: React.CSSProperties = {
    width: 10, height: 10, background: '#6366f1', border: '2px solid #fff',
    borderRadius: '50%', opacity: 0, transition: 'opacity 0.15s',
  };

  return (
    <div style={{ position: 'relative', width: w, height: h }}
      onDoubleClick={() => { setEditVal(label); setEditing(true); }}
      className="diagram-node-wrap"
    >
      <NodeResizer
        minWidth={40} minHeight={30}
        isVisible={!!selected}
        onResize={(_: unknown, { width, height }: { width: number; height: number }) => { setW(Math.round(width)); setH(Math.round(height)); }}
        onResizeEnd={(_: unknown, { width, height }: { width: number; height: number }) => {
          const nw = Math.round(width), nh = Math.round(height);
          setW(nw); setH(nh);
          updateNodeData(id, { w: nw, h: nh });
        }}
      />
      <Handle id="top"    type="source" position={Position.Top}    style={{ ...handleStyle, top: -5,    left: '50%', transform: 'translateX(-50%)' }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -5, left: '50%', transform: 'translateX(-50%)' }} />
      <Handle id="left"   type="source" position={Position.Left}   style={{ ...handleStyle, left: -5,   top: '50%',  transform: 'translateY(-50%)' }} />
      <Handle id="right"  type="source" position={Position.Right}  style={{ ...handleStyle, right: -5,  top: '50%',  transform: 'translateY(-50%)' }} />
      <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        <ShapeSVG shapeType={data.shapeType as string} w={w} h={h} fill={fill} stroke={stroke} textColor={textColor} label={editing ? '' : label} />
        {selected && <rect x={-3} y={-3} width={w + 6} height={h + 6} fill="none"
          stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" rx={4} pointerEvents="none" />}
      </svg>
      {selected && !editing && (
        <button
          className="diagram-node-delete"
          onMouseDown={handleDeleteClick}
          title="Excluir (Del)"
        >×</button>
      )}
      {editing && (
        <input autoFocus value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commitEdit(); }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            textAlign: 'center', background: 'rgba(255,255,255,0.95)',
            border: '2px solid #6366f1', borderRadius: 4,
            fontSize: 12, padding: '2px 6px', fontFamily: 'system-ui,sans-serif',
          }}
        />
      )}
    </div>
  );
}

const NODE_TYPES = { diagramNode: DiagramNode };

const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#64748b' },
  style: { strokeWidth: 1.5, stroke: '#64748b' },
};

// ── Shape palette item ───────────────────────────────────────────────────────
function PaletteItem({ shape }: { shape: PaletteShape }) {
  const maxDim = 52;
  const scale = Math.min(maxDim / shape.w, maxDim / shape.h, 1);
  const dw = Math.round(shape.w * scale);
  const dh = Math.round(shape.h * scale);

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/diagram-shape', JSON.stringify(shape));
  }

  return (
    <div className="diagram-palette__item" draggable onDragStart={onDragStart} title={shape.label}>
      <svg width={dw} height={dh} viewBox={`0 0 ${shape.w} ${shape.h}`}>
        <ShapeSVG shapeType={shape.shapeType} w={shape.w} h={shape.h}
          fill={shape.defaultFill} stroke={shape.defaultStroke} label="" mini />
      </svg>
      <span>{shape.label}</span>
    </div>
  );
}

// ── FluxoEditor ──────────────────────────────────────────────────────────────
const FILL_PRESETS = [
  '#dbeafe','#bfdbfe','#eff6ff',
  '#dcfce7','#bbf7d0','#f0fdf4',
  '#fef9c3','#fef08a','#fefce8',
  '#fee2e2','#fecaca','#fff1f2',
  '#ede9fe','#ddd6fe','#f5f3ff',
  '#fff7ed','#f1f5f9','#ffffff',
  '#334155','#1e293b',
];
const STROKE_PRESETS = [
  '#2563eb','#1d4ed8','#0284c7',
  '#16a34a','#15803d','#ca8a04',
  '#dc2626','#b91c1c','#7c3aed',
  '#ea580c','#64748b','#1e293b',
];
const TEXT_PRESETS = [
  '#1e293b','#374151','#4b5563',
  '#1d4ed8','#15803d','#92400e',
  '#b91c1c','#6d28d9','#c2410c',
  '#ffffff','#64748b','#1e40af',
];

function FluxoEditorInner({ data, onSave }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void }) {
  const isOld = Array.isArray((data as any).elements);
  const rawNodes: Node[] = isOld ? [] : ((data as any).nodes ?? []);
  const rawEdges: Edge[] = isOld ? [] : ((data as any).edges ?? []);

  const [nodes, setNodes, onNodesChange] = useNodesState(rawNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);
  const { screenToFlowPosition, deleteElements } = useReactFlow();
  const hasMounted = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({ Fluxograma: true, BPMN: false, Swimlane: false, Geral: false });

  const selectedNode = nodes.find((n: Node) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const t = setTimeout(() => onSave({ _tipo: 'fluxo', nodes, edges }), 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds: Edge[]) => addEdge({ ...c, ...DEFAULT_EDGE_OPTIONS }, eds));
  }, [setEdges]);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/diagram-shape');
    if (!raw) return;
    const shape: PaletteShape = JSON.parse(raw);
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newNode: Node = {
      id: `n-${Date.now()}`,
      type: 'diagramNode',
      position,
      style: { width: shape.w, height: shape.h },
      data: { shapeType: shape.shapeType, label: shape.label, fill: shape.defaultFill, stroke: shape.defaultStroke, w: shape.w, h: shape.h },
    };
    setNodes((nds: Node[]) => [...nds, newNode]);
  }

  function patchSelected(patch: Record<string, unknown>) {
    if (!selectedId) return;
    setNodes((nds: Node[]) => nds.map((n: Node) => n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n));
  }

  function deleteSelected() {
    if (!selectedId) return;
    void deleteElements({ nodes: [{ id: selectedId }] });
    setSelectedId(null);
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <aside className="diagram-palette">
        {PALETTE.map(cat => (
          <div key={cat.category}>
            <button className="diagram-palette__cat"
              onClick={() => setOpenCats(o => ({ ...o, [cat.category]: !o[cat.category] }))}>
              {cat.category}
              <span>{openCats[cat.category] ? '▲' : '▼'}</span>
            </button>
            {openCats[cat.category] && (
              <div className="diagram-palette__grid">
                {cat.items.map(s => <PaletteItem key={s.shapeType} shape={s} />)}
              </div>
            )}
          </div>
        ))}

        {selectedNode && (
          <div className="diagram-palette__props">
            <p className="diagram-palette__props-title">Propriedades</p>
            <label className="diagram-palette__props-label">Rótulo</label>
            <input className="diagram-palette__label-input"
              value={(selectedNode.data.label as string) || ''}
              onChange={e => patchSelected({ label: e.target.value })}
            />
            <label className="diagram-palette__props-label" style={{ marginTop: 10 }}>Fundo</label>
            <div className="diagram-palette__colors">
              {FILL_PRESETS.map(c => (
                <button key={c} className={`diagram-palette__color${selectedNode.data.fill === c ? ' diagram-palette__color--on' : ''}`}
                  style={{ background: c, border: `2px solid ${selectedNode.data.fill === c ? '#6366f1' : 'rgba(0,0,0,0.12)'}` }}
                  onClick={() => patchSelected({ fill: c })} />
              ))}
            </div>
            <label className="diagram-palette__props-label" style={{ marginTop: 10 }}>Traço</label>
            <div className="diagram-palette__colors">
              {STROKE_PRESETS.map(c => (
                <button key={c} className="diagram-palette__color"
                  style={{ background: c, border: `2px solid ${selectedNode.data.stroke === c ? '#6366f1' : 'rgba(0,0,0,0.12)'}` }}
                  onClick={() => patchSelected({ stroke: c })} />
              ))}
            </div>
            <label className="diagram-palette__props-label" style={{ marginTop: 10 }}>Texto</label>
            <div className="diagram-palette__colors">
              {TEXT_PRESETS.map(c => (
                <button key={c} className="diagram-palette__color"
                  style={{ background: c, border: `2px solid ${selectedNode.data.textColor === c ? '#6366f1' : 'rgba(0,0,0,0.12)'}` }}
                  onClick={() => patchSelected({ textColor: c })} />
              ))}
            </div>
            <button className="button button--danger button--small" style={{ marginTop: 14, width: '100%' }} onClick={deleteSelected}>
              Excluir forma
            </button>
          </div>
        )}
      </aside>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {isOld && (
          <div className="diagram-compat-banner">
            Diagrama criado com editor antigo — canvas reiniciado em branco.
          </div>
        )}
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop} onDragOver={onDragOver}
          onNodeClick={(_: React.MouseEvent, n: Node) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          nodeTypes={NODE_TYPES}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          connectionMode={ConnectionMode.Loose}
          fitView fitViewOptions={{ padding: 0.25 }}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          snapToGrid snapGrid={[10, 10]}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
          <Controls style={{ bottom: 80 }} />
          <MiniMap nodeColor={(n: Node) => (n.data.fill as string) || '#dbeafe'} style={{ background: '#f1f5f9' }} />
        </ReactFlow>
      </div>
    </div>
  );
}

function FluxoEditor({ data, onSave }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void }) {
  return (
    <ReactFlowProvider>
      <FluxoEditorInner data={data} onSave={onSave} />
    </ReactFlowProvider>
  );
}

// ── Mind Elixir editor (enhanced) ────────────────────────────────────────────
const NODE_COLORS = [
  '#dbeafe','#dcfce7','#fef9c3','#fee2e2',
  '#ede9fe','#fff7ed','#e0f2fe','#fce7f3',
  '#ecfdf5','#fffbeb','#bfdbfe','#ffffff',
  '#1e3a5f','#14532d','#78350f','#4c1d95',
];

function MindEditor({ data, titulo, onSave }: { data: Record<string, unknown>; titulo: string; onSave: (d: Record<string, unknown>) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meRef = useRef<any>(null);
  const [overlay, setOverlay] = useState<{ child: { x: number; y: number }; sib: { x: number; y: number } } | null>(null);
  const [showColors, setShowColors] = useState(false);

  function updateOverlay() {
    const container = containerRef.current;
    if (!container) return;
    const sel = container.querySelector('.selected') as HTMLElement | null;
    if (!sel) { setOverlay(null); setShowColors(false); return; }
    const cr = container.getBoundingClientRect();
    const nr = sel.getBoundingClientRect();
    setOverlay({
      child: { x: nr.left - cr.left + nr.width / 2 - 12, y: nr.bottom - cr.top + 6 },
      sib:   { x: nr.right - cr.left + 6,                 y: nr.top - cr.top + nr.height / 2 - 12 },
    });
    setShowColors(true);
  }

  useEffect(() => {
    if (!containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const me = new (MindElixir as any)({ el: containerRef.current, direction: 2, draggable: true, editable: true, keypress: true });
    me.init('nodeData' in data ? data : newMindData(titulo));
    meRef.current = me;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    me.bus.addListener('operation', () => {
      requestAnimationFrame(updateOverlay);
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => onSave({ _tipo: 'mapa', ...(me.getData() as Record<string, unknown>) }), 1500);
    });
    me.bus.addListener('selectNode', () => requestAnimationFrame(updateOverlay));

    function handleInteraction() { requestAnimationFrame(updateOverlay); }
    containerRef.current.addEventListener('click', handleInteraction);
    containerRef.current.addEventListener('wheel', handleInteraction, { passive: true });
    containerRef.current.addEventListener('mouseup', handleInteraction);

    return () => {
      meRef.current = null;
      if (saveTimer) clearTimeout(saveTimer);
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function act(fn: () => void) {
    return (e: React.MouseEvent) => { e.preventDefault(); fn(); };
  }

  function setNodeBg(color: string) {
    const me = meRef.current;
    if (!me) return;
    const node = me.currentNode;
    if (!node) return;
    if (!node.style) node.style = {};
    node.style.background = color;
    node.style['border-color'] = color;
    const sel = containerRef.current?.querySelector('.selected') as HTMLElement | null;
    if (sel) {
      sel.style.backgroundColor = color;
      sel.style.borderColor = color;
    }
    onSave({ _tipo: 'mapa', ...(me.getData() as Record<string, unknown>) });
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Contextual + buttons */}
      {overlay && (
        <>
          <button className="mind-node-btn mind-node-btn--child" title="Filho (Tab)"
            style={{ left: overlay.child.x, top: overlay.child.y }}
            onMouseDown={act(() => meRef.current?.addChild())}>
            +
          </button>
          <button className="mind-node-btn mind-node-btn--sib" title="Irmão (Enter)"
            style={{ left: overlay.sib.x, top: overlay.sib.y }}
            onMouseDown={act(() => meRef.current?.insertSibling('after'))}>
            +
          </button>
        </>
      )}

      {/* Color palette */}
      {showColors && overlay && (
        <div className="mind-color-palette"
          style={{ left: overlay.child.x - 60, top: overlay.child.y + 34 }}>
          {NODE_COLORS.map(c => (
            <button key={c} className="mind-color-dot"
              style={{ background: c }}
              onMouseDown={act(() => setNodeBg(c))}
              title={c} />
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="mind-actions">
        <button className="mind-actions__btn" onMouseDown={act(() => meRef.current?.addChild())} title="Tab">+ Filho</button>
        <button className="mind-actions__btn" onMouseDown={act(() => meRef.current?.insertSibling('after'))} title="Enter">+ Irmão</button>
        <button className="mind-actions__btn mind-actions__btn--del"
          onMouseDown={act(() => { const n = meRef.current?.currentNodes; if (n?.length) meRef.current.removeNodes(n); })} title="Del">
          Excluir nó
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DiagramasPage() {
  const location = useLocation();
  const locationState = location.state as { openId?: string; novoProjetoId?: string } | null;
  const [lista, setLista] = useState<DiagramaListItem[]>([]);
  const [projetos, setProjetos] = useState<Pick<Projeto, 'id' | 'nome'>[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [current, setCurrent] = useState<DiagramaFull | null>(null);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingDiagrama, setLoadingDiagrama] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoProjetoId, setNovoProjetoId] = useState('');
  const [criando, setCriando] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [filtroProjetoId, setFiltroProjetoId] = useState('');
  const [linkingProjetoId, setLinkingProjetoId] = useState<string | null>(null);
  const currentRef = useRef<DiagramaFull | null>(null);

  useEffect(() => { currentRef.current = current; }, [current]);

  async function loadData() {
    setLoadingLista(true);
    try {
      const [diagramasRes, projetosRes] = await Promise.all([
        http.get<DiagramaListItem[]>('/diagramas'),
        http.get<Pick<Projeto, 'id' | 'nome'>[]>('/projetos'),
      ]);
      setLista(diagramasRes.data);
      setProjetos(projetosRes.data);
    } catch { setError('Falha ao carregar dados.'); }
    finally { setLoadingLista(false); }
  }

  useEffect(() => {
    void loadData().then(() => {
      if (locationState?.openId) void openDiagrama(locationState.openId);
      if (locationState?.novoProjetoId) setNovoProjetoId(locationState.novoProjetoId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async (conteudo: Record<string, unknown>) => {
    const c = currentRef.current;
    if (!c) return;
    setSaving(true);
    try { await http.put(`/diagramas/${c.id}`, { titulo: c.titulo, conteudo }); }
    catch { /* silent */ } finally { setSaving(false); }
  }, []);

  async function openDiagrama(id: string) {
    if (selectedId === id) return;
    setSelectedId(id);
    setLoadingDiagrama(true);
    setError(null);
    try {
      const res = await http.get<DiagramaFull>(`/diagramas/${id}`);
      setCurrent(res.data);
      setLinkingProjetoId(res.data.projetoId ?? null);
    } catch { setError('Falha ao carregar diagrama.'); }
    finally { setLoadingDiagrama(false); }
  }

  async function handleCreate(tipo: TipoDiagrama) {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    setCriando(true);
    setError(null);
    try {
      const conteudo = tipo === 'mapa' ? newMindData(titulo) : newFluxoData();
      const res = await http.post<DiagramaFull>('/diagramas', { titulo, conteudo, projetoId: novoProjetoId || undefined });
      await loadData();
      setNovoTitulo('');
      void openDiagrama(res.data.id);
    } catch (err) { setError(apiError(err, 'Falha ao criar diagrama.')); }
    finally { setCriando(false); }
  }

  async function handleVincularProjeto(projetoId: string | null) {
    if (!current) return;
    try {
      await http.put(`/diagramas/${current.id}`, { titulo: current.titulo, conteudo: current.conteudo, projetoId: projetoId ?? '' });
      setCurrent(c => c ? { ...c, projetoId, projeto: projetos.find(p => p.id === projetoId) ?? null } : c);
      setLista(l => l.map(d => d.id === current.id ? { ...d, projetoId, projeto: projetos.find(p => p.id === projetoId) ?? null } : d));
      setLinkingProjetoId(projetoId);
    } catch (err) { setError(apiError(err, 'Falha ao vincular projeto.')); }
  }

  async function handleRename() {
    if (!current) return;
    const titulo = renameValue.trim();
    if (!titulo || titulo === current.titulo) { setRenaming(false); return; }
    try {
      await http.put(`/diagramas/${current.id}`, { titulo, conteudo: current.conteudo });
      setCurrent(c => c ? { ...c, titulo } : c);
      setLista(l => l.map(d => d.id === current.id ? { ...d, titulo } : d));
    } catch (err) { setError(apiError(err, 'Falha ao renomear.')); }
    finally { setRenaming(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este diagrama?')) return;
    try {
      await http.delete(`/diagramas/${id}`);
      if (selectedId === id) { setSelectedId(null); setCurrent(null); }
      await loadData();
    } catch (err) { setError(apiError(err, 'Falha ao excluir.')); }
  }

  function apiError(err: unknown, fallback: string) {
    if (axios.isAxiosError(err)) { const msg = err.response?.data?.message; return Array.isArray(msg) ? msg.join(' | ') : msg || fallback; }
    return fallback;
  }

  const listaFiltrada = filtroProjetoId ? lista.filter(d => d.projetoId === filtroProjetoId) : lista;
  const tipo: TipoDiagrama = (current?.conteudo?._tipo as TipoDiagrama) ?? 'fluxo';

  return (
    <div className="page-stack">
      <PageHeader title="Diagramas" subtitle="Mapas mentais e fluxogramas vinculáveis a projetos." />
      {error ? <Feedback type="error" message={error} /> : null}

      <div className="diagramas-layout">
        <aside className="diagramas-sidebar">
          <div className="diagramas-sidebar__filter">
            <select value={filtroProjetoId} onChange={e => setFiltroProjetoId(e.target.value)}>
              <option value="">Todos os diagramas</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="diagramas-sidebar__new">
            <input className="diagramas-sidebar__input" placeholder="Nome do diagrama..."
              value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleCreate('mapa'); }} />
          </div>
          <div className="diagramas-sidebar__new" style={{ paddingTop: 0 }}>
            <select className="diagramas-sidebar__input" value={novoProjetoId} onChange={e => setNovoProjetoId(e.target.value)}>
              <option value="">Sem projeto</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="diagramas-sidebar__tipo-btns">
            <button className="button button--ghost button--small" disabled={criando || !novoTitulo.trim()} onClick={() => void handleCreate('mapa')}>+ Mapa</button>
            <button className="button button--ghost button--small" disabled={criando || !novoTitulo.trim()} onClick={() => void handleCreate('fluxo')}>+ Fluxo</button>
          </div>
          {loadingLista ? <LoadingBlock label="Carregando..." /> : null}
          {!loadingLista && listaFiltrada.length === 0 ? <EmptyState message="Nenhum diagrama encontrado." /> : null}
          {!loadingLista && listaFiltrada.length > 0 ? (
            <ul className="diagramas-sidebar__list">
              {listaFiltrada.map(d => (
                <li key={d.id} className={`diagramas-sidebar__item${selectedId === d.id ? ' diagramas-sidebar__item--active' : ''}`}
                  onClick={() => void openDiagrama(d.id)}>
                  <div className="diagramas-sidebar__item-info">
                    <span className="diagramas-sidebar__item-title">{d.titulo}</span>
                    {d.projeto && <span className="diagramas-sidebar__item-projeto">{d.projeto.nome}</span>}
                  </div>
                  <button className="diagramas-sidebar__item-del" title="Excluir"
                    onClick={e => { e.stopPropagation(); void handleDelete(d.id); }}>×</button>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>

        <div className="diagramas-editor">
          {!current && !loadingDiagrama ? (
            <div className="diagramas-editor__empty"><p>Selecione ou crie um diagrama.</p></div>
          ) : null}
          {loadingDiagrama ? <LoadingBlock label="Abrindo..." /> : null}

          {current && !loadingDiagrama ? (
            <>
              <div className="diagramas-editor__toolbar">
                {renaming ? (
                  <input className="diagramas-editor__rename" value={renameValue} autoFocus
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => void handleRename()}
                    onKeyDown={e => { if (e.key === 'Enter') void handleRename(); if (e.key === 'Escape') setRenaming(false); }} />
                ) : (
                  <h3 className="diagramas-editor__title" title="Clique para renomear"
                    onClick={() => { setRenameValue(current.titulo); setRenaming(true); }}>
                    {current.titulo}
                  </h3>
                )}
                <span className="diagramas-editor__tipo-badge">{tipo === 'mapa' ? 'Mapa Mental' : 'Fluxograma'}</span>
                <select className="diagramas-editor__projeto-select"
                  value={linkingProjetoId ?? ''} onChange={e => void handleVincularProjeto(e.target.value || null)} title="Vincular a projeto">
                  <option value="">Sem projeto</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <span className="diagramas-editor__status">{saving ? 'Salvando...' : 'Salvo'}</span>
                {tipo === 'mapa' && <span className="diagramas-editor__hint">Clique num nó · duplo-clique para editar · use + para expandir</span>}
                {tipo === 'fluxo' && <span className="diagramas-editor__hint">Arraste formas da paleta · conecte pelos pontos de ancoragem · duplo-clique para editar rótulo</span>}
                <button className="button button--danger button--small" type="button" style={{ marginLeft: 'auto' }}
                  onClick={() => void handleDelete(current.id)}>
                  Excluir diagrama
                </button>
              </div>

              <div className="diagramas-editor__canvas" key={current.id}>
                {tipo === 'mapa'
                  ? <MindEditor data={current.conteudo} titulo={current.titulo} onSave={handleSave} />
                  : <FluxoEditor data={current.conteudo} onSave={handleSave} />}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
