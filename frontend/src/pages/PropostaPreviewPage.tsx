import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { http } from '../api/http';
import { formatCurrency, formatDate } from '../utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

type EmpresaPreview = {
  nome: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  representanteNome?: string | null;
  representanteCargo?: string | null;
  logoUrl?: string | null;
  infBancarias?: string | null;
};

type PropostaCobranca = {
  ordem: number;
  vencimento: string;
  valor: number;
  descricao?: string | null;
};

type PropostaPreview = {
  id: string;
  titulo: string;
  objeto?: string | null;
  responsavelInterno?: string | null;
  contatoClienteNome?: string | null;
  contatoClienteEmail?: string | null;
  contatoClienteTelefone?: string | null;
  clienteRazaoSocial?: string | null;
  clienteNomeFantasia?: string | null;
  clienteCpfCnpj?: string | null;
  clienteEnderecoFormatado?: string | null;
  valor?: number | null;
  formaPagamento?: string | null;
  periodicidadeCobranca?: string | null;
  quantidadeParcelas?: number | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  primeiroVencimento?: string | null;
  validadeAte?: string | null;
  textoPropostaBase?: string | null;
  observacoes?: string | null;
  cobrancas?: PropostaCobranca[];
  cliente?: { razaoSocial: string; nomeFantasia?: string | null } | null;
};

// ─── Variable substitution ───────────────────────────────────────────────────

function substituirVariaveis(texto: string, proposta: PropostaPreview): string {
  const clienteNome = proposta.cliente?.razaoSocial || proposta.clienteRazaoSocial || '';
  const clienteCnpj = proposta.clienteCpfCnpj || '';
  const responsavel = proposta.responsavelInterno || '';
  const valorTotal = proposta.valor != null ? formatCurrency(Number(proposta.valor)) : '';
  const dataInicio = proposta.dataInicio ? formatDate(String(proposta.dataInicio)) : '';
  const dataFim = proposta.dataFim ? formatDate(String(proposta.dataFim)) : '';
  const validade = proposta.validadeAte ? formatDate(String(proposta.validadeAte)) : '';
  const contatoNome = proposta.contatoClienteNome || '';
  const contatoEmail = proposta.contatoClienteEmail || '';
  const contatoTelefone = proposta.contatoClienteTelefone || '';
  const objeto = proposta.objeto || '';
  const qtdParcelas = String(proposta.quantidadeParcelas || '');
  const periodicidade = (proposta.periodicidadeCobranca || '').toLowerCase();
  const formaPagamento = proposta.formaPagamento || '';

  return texto
    .replace(/\{\{cliente_nome\}\}/g, clienteNome)
    .replace(/\{\{cliente_cnpj\}\}/g, clienteCnpj)
    .replace(/\{\{responsavel\}\}/g, responsavel)
    .replace(/\{\{valor_total\}\}/g, valorTotal)
    .replace(/\{\{data_inicio\}\}/g, dataInicio)
    .replace(/\{\{data_fim\}\}/g, dataFim)
    .replace(/\{\{validade\}\}/g, validade)
    .replace(/\{\{contato_nome\}\}/g, contatoNome)
    .replace(/\{\{contato_email\}\}/g, contatoEmail)
    .replace(/\{\{contato_telefone\}\}/g, contatoTelefone)
    .replace(/\{\{objeto\}\}/g, objeto)
    .replace(/\{\{qtd_parcelas\}\}/g, qtdParcelas)
    .replace(/\{\{periodicidade\}\}/g, periodicidade)
    .replace(/\{\{forma_pagamento\}\}/g, formaPagamento);
}

// ─── Markdown-like text renderer ─────────────────────────────────────────────

type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'hr' }
  | { type: 'ul'; items: string[] }
  | { type: 'p'; text: string }
  | { type: 'blank' };

function parseBlocks(texto: string): Block[] {
  const linhas = texto.split('\n');
  const blocos: Block[] = [];
  let listaAtual: string[] | null = null;

  function flushLista() {
    if (listaAtual && listaAtual.length > 0) {
      blocos.push({ type: 'ul', items: [...listaAtual] });
      listaAtual = null;
    }
  }

  for (const linha of linhas) {
    const trimmed = linha.trim();

    if (trimmed.startsWith('# ')) {
      flushLista();
      blocos.push({ type: 'h1', text: trimmed.slice(2) });
    } else if (trimmed.startsWith('## ')) {
      flushLista();
      blocos.push({ type: 'h2', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('### ')) {
      flushLista();
      blocos.push({ type: 'h3', text: trimmed.slice(4) });
    } else if (trimmed === '---') {
      flushLista();
      blocos.push({ type: 'hr' });
    } else if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const item = trimmed.slice(2);
      if (!listaAtual) listaAtual = [];
      listaAtual.push(item);
    } else if (trimmed === '') {
      flushLista();
      blocos.push({ type: 'blank' });
    } else {
      flushLista();
      blocos.push({ type: 'p', text: trimmed });
    }
  }

  flushLista();
  return blocos;
}

function renderInline(text: string): React.ReactNode[] {
  // **bold** support
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function RenderText({ texto }: { texto: string }) {
  const blocos = parseBlocks(texto);
  const elementos: React.ReactNode[] = [];
  let key = 0;

  for (const bloco of blocos) {
    if (bloco.type === 'blank') {
      // blank lines add spacing via margin on adjacent elements
    } else if (bloco.type === 'h1') {
      elementos.push(<h1 key={key++} style={styles.h1}>{renderInline(bloco.text)}</h1>);
    } else if (bloco.type === 'h2') {
      elementos.push(<h2 key={key++} style={styles.h2}>{renderInline(bloco.text)}</h2>);
    } else if (bloco.type === 'h3') {
      elementos.push(<h3 key={key++} style={styles.h3}>{renderInline(bloco.text)}</h3>);
    } else if (bloco.type === 'hr') {
      elementos.push(<hr key={key++} style={styles.hr} />);
    } else if (bloco.type === 'ul') {
      elementos.push(
        <ul key={key++} style={styles.ul}>
          {bloco.items.map((item, i) => (
            <li key={i} style={styles.li}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    } else if (bloco.type === 'p') {
      elementos.push(<p key={key++} style={styles.p}>{renderInline(bloco.text)}</p>);
    }
  }

  return <>{elementos}</>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BRAND = '#1a365d';
const ACCENT = '#e07b1a';

const styles = {
  page: {
    fontFamily: "'Calibri', 'Carlito', Arial, sans-serif",
    fontSize: 13,
    lineHeight: 1.65,
    color: '#222',
    background: '#fff',
    maxWidth: 820,
    margin: '0 auto',
    padding: '40px 48px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `3px solid ${BRAND}`,
    paddingBottom: 20,
    marginBottom: 32,
  } as React.CSSProperties,
  logo: {
    maxHeight: 72,
    maxWidth: 220,
    objectFit: 'contain',
  } as React.CSSProperties,
  headerRight: {
    textAlign: 'right' as const,
    fontSize: 11,
    color: '#555',
    lineHeight: 1.5,
  } as React.CSSProperties,
  empresaNome: {
    fontSize: 15,
    fontWeight: 'bold',
    color: BRAND,
    display: 'block',
    marginBottom: 2,
  } as React.CSSProperties,
  titleBlock: {
    marginBottom: 28,
  } as React.CSSProperties,
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: BRAND,
    margin: '0 0 4px',
    letterSpacing: 0.5,
  } as React.CSSProperties,
  subtitle: {
    fontSize: 15,
    color: ACCENT,
    fontWeight: 'bold',
    margin: '0 0 16px',
  } as React.CSSProperties,
  infoTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: 28,
    fontSize: 13,
  } as React.CSSProperties,
  infoTh: {
    background: BRAND,
    color: '#fff',
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontWeight: 'bold',
    width: 160,
    fontSize: 12,
  } as React.CSSProperties,
  infoTd: {
    padding: '8px 12px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
  } as React.CSSProperties,
  h1: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND,
    margin: '28px 0 10px',
    borderBottom: `1px solid #e2e8f0`,
    paddingBottom: 6,
  } as React.CSSProperties,
  h2: {
    fontSize: 15,
    fontWeight: 'bold',
    color: BRAND,
    margin: '20px 0 8px',
    background: '#eef3f9',
    padding: '6px 10px',
    borderLeft: `4px solid ${BRAND}`,
  } as React.CSSProperties,
  h3: {
    fontSize: 13,
    fontWeight: 'bold',
    color: BRAND,
    margin: '14px 0 6px',
  } as React.CSSProperties,
  hr: {
    border: 'none',
    borderTop: '1px solid #e2e8f0',
    margin: '20px 0',
  } as React.CSSProperties,
  ul: {
    margin: '6px 0 12px 0',
    paddingLeft: 0,
    listStyle: 'none',
  } as React.CSSProperties,
  li: {
    padding: '4px 0 4px 20px',
    position: 'relative' as const,
    borderBottom: '1px solid #f1f5f9',
  } as React.CSSProperties,
  p: {
    margin: '0 0 10px',
  } as React.CSSProperties,
  cobrancasSection: {
    marginTop: 20,
    marginBottom: 20,
  } as React.CSSProperties,
  cobrancasTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: BRAND,
    marginBottom: 8,
  } as React.CSSProperties,
  tableWrap: {
    overflowX: 'auto' as const,
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 12,
  } as React.CSSProperties,
  thead: {
    background: BRAND,
    color: '#fff',
  } as React.CSSProperties,
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontWeight: 'bold',
  } as React.CSSProperties,
  td: {
    padding: '7px 12px',
    borderBottom: '1px solid #e2e8f0',
  } as React.CSSProperties,
  tdRight: {
    padding: '7px 12px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'right' as const,
  } as React.CSSProperties,
  tdEven: {
    background: '#f8fafc',
  } as React.CSSProperties,
  assinaturaSection: {
    marginTop: 40,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 32,
  } as React.CSSProperties,
  assinaturaBox: {
    borderTop: `2px solid ${BRAND}`,
    paddingTop: 10,
    fontSize: 12,
    color: '#555',
  } as React.CSSProperties,
  footer: {
    marginTop: 48,
    borderTop: `2px solid ${BRAND}`,
    paddingTop: 16,
    fontSize: 11,
    color: '#777',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    gap: 8,
  } as React.CSSProperties,
  footerLeft: {
    lineHeight: 1.6,
  } as React.CSSProperties,
  footerRight: {
    textAlign: 'right' as const,
    lineHeight: 1.6,
  } as React.CSSProperties,
  printBar: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    background: BRAND,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 24px',
    zIndex: 1000,
    fontSize: 13,
  } as React.CSSProperties,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCnpj(v?: string | null) {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropostaPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [proposta, setProposta] = useState<PropostaPreview | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      http.get<PropostaPreview>(`/propostas/${id}`),
      http.get<EmpresaPreview>('/empresas/me'),
    ])
      .then(([pRes, eRes]) => {
        setProposta(pRes.data);
        setEmpresa(eRes.data);
      })
      .catch(() => setError('Não foi possível carregar a proposta.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#555' }}>
        Carregando proposta...
      </div>
    );
  }

  if (error || !proposta || !empresa) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#c53030' }}>
        {error || 'Proposta não encontrada.'}
      </div>
    );
  }

  const textoFinal = proposta.textoPropostaBase
    ? substituirVariaveis(proposta.textoPropostaBase, proposta)
    : '';

  const clienteNome = proposta.cliente?.razaoSocial || proposta.clienteRazaoSocial || '—';
  const clienteFantasia = proposta.cliente?.nomeFantasia || proposta.clienteNomeFantasia || null;
  const contatoNome = proposta.contatoClienteNome || '—';

  const enderecoEmpresa = [empresa.logradouro, empresa.numero, empresa.bairro, empresa.cidade, empresa.estado]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      {/* Barra de impressão — oculta no print */}
      <div style={styles.printBar} className="no-print">
        <span style={{ fontWeight: 'bold' }}>{proposta.titulo}</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => window.print()}
            style={{
              background: ACCENT,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Imprimir / Salvar PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              padding: '7px 16px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Espaço para barra fixa */}
      <div style={{ height: 52 }} className="no-print" />

      {/* Página da proposta */}
      <div style={styles.page}>

        {/* Cabeçalho */}
        <header style={styles.header}>
          <div>
            {empresa.logoUrl ? (
              <img src={empresa.logoUrl} alt={empresa.nome} style={styles.logo} />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 'bold', color: BRAND }}>
                {empresa.nomeFantasia || empresa.nome}
              </div>
            )}
          </div>
          <div style={styles.headerRight}>
            <span style={styles.empresaNome}>{empresa.nomeFantasia || empresa.nome}</span>
            {empresa.cnpj ? <span>CNPJ: {formatCnpj(empresa.cnpj)}</span> : null}
            {empresa.cnpj ? <br /> : null}
            {empresa.cidade && empresa.estado ? <span>{empresa.cidade} – {empresa.estado}</span> : null}
            {(empresa.cidade && empresa.estado) ? <br /> : null}
            {empresa.telefone ? <span>{empresa.telefone}</span> : null}
            {empresa.telefone ? <br /> : null}
            {empresa.email ? <span>{empresa.email}</span> : null}
          </div>
        </header>

        {/* Título */}
        <div style={styles.titleBlock}>
          <h1 style={styles.mainTitle}>PROPOSTA COMERCIAL</h1>
          <p style={styles.subtitle}>{proposta.objeto || proposta.titulo}</p>
        </div>

        {/* Tabela de identificação */}
        <table style={styles.infoTable}>
          <tbody>
            <tr>
              <th style={styles.infoTh}>Cliente</th>
              <td style={styles.infoTd}>
                {clienteNome}
                {clienteFantasia ? ` (${clienteFantasia})` : ''}
                {proposta.clienteCpfCnpj ? ` — ${formatCnpj(proposta.clienteCpfCnpj)}` : ''}
              </td>
            </tr>
            <tr>
              <th style={styles.infoTh}>Responsável</th>
              <td style={styles.infoTd}>{contatoNome}</td>
            </tr>
            {proposta.dataInicio ? (
              <tr>
                <th style={styles.infoTh}>Prazo estimado</th>
                <td style={styles.infoTd}>
                  {formatDate(String(proposta.dataInicio))}
                  {proposta.dataFim ? ` até ${formatDate(String(proposta.dataFim))}` : ''}
                </td>
              </tr>
            ) : null}
            {proposta.validadeAte ? (
              <tr>
                <th style={styles.infoTh}>Validade</th>
                <td style={styles.infoTd}>{formatDate(String(proposta.validadeAte))}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* Conteúdo do modelo — com suporte a {{tabela_cobrancas}} inline */}
        {textoFinal
          ? textoFinal.split('{{tabela_cobrancas}}').map((segmento, i, arr) => (
              <span key={i}>
                <RenderText texto={segmento} />
                {i < arr.length - 1 && proposta.cobrancas && proposta.cobrancas.length > 0 ? (
                  <div style={styles.cobrancasSection}>
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead style={styles.thead}>
                          <tr>
                            <th style={styles.th}>#</th>
                            <th style={styles.th}>Vencimento</th>
                            <th style={styles.th}>Descrição</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposta.cobrancas.map((c, ci) => (
                            <tr key={c.ordem} style={ci % 2 === 1 ? styles.tdEven : undefined}>
                              <td style={styles.td}>{c.ordem}</td>
                              <td style={styles.td}>{formatDate(String(c.vencimento))}</td>
                              <td style={styles.td}>{c.descricao || '—'}</td>
                              <td style={styles.tdRight}>{formatCurrency(c.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </span>
            ))
          : null}

        {/* Observações */}
        {proposta.observacoes ? (
          <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8fafc', borderLeft: `4px solid ${ACCENT}`, fontSize: 12, color: '#555' }}>
            <strong>Observações:</strong> {proposta.observacoes}
          </div>
        ) : null}

        {/* Assinaturas */}
        <div style={styles.assinaturaSection}>
          <div style={styles.assinaturaBox}>
            <div style={{ marginBottom: 32 }}></div>
            <div>{empresa.representanteNome || empresa.nome}</div>
            <div style={{ color: '#777' }}>{empresa.representanteCargo || 'Consultor Responsável'}</div>
            <div style={{ color: '#777', fontSize: 11 }}>{empresa.nomeFantasia || empresa.nome}</div>
          </div>
          <div style={styles.assinaturaBox}>
            <div style={{ marginBottom: 32 }}></div>
            <div>{clienteNome}</div>
            <div style={{ color: '#777' }}>Representante / RD</div>
            <div style={{ color: '#777', fontSize: 11 }}>{clienteFantasia || clienteNome}</div>
          </div>
        </div>

        {/* Rodapé */}
        <footer style={styles.footer}>
          <div style={styles.footerLeft}>
            <strong style={{ color: BRAND }}>{empresa.nomeFantasia || empresa.nome}</strong>
            {empresa.cnpj ? ` • CNPJ: ${formatCnpj(empresa.cnpj)}` : ''}
            {enderecoEmpresa ? <><br />{enderecoEmpresa}</> : null}
            {empresa.infBancarias ? <><br />{empresa.infBancarias}</> : null}
          </div>
          <div style={styles.footerRight}>
            {empresa.telefone ? <><span>{empresa.telefone}</span><br /></> : null}
            {empresa.email ? <span>{empresa.email}</span> : null}
            <br />
            <span style={{ color: '#aaa', fontSize: 10 }}>
              Proposta gerada em {new Date().toLocaleDateString('pt-BR')} — {proposta.titulo}
            </span>
          </div>
        </footer>
      </div>

      {/* CSS de impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { margin: 18mm 15mm; }
        }
        li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: ${ACCENT};
          font-weight: bold;
        }
      `}</style>
    </>
  );
}
