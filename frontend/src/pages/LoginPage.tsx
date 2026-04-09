import { FormEvent, useEffect, useMemo, useState } from 'react';
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
    email: 'admin@raccolto.com',
    senha: '123456',
  });

  const [bootstrapForm, setBootstrapForm] = useState({
    nome: 'Gino',
    email: 'admin@raccolto.com',
    senha: '123456',
    empresaNome: 'Raccolto',
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

  const empresaSelecionada = empresas.find((item) => item.id === empresaSelecionadaId) ?? null;

  const heroText = useMemo(
    () =>
      mode === 'login'
        ? 'Selecione a empresa primeiro e depois entre com seu usuário. O acesso é validado dentro do contexto empresarial escolhido.'
        : 'Use o primeiro acesso apenas quando o banco estiver vazio para criar a empresa inicial e o usuário administrador.',
    [mode],
  );

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
      <section className="auth-hero">
        <div className="auth-hero__badge">Raccolto Web</div>
        <h1>Selecione a empresa antes do login e acesse o ambiente correto.</h1>
        <p>{heroText}</p>
        <div className="auth-hero__highlights">
          <div>
            <strong>Empresa primeiro</strong>
            <span>O acesso já nasce no contexto correto e segregado por empresa.</span>
          </div>
          <div>
            <strong>Segurança</strong>
            <span>Usuários só entram nas empresas às quais estão vinculados.</span>
          </div>
          <div>
            <strong>Operação</strong>
            <span>Clientes, contratos, projetos e notificações dentro da empresa certa.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === 'bootstrap' ? 'auth-tab auth-tab--active' : 'auth-tab'}
            onClick={() => setMode('bootstrap')}
          >
            Primeiro acesso
          </button>
        </div>

        {error ? <Feedback type="error" message={error} /> : null}
        {success ? <Feedback type="success" message={success} /> : null}

        {mode === 'login' ? (
          <div className="compact-gap">
            <div className="panel compact-gap">
              <div className="panel__header">
                <h3>1. Selecione a empresa</h3>
                <p>Escolha a empresa para abrir o contexto correto antes do login.</p>
              </div>
              {loadingEmpresas ? <p className="muted">Carregando empresas...</p> : null}
              {!loadingEmpresas && empresas.length === 0 ? (
                <p className="muted">Nenhuma empresa encontrada. Use o primeiro acesso para criar a empresa inicial.</p>
              ) : null}
              <div className="company-picker-grid">
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
            </div>

            <form className="panel form-grid" onSubmit={handleLogin}>
              <div className="panel__header">
                <h3>2. Entre na empresa selecionada</h3>
                <p>{empresaSelecionada ? `Acesso para ${empresaSelecionada.nomeFantasia || empresaSelecionada.nome}.` : 'Escolha a empresa acima para continuar.'}</p>
              </div>

              <div className="field">
                <label>Empresa selecionada</label>
                <input value={empresaSelecionada ? empresaSelecionada.nomeFantasia || empresaSelecionada.nome : 'Nenhuma empresa selecionada'} disabled />
              </div>

              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="admin@raccolto.com"
                />
              </div>

              <div className="field">
                <label htmlFor="senha">Senha</label>
                <input
                  id="senha"
                  type="password"
                  value={loginForm.senha}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, senha: event.target.value }))
                  }
                  placeholder="••••••"
                />
              </div>

              <button className="button" type="submit" disabled={loading || !empresaSelecionadaId}>
                {loading ? 'Entrando...' : 'Entrar no Raccolto'}
              </button>
            </form>
          </div>
        ) : (
          <form className="panel form-grid" onSubmit={handleBootstrap}>
            <div className="field">
              <label htmlFor="nome">Seu nome</label>
              <input
                id="nome"
                value={bootstrapForm.nome}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, nome: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="emailBootstrap">E-mail administrador</label>
              <input
                id="emailBootstrap"
                value={bootstrapForm.email}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="senhaBootstrap">Senha</label>
              <input
                id="senhaBootstrap"
                type="password"
                value={bootstrapForm.senha}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, senha: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="empresaNome">Nome da empresa</label>
              <input
                id="empresaNome"
                value={bootstrapForm.empresaNome}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, empresaNome: event.target.value }))
                }
              />
            </div>

            <button className="button" type="submit" disabled={loading}>
              {loading ? 'Criando ambiente...' : 'Criar primeiro acesso'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
