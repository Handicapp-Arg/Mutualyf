import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare, FileText, BarChart3, Users, Shield, Power, Bot, BookOpen,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

interface PortalLayoutProps {
  children: React.ReactNode;
  liveSessions?: number;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  permission: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Operaciones',
    items: [
      { path: '/portal/conversations', label: 'Conversaciones', icon: MessageSquare, permission: 'conversations:read' },
      { path: '/portal/uploads', label: 'Archivos', icon: FileText, permission: 'conversations:read' },
      { path: '/portal/stats', label: 'Estadisticas', icon: BarChart3, permission: 'sessions:read' },
    ],
  },
  {
    title: 'Asistente IA',
    items: [
      { path: '/portal/knowledge', label: 'Conocimiento', icon: BookOpen, permission: 'ai_config:manage' },
      { path: '/portal/ai-config', label: 'Configuracion', icon: Bot, permission: 'ai_config:manage' },
    ],
  },
  {
    title: 'Administracion',
    items: [
      { path: '/portal/users', label: 'Usuarios', icon: Users, permission: 'users:read' },
      { path: '/portal/roles', label: 'Roles y permisos', icon: Shield, permission: 'roles:read' },
    ],
  },
];

export function PortalLayout({ children, liveSessions = 0 }: PortalLayoutProps) {
  const { user, logout, hasPermission } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (item: NavItem) => location.pathname === item.path;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-corporate">
        <div className="px-5 py-5">
          <Link to="/" className="text-xl font-black tracking-wide text-white transition-opacity hover:opacity-80">
            MLyF
          </Link>
          <p className="mt-0.5 text-[10px] font-medium text-white/40">Panel de gestion</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => hasPermission(item.permission));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} className="mb-4">
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-white/30">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item);
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-white/15 text-white'
                            : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                        }`}
                      >
                        <item.icon size={16} />
                        {item.label}
                        {item.path === '/portal/conversations' && liveSessions > 0 && (
                          <span className="ml-auto flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <span className="text-[10px] font-bold text-emerald-300">{liveSessions}</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

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
              title="Cerrar sesion"
            >
              <Power size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
