import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../api/http';
import { formatCurrency, formatDate } from '../utils/format';

type PropostaCobranca = {
  ordem: number;
  vencimento: string;
  valor: number;
  descricao: string | null;
};

type PropostaPublica = {
  id: string;
  titulo: string;
  objeto: string | null;
  textoPropostaBase: string | null;
  valor: number | null;
  formaPagamento: string | null;
  validadeAte: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  status: string;
  contatoClienteNome: string | null;
  empresa: { nome: string } | null;
  cobrancas: PropostaCobranca[];
};

type Tela = 'carregando' | 'ok' | 'erro' | 'aceita' | 'recusada' | 'expirada';

export default function PropostaClientePage() {
  const { token } = useParams<{ token: string }>();
  const [proposta, setProposta] = useState<PropostaPublica | null>(null);
  const [tela, setTela] = useState<Tela>('carregando');
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!token) { setTela('erro'); return; }
    axios.get<PropostaPublica>(`${API_URL}/propostas/public/${token}`)
      .then((res) => {
        setProposta(res.data);
        const s = res.data.status;
        if (s === 'CONVERTIDA') setTela('aceita');
        else if (s === 'RECUSADA') setTela('recusada');
        else if (s === 'EXPIRADA') setTela('expirada');
        else setTela('ok');
      })
      .catch(() => setTela('erro'));
  }, [token]);

  async function handleAceitar() {
    if (!token || processando) return;
    if (!confirm('Confirmar o aceite desta proposta?')) return;
    setProcessando(true);
    setErroMsg(null);
    try {
      await axios.post(`${API_URL}/propostas/public/${token}/aceitar`);
      setTela('aceita');
    } catch {
      setErroMsg('Não foi possível registrar o aceite. Tente novamente ou entre em contato conosco.');
    } finally {
      setProcessando(false);
    }
  }

  async function handleRecusar() {
    if (!token || processando) return;
    if (!confirm('Confirmar a recusa desta proposta?')) return;
    setProcessando(true);
    setErroMsg(null);
    try {
      await axios.post(`${API_URL}/propostas/public/${token}/recusar`);
      setTela('recusada');
    } catch {
      setErroMsg('Não foi possível registrar a recusa. Tente novamente ou entre em contato conosco.');
    } finally {
      setProcessando(false);
    }
  }

  const empresaNome = proposta?.empresa?.nome || 'Raccolto';

  if (tela === 'carregando') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={{ color: '#888', textAlign: 'center' }}>Carregando proposta…</p>
        </div>
      </div>
    );
  }

  if (tela === 'erro') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>Proposta não encontrada</h2>
          <p style={{ color: '#666', marginTop: 8 }}>
            Este link pode ter expirado ou ser inválido. Entre em contato com a empresa para obter um novo link.
          </p>
        </div>
      </div>
    );
  }

  if (tela === 'aceita') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ ...styles.title, color: '#16a34a' }}>Proposta aceita!</h2>
            <p style={{ color: '#666', marginTop: 12, lineHeight: 1.6 }}>
              Obrigado! Sua aceitação foi registrada com sucesso.
              {proposta?.titulo ? ` A proposta "${proposta.titulo}" será formalizada em breve.` : ''}
            </p>
            <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>
              Em breve você receberá as próximas instruções por e-mail.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (tela === 'recusada') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <h2 style={styles.title}>Proposta recusada</h2>
            <p style={{ color: '#666', marginTop: 12, lineHeight: 1.6 }}>
              Sua recusa foi registrada. Se desejar discutir outras condições, entre em contato com a {empresaNome}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (tela === 'expirada') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>Proposta expirada</h2>
          <p style={{ color: '#666', marginTop: 8 }}>
            O prazo de validade desta proposta já se encerrou. Entre em contato com a {empresaNome} para solicitar uma nova proposta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <p style={styles.label}>Proposta Comercial</p>
          <h1 style={styles.title}>{proposta!.titulo}</h1>
          {proposta!.objeto ? (
            <p style={{ color: '#555', marginTop: 8, lineHeight: 1.6 }}>{proposta!.objeto}</p>
          ) : null}
        </div>

        <div style={styles.metaGrid}>
          {proposta!.empresa ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Empresa</span>
              <span style={styles.metaValue}>{empresaNome}</span>
            </div>
          ) : null}
          {proposta!.valor != null ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Valor total</span>
              <span style={{ ...styles.metaValue, fontWeight: 700, color: '#1a2b4a', fontSize: 18 }}>
                {formatCurrency(proposta!.valor)}
              </span>
            </div>
          ) : null}
          {proposta!.formaPagamento ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Forma de pagamento</span>
              <span style={styles.metaValue}>{proposta!.formaPagamento}</span>
            </div>
          ) : null}
          {proposta!.dataInicio ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Início previsto</span>
              <span style={styles.metaValue}>{formatDate(proposta!.dataInicio)}</span>
            </div>
          ) : null}
          {proposta!.dataFim ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Término previsto</span>
              <span style={styles.metaValue}>{formatDate(proposta!.dataFim)}</span>
            </div>
          ) : null}
          {proposta!.validadeAte ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Válida até</span>
              <span style={styles.metaValue}>{formatDate(proposta!.validadeAte)}</span>
            </div>
          ) : null}
        </div>

        {proposta!.cobrancas?.length > 0 ? (
          <div style={{ marginTop: 24 }}>
            <h3 style={styles.sectionTitle}>Grade de cobranças</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Vencimento</th>
                    <th style={styles.th}>Valor</th>
                    <th style={styles.th}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {proposta!.cobrancas.map((c) => (
                    <tr key={c.ordem}>
                      <td style={styles.td}>{c.ordem}</td>
                      <td style={styles.td}>{formatDate(c.vencimento)}</td>
                      <td style={styles.td}>{formatCurrency(c.valor)}</td>
                      <td style={styles.td}>{c.descricao ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {proposta!.textoPropostaBase ? (
          <div style={{ marginTop: 28 }}>
            <h3 style={styles.sectionTitle}>Detalhes da proposta</h3>
            <div style={styles.textoBox}>
              {proposta!.textoPropostaBase}
            </div>
          </div>
        ) : null}

        <div style={styles.acaoSection}>
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 24px' }} />
          <p style={{ color: '#555', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            Ao clicar em <strong>Aceitar proposta</strong>, você confirma o interesse nos serviços descritos acima.
            Um contrato formal será gerado e você será notificado em seguida.
          </p>
          {erroMsg ? (
            <div style={styles.erro}>{erroMsg}</div>
          ) : null}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              style={styles.btnAceitar}
              onClick={() => void handleAceitar()}
              disabled={processando}
            >
              {processando ? 'Processando…' : 'Aceitar proposta'}
            </button>
            <button
              style={styles.btnRecusar}
              onClick={() => void handleRecusar()}
              disabled={processando}
            >
              Recusar
            </button>
          </div>
        </div>

        <div style={styles.footer}>
          Esta proposta foi enviada pela {empresaNome} via plataforma Raccolto.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px 80px',
  } as React.CSSProperties,
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,.08)',
    maxWidth: 760,
    width: '100%',
    padding: '40px 40px 32px',
  } as React.CSSProperties,
  header: {
    marginBottom: 24,
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '.5px',
    margin: '0 0 6px',
  } as React.CSSProperties,
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a2b4a',
    margin: 0,
  } as React.CSSProperties,
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 16,
    background: '#f9fafb',
    borderRadius: 8,
    padding: '20px 20px',
    marginBottom: 8,
  } as React.CSSProperties,
  metaItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  } as React.CSSProperties,
  metaLabel: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '.4px',
  } as React.CSSProperties,
  metaValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 500,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a2b4a',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '.4px',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '8px 12px',
    background: '#f3f4f6',
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 600,
    borderBottom: '1px solid #e5e7eb',
  } as React.CSSProperties,
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  } as React.CSSProperties,
  textoBox: {
    whiteSpace: 'pre-wrap' as const,
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.7,
    background: '#f9fafb',
    borderRadius: 8,
    padding: '20px 24px',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  acaoSection: {
    marginTop: 32,
  } as React.CSSProperties,
  erro: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  } as React.CSSProperties,
  btnAceitar: {
    background: '#1a2b4a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  btnRecusar: {
    background: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    padding: '12px 20px',
    fontSize: 14,
    cursor: 'pointer',
  } as React.CSSProperties,
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTop: '1px solid #f3f4f6',
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center' as const,
  } as React.CSSProperties,
};
