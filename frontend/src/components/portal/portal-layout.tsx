import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, TrendingUp, Users, Shield, Power, Bot } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

interface PortalLayoutProps {
  children: React.ReactNode;
  liveSessions?: number;
}

const navItems = [
  { path: '/portal/dashboard', label: 'Conversaciones', icon: MessageSquare, tab: 'conversations', permission: 'conversations:read' },
  { path: '/portal/dashboard', label: 'Ordenes', icon: FileText, tab: 'uploads', permission: 'uploads:read' },
  { path: '/portal/dashboard', label: 'Estadisticas', icon: TrendingUp, tab: 'stats', permission: 'sessions:read' },
  { path: '/portal/users', label: 'Usuarios', icon: Users, permission: 'users:read' },
  { path: '/portal/roles', label: 'Roles', icon: Shield, permission: 'roles:read' },
  { path: '/portal/ai-config', label: 'Config IA', icon: Bot, permission: 'ai_config:manage' },
];

export function PortalLayout({ children, liveSessions = 0 }: PortalLayoutProps) {
  const { user, logout, hasPermission } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.tab) {
      // Dashboard tabs: activo si estamos en dashboard y el tab coincide con el hash
      return location.pathname === '/portal/dashboard' && location.search === `?tab=${item.tab}`;
    }
    return location.pathname === item.path;
  };

  // Si estamos en dashboard sin tab, marcar conversaciones como default
  const isActiveResolved = (item: typeof navItems[0]) => {
    if (item.tab === 'conversations' && location.pathname === '/portal/dashboard' && !location.search) {
      return true;
    }
    return isActive(item);
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.tab) {
      navigate(`/portal/dashboard?tab=${item.tab}`);
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-corporate">
        {/* Logo */}
        <div className="px-5 py-5">
          <Link to="/" className="text-xl font-black tracking-wide text-white transition-opacity hover:opacity-80">
            CIOR
          </Link>
          <p className="mt-0.5 text-[10px] font-medium text-white/40">Panel de gestion</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map((item) => {
            if (!hasPermission(item.permission)) return null;
            const active = isActiveResolved(item);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                }`}
              >
                <item.icon size={16} />
                {item.label}
                {item.tab === 'conversations' && liveSessions > 0 && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300">{liveSessions}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Usuario */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold text-white">{user?.fullName}</p>
              <p className="text-[10px] text-white/50">{user?.role.displayName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              title="Cerrar sesión"
            >
              <Power size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
