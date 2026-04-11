import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Feedback from '../components/Feedback';
import { http } from '../api/http';
import { useAuth } from '../contexts/AuthContext';
import type { EmpresaLoginOption } from '../types/auth';

const LOGIN_EMPRESA_KEY = 'raccolto_login_empresa';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, bootstrap, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'bootstrap'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaLoginOption[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState<string>(() => localStorage.getItem(LOGIN_EMPRESA_KEY) || '');

  const [loginForm, setLoginForm] = useState({
    email: '',
    senha: '',
  });

  const [bootstrapForm, setBootstrapForm] = useState({
    nome: '',
    email: '',
    senha: '',
    empresaNome: '',
  });

  useEffect(() => {
    async function loadEmpresas() {
      setLoadingEmpresas(true);
      try {
        const response = await http.get<{ itens: EmpresaLoginOption[] }>('/auth/empresas');
        setEmpresas(response.data.itens ?? []);
        setEmpresaSelecionadaId((current) => {
          if (current && response.data.itens.some((item) => item.id === current)) return current;
          const first = response.data.itens[0]?.id ?? '';
          if (first) localStorage.setItem(LOGIN_EMPRESA_KEY, first);
          return first;
        });
      } catch {
        setEmpresas([]);
      } finally {
        setLoadingEmpresas(false);
      }
    }

    void loadEmpresas();
  }, []);


  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!empresaSelecionadaId) {
      setError('Selecione a empresa antes de entrar.');
      return;
    }

    try {
      await login({ empresaId: empresaSelecionadaId, ...loginForm });
      localStorage.setItem(LOGIN_EMPRESA_KEY, empresaSelecionadaId);
      navigate('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data?.message;
        setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Não foi possível entrar no sistema.');
      } else {
        setError('Não foi possível entrar no sistema.');
      }
    }
  }

  async function handleBootstrap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const message = await bootstrap(bootstrapForm);
      setSuccess(message);
      setMode('login');
      const response = await http.get<{ itens: EmpresaLoginOption[] }>('/auth/empresas');
      setEmpresas(response.data.itens ?? []);
      const first = response.data.itens[0]?.id ?? '';
      setEmpresaSelecionadaId(first);
      if (first) localStorage.setItem(LOGIN_EMPRESA_KEY, first);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data?.message;
        setError(Array.isArray(payload) ? payload.join(' | ') : payload || 'Falha no primeiro acesso.');
      } else {
        setError('Falha no primeiro acesso.');
      }
    }
  }

  function handleSelectEmpresa(empresaId: string) {
    setEmpresaSelecionadaId(empresaId);
    localStorage.setItem(LOGIN_EMPRESA_KEY, empresaId);
  }

  return (
    <div className="auth-shell">
      {/* ── Hero (esquerda) ───────────────────────────────────── */}
      <section className="auth-hero">
        <div>
          {import.meta.env.VITE_BRAND_LOGO_URL ? (
            <img src={import.meta.env.VITE_BRAND_LOGO_URL as string} alt="Logo" className="auth-hero__brand-logo" />
          ) : (
            <div className="auth-hero__badge">Raccolto</div>
          )}
        </div>

        <div className="auth-hero__body">
          <h1>Gestão inteligente de clientes, contratos e projetos.</h1>
          <p>Tudo que sua equipe precisa para operar com agilidade — num só lugar, separado por empresa.</p>
          <div className="auth-hero__highlights">
            <div>
              <div>
                <strong>Contexto por empresa</strong>
                <span>Acesso já nasce segregado. Cada usuário vê apenas o que é seu.</span>
              </div>
            </div>
            <div>
              <div>
                <strong>Contratos e assinatura digital</strong>
                <span>Do rascunho à assinatura com integração Autentique.</span>
              </div>
            </div>
            <div>
              <div>
                <strong>Projetos e tarefas</strong>
                <span>Kanban, fases, entregáveis e documentos por projeto.</span>
              </div>
            </div>
          </div>
        </div>

        <p className="auth-hero__footer">© {new Date().getFullYear()} Raccolto · Todos os direitos reservados</p>
      </section>

      {/* ── Painel de login (direita) ─────────────────────────── */}
      <section className="auth-panel">
        <p className="auth-panel__title">Bem-vindo de volta</p>
        <p className="auth-panel__subtitle">
          {mode === 'login' ? 'Selecione a empresa e entre com seu acesso.' : 'Configure o ambiente inicial da plataforma.'}
        </p>

        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => setMode('login')}>
            Entrar
          </button>
          <button type="button" className={mode === 'bootstrap' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => setMode('bootstrap')}>
            Primeiro acesso
          </button>
        </div>

        {error ? <Feedback type="error" message={error} /> : null}
        {success ? <Feedback type="success" message={success} /> : null}

        {mode === 'login' ? (
          <>
            {/* Seleção de empresa */}
            <p className="auth-company-step">1 · Selecione a empresa</p>
            {loadingEmpresas ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Carregando...</p>
            ) : empresas.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Nenhuma empresa encontrada. Use o primeiro acesso.</p>
            ) : (
              <div className="company-picker-grid" style={{ marginBottom: 20 }}>
                {empresas.map((empresa) => (
                  <button
                    key={empresa.id}
                    type="button"
                    className={`company-picker-card${empresaSelecionadaId === empresa.id ? ' company-picker-card--active' : ''}`}
                    onClick={() => handleSelectEmpresa(empresa.id)}
                  >
                    <div className="company-picker-card__logo-wrap">
                      {empresa.logoUrl ? (
                        <img src={empresa.logoUrl} alt={empresa.nomeFantasia || empresa.nome} className="company-picker-card__logo" />
                      ) : (
                        <div className="company-picker-card__placeholder">{(empresa.nomeFantasia || empresa.nome).slice(0, 1).toUpperCase()}</div>
                      )}
                    </div>
                    <div>
                      <strong>{empresa.nomeFantasia || empresa.nome}</strong>
                      <span>{empresa.nome}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Formulário de login */}
            <p className="auth-company-step">2 · Acesse sua conta</p>
            <form onSubmit={handleLogin}>
              <div className="auth-field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((c) => ({ ...c, email: e.target.value }))}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="senha">Senha</label>
                <input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.senha}
                  onChange={(e) => setLoginForm((c) => ({ ...c, senha: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <button className="auth-submit" type="submit" disabled={loading || !empresaSelecionadaId}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleBootstrap}>
            <div className="auth-field">
              <label htmlFor="nome">Seu nome</label>
              <input id="nome" value={bootstrapForm.nome} onChange={(e) => setBootstrapForm((c) => ({ ...c, nome: e.target.value }))} />
            </div>
            <div className="auth-field">
              <label htmlFor="emailBootstrap">E-mail administrador</label>
              <input id="emailBootstrap" type="email" value={bootstrapForm.email} onChange={(e) => setBootstrapForm((c) => ({ ...c, email: e.target.value }))} />
            </div>
            <div className="auth-field">
              <label htmlFor="senhaBootstrap">Senha</label>
              <input id="senhaBootstrap" type="password" value={bootstrapForm.senha} onChange={(e) => setBootstrapForm((c) => ({ ...c, senha: e.target.value }))} />
            </div>
            <div className="auth-field">
              <label htmlFor="empresaNome">Nome da empresa</label>
              <input id="empresaNome" value={bootstrapForm.empresaNome} onChange={(e) => setBootstrapForm((c) => ({ ...c, empresaNome: e.target.value }))} />
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Criando ambiente...' : 'Criar primeiro acesso'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
