import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { http } from '../api/http';
import type { PublicFormulario } from '../types/api';

const ORIGEM_ICON: Record<string, string> = {
  WHATSAPP: '💬',
  EMAIL: '✉️',
  INSTAGRAM: '📸',
  OUTRO: '📋',
};

const initialFields = {
  nomeContato: '',
  empresaNome: '',
  email: '',
  telefone: '',
  mensagem: '',
};

export default function CaptacaoPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [formulario, setFormulario] = useState<PublicFormulario | null>(null);
  const [loadingForm, setLoadingForm] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fields, setFields] = useState({ ...initialFields });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoadingForm(true);
    http
      .get<PublicFormulario>(`/captacao/f/${slug}`)
      .then((res) => setFormulario(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoadingForm(false));
  }, [slug]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError(null);
    try {
      await http.post(`/captacao/f/${slug}/submit`, fields);
      setSubmitted(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data?.message;
        setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Erro ao enviar. Tente novamente.');
      } else {
        setError('Erro ao enviar. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingForm) {
    return (
      <div className="captacao-shell">
        <div className="captacao-card">
          <p className="muted">Carregando formulário…</p>
        </div>
      </div>
    );
  }

  if (notFound || !formulario) {
    return (
      <div className="captacao-shell">
        <div className="captacao-card">
          <h2>Formulário não encontrado</h2>
          <p className="muted">Este link pode estar inativo ou incorreto.</p>
        </div>
      </div>
    );
  }

  const empresaNome = formulario.empresa.nomeFantasia || formulario.empresa.nome;
  const origemIcon = ORIGEM_ICON[formulario.origemLead] ?? '📋';

  if (submitted) {
    return (
      <div className="captacao-shell">
        <div className="captacao-card captacao-card--success">
          {formulario.empresa.logoUrl ? (
            <img src={formulario.empresa.logoUrl} alt={empresaNome} className="captacao-logo" />
          ) : (
            <div className="captacao-brand">{empresaNome.slice(0, 1).toUpperCase()}</div>
          )}
          <div className="captacao-success-icon">✓</div>
          <h2>Recebemos seu contato!</h2>
          <p>Obrigado, <strong>{fields.nomeContato}</strong>. Em breve nossa equipe entrará em contato com você.</p>
          <p className="muted">{empresaNome}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="captacao-shell">
      <div className="captacao-card">
        {formulario.empresa.logoUrl ? (
          <img src={formulario.empresa.logoUrl} alt={empresaNome} className="captacao-logo" />
        ) : (
          <div className="captacao-brand">{empresaNome.slice(0, 1).toUpperCase()}</div>
        )}

        <div className="captacao-origem-badge">
          <span>{origemIcon}</span>
          <span>{empresaNome}</span>
        </div>

        <h1 className="captacao-titulo">{formulario.titulo}</h1>
        {formulario.descricao ? <p className="captacao-descricao">{formulario.descricao}</p> : null}

        {error ? <div className="feedback feedback--error">{error}</div> : null}

        <form className="captacao-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="field">
            <label htmlFor="cap-nome">Seu nome *</label>
            <input
              id="cap-nome"
              value={fields.nomeContato}
              onChange={(e) => setFields((c) => ({ ...c, nomeContato: e.target.value }))}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="cap-empresa">Empresa (opcional)</label>
            <input
              id="cap-empresa"
              value={fields.empresaNome}
              onChange={(e) => setFields((c) => ({ ...c, empresaNome: e.target.value }))}
              placeholder="Nome da empresa"
            />
          </div>

          <div className="field">
            <label htmlFor="cap-email">E-mail</label>
            <input
              id="cap-email"
              type="email"
              value={fields.email}
              onChange={(e) => setFields((c) => ({ ...c, email: e.target.value }))}
              placeholder="seu@email.com"
            />
          </div>

          <div className="field">
            <label htmlFor="cap-telefone">Telefone / WhatsApp</label>
            <input
              id="cap-telefone"
              value={fields.telefone}
              onChange={(e) => setFields((c) => ({ ...c, telefone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="field">
            <label htmlFor="cap-mensagem">Mensagem (opcional)</label>
            <textarea
              id="cap-mensagem"
              value={fields.mensagem}
              onChange={(e) => setFields((c) => ({ ...c, mensagem: e.target.value }))}
              rows={4}
              placeholder="Conte um pouco sobre o que você precisa…"
            />
          </div>

          <button type="submit" className="button captacao-submit" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
}
