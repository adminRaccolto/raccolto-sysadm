import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Archive,
  BarChart3,
  Bell,
  Briefcase,
  Car,
  ChevronDown,
  FileSignature,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Megaphone,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { http } from '../api/http';
import type { Notificacao, NotificacoesResponse } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/format';

type MenuItem = { to: string; label: string; Icon: React.ElementType };
type MenuGroup = { label: string; Icon: React.ElementType; items: MenuItem[] };
type NavEntry = { type: 'link' } & MenuItem | { type: 'group' } & MenuGroup;

const navEntries: NavEntry[] = [
  { type: 'link',  to: '/dashboard', label: 'Início', Icon: LayoutDashboard },
  {
    type: 'group', label: 'Comercial', Icon: FileSignature,
    items: [
      { to: '/clientes',          label: 'Clientes',   Icon: Users },
      { to: '/produtos-servicos', label: 'Produtos',   Icon: Package },
      { to: '/propostas',         label: 'Propostas',  Icon: FileText },
      { to: '/contratos',         label: 'Contratos',  Icon: FileSignature },
      { to: '/crm',               label: 'CRM',        Icon: Target },
      { to: '/captacao',          label: 'Captação',   Icon: Megaphone },
    ],
  },
  {
    type: 'group', label: 'Operacional', Icon: Briefcase,
    items: [
      { to: '/projetos',       label: 'Projetos',       Icon: Briefcase },
      { to: '/deslocamentos',  label: 'Deslocamentos',  Icon: Car },
      { to: '/modelos',        label: 'Modelos',        Icon: FolderOpen },
      { to: '/repositorio',    label: 'Repositório',    Icon: Archive },
    ],
  },
  {
    type: 'group', label: 'Financeiro', Icon: Wallet,
    items: [
      { to: '/faturamento', label: 'Faturamento', Icon: Receipt },
      { to: '/financeiro',  label: 'Financeiro',  Icon: Wallet },
    ],
  },
  { type: 'link', to: '/bi',         label: 'BI',      Icon: BarChart3 },
  { type: 'link', to: '/sistema',    label: 'Sistema', Icon: Settings },
  { type: 'link', to: '/aprendizado',label: 'Aprenda', Icon: GraduationCap },
];

export default function ProtectedLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [groupPos, setGroupPos] = useState<{ top: number; left: number } | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const empresaNome = useMemo(() => user?.empresa?.nomeFantasia || user?.empresa?.nome || 'Raccolto', [user]);
  const primeiroNome = useMemo(() => user?.nome?.split(' ')[0] || '', [user]);

  async function loadNotificacoes() {
    try {
      const response = await http.get<NotificacoesResponse>('/notificacoes');
      setNotificacoes(response.data.itens);
      setNaoLidas(response.data.naoLidas);
    } catch {
      setNotificacoes([]);
      setNaoLidas(0);
    }
  }

  useEffect(() => {
    void loadNotificacoes();
    const interval = window.setInterval(() => void loadNotificacoes(), 12000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => { void loadNotificacoes(); }, [location.pathname]);

  // Close all dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (navRef.current && !navRef.current.contains(e.target as Node)) { setOpenGroup(null); setGroupPos(null); }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close group dropdown on route change
  useEffect(() => { setOpenGroup(null); setGroupPos(null); }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleOpenNotification(item: Notificacao) {
    if (!item.lida) {
      await http.patch(`/notificacoes/${item.id}/lida`);
      await loadNotificacoes();
    }
    if (item.link) navigate(item.link);
    setNotifOpen(false);
  }

  function isGroupActive(group: MenuGroup) {
    return group.items.some((item) => location.pathname.startsWith(item.to));
  }

  return (
    <div className="shell">
      <div className="watermark" aria-hidden="true" />
      <header className="topnav">
        {/* Brand */}
        <div className="topnav__brand">
          {user?.empresa?.logoUrl ? (
            <img src={user.empresa.logoUrl} alt={empresaNome} className="topnav__logo" />
          ) : (
            <div className="topnav__logo-placeholder">
              {empresaNome.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="topnav__brand-name">{empresaNome}</span>
        </div>

        {/* Navigation */}
        <nav className="topnav__nav" ref={navRef}>
          {navEntries.map((entry) => {
            if (entry.type === 'link') {
              return (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  title={entry.label}
                  className={({ isActive }) => `topnav__link${isActive ? ' topnav__link--active' : ''}`}
                >
                  <entry.Icon size={16} strokeWidth={2} />
                  <span>{entry.label}</span>
                </NavLink>
              );
            }

            const group = entry as MenuGroup & { type: 'group' };
            const active = isGroupActive(group);
            const open = openGroup === group.label;

            return (
              <div key={group.label} className="topnav__group">
                <button
                  type="button"
                  className={`topnav__link topnav__link--group${active ? ' topnav__link--active' : ''}`}
                  onClick={(e) => {
                    if (open) {
                      setOpenGroup(null);
                      setGroupPos(null);
                    } else {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setGroupPos({ top: rect.bottom + 6, left: rect.left });
                      setOpenGroup(group.label);
                    }
                  }}
                >
                  <group.Icon size={16} strokeWidth={2} />
                  <span>{group.label}</span>
                  <ChevronDown size={12} strokeWidth={2} className={`topnav__chevron${open ? ' topnav__chevron--open' : ''}`} />
                </button>
                {open && groupPos && (
                  <div className="topnav__group-panel" style={{ top: groupPos.top, left: groupPos.left }}>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `topnav__group-item${isActive ? ' topnav__group-item--active' : ''}`}
                      >
                        <item.Icon size={14} strokeWidth={2} />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="topnav__actions">
          {/* Notifications */}
          <div className="topnav__dropdown" ref={notifRef}>
            <button
              className={`topnav__icon-btn${naoLidas > 0 ? ' topnav__icon-btn--alert' : ''}`}
              onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
              title="Notificações"
            >
              <Bell size={18} strokeWidth={2} />
              {naoLidas > 0 && <span className="topnav__badge">{naoLidas}</span>}
            </button>
            {notifOpen && (
              <div className="topnav__dropdown-panel notif-panel">
                <div className="notif-panel__header">
                  <strong>Notificações</strong>
                  {naoLidas > 0 && <span className="topnav__badge topnav__badge--inline">{naoLidas} nova{naoLidas > 1 ? 's' : ''}</span>}
                </div>
                <div className="notif-panel__list">
                  {notificacoes.length === 0
                    ? <p className="notif-panel__empty">Nenhuma notificação.</p>
                    : notificacoes.map((item) => (
                      <button
                        key={item.id}
                        className={`notif-item${item.lida ? '' : ' notif-item--unread'}`}
                        onClick={() => void handleOpenNotification(item)}
                      >
                        <strong>{item.titulo}</strong>
                        <span>{item.mensagem}</span>
                        <small>{formatDate(item.createdAt)}</small>
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="topnav__dropdown" ref={userRef}>
            <button
              className="topnav__user-btn"
              onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
            >
              <div className="topnav__avatar">{primeiroNome.slice(0, 1).toUpperCase()}</div>
              <span className="topnav__user-name">{primeiroNome}</span>
              <ChevronDown size={14} strokeWidth={2} className={`topnav__chevron${userOpen ? ' topnav__chevron--open' : ''}`} />
            </button>
            {userOpen && (
              <div className="topnav__dropdown-panel user-panel">
                <div className="user-panel__info">
                  <strong>{user?.nome}</strong>
                  <span>{user?.email}</span>
                  <small>{user?.perfilAcessoAtual?.nome || user?.perfil}</small>
                </div>
                <div className="user-panel__divider" />
                <button className="user-panel__logout" onClick={handleLogout}>
                  <LogOut size={15} strokeWidth={2} />
                  Encerrar sessão
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
