import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { http } from '../api/http';
import type { LoginResponse, UsuarioAutenticado } from '../types/auth';

interface LoginInput {
  empresaId: string;
  email: string;
  senha: string;
}

interface BootstrapInput {
  nome: string;
  email: string;
  senha: string;
  empresaNome: string;
}

interface AuthContextValue {
  user: UsuarioAutenticado | null;
  token: string | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  bootstrap: (input: BootstrapInput) => Promise<string>;
  switchCompany: (empresaId: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'raccolto_token';
const USER_KEY = 'raccolto_user';
const LOGIN_EMPRESA_KEY = 'raccolto_login_empresa';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UsuarioAutenticado | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UsuarioAutenticado) : null;
  });
  const [loading, setLoading] = useState(false);

  const persistSession = useCallback((authToken: string, authUser: UsuarioAutenticado) => {
    localStorage.setItem(TOKEN_KEY, authToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    if (authUser.empresaId) {
      localStorage.setItem(LOGIN_EMPRESA_KEY, authUser.empresaId);
    }
    setToken(authToken);
    setUser(authUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      clearSession();
      return;
    }

    try {
      const response = await http.get<UsuarioAutenticado>('/auth/me');
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));
      if (response.data.empresaId) {
        localStorage.setItem(LOGIN_EMPRESA_KEY, response.data.empresaId);
      }
      setUser(response.data);
      setToken(storedToken);
    } catch {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    if (token && !user) {
      void refreshMe();
    }
  }, [token, user, refreshMe]);

  const login = useCallback(
    async (input: LoginInput) => {
      setLoading(true);
      try {
        const response = await http.post<LoginResponse>('/auth/login', input);
        persistSession(response.data.accessToken, response.data.user);
      } finally {
        setLoading(false);
      }
    },
    [persistSession],
  );

  const bootstrap = useCallback(async (input: BootstrapInput) => {
    setLoading(true);
    try {
      const response = await http.post<{ message: string }>('/auth/bootstrap', input);
      return response.data.message;
    } finally {
      setLoading(false);
    }
  }, []);

  const switchCompany = useCallback(
    async (empresaId: string) => {
      setLoading(true);
      try {
        const response = await http.post<LoginResponse>('/auth/trocar-empresa', { empresaId });
        persistSession(response.data.accessToken, response.data.user);
      } finally {
        setLoading(false);
      }
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      bootstrap,
      switchCompany,
      logout,
      refreshMe,
    }),
    [user, token, loading, login, bootstrap, switchCompany, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
