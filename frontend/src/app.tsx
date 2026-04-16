import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages';
import { LoginPage } from '@/pages/login';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuthStore } from '@/stores/auth.store';

const Conversations = lazy(() =>
  import('@/pages/portal/conversations').then((m) => ({ default: m.Conversations })),
);
const Uploads = lazy(() =>
  import('@/pages/portal/uploads').then((m) => ({ default: m.Uploads })),
);
const StatsPage = lazy(() =>
  import('@/pages/portal/stats').then((m) => ({ default: m.Stats })),
);
const UserManagement = lazy(() =>
  import('@/pages/portal/user-management').then((m) => ({ default: m.UserManagement })),
);
const PermissionMatrix = lazy(() =>
  import('@/pages/portal/permission-matrix').then((m) => ({ default: m.PermissionMatrix })),
);
const AiConfig = lazy(() =>
  import('@/pages/portal/ai-config').then((m) => ({ default: m.AiConfig })),
);
const Knowledge = lazy(() =>
  import('@/pages/portal/knowledge').then((m) => ({ default: m.Knowledge })),
);

function PortalFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
    </div>
  );
}

export function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Rutas publicas */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Redirects legacy */}
          <Route path="/admin" element={<Navigate to="/portal/conversations" replace />} />

          {/* Rutas protegidas del portal */}
          <Route path="/portal" element={<ProtectedRoute />}>
            <Route index element={<Navigate to="conversations" replace />} />
            <Route path="conversations" element={<Suspense fallback={<PortalFallback />}><Conversations /></Suspense>} />
            <Route path="uploads" element={<Suspense fallback={<PortalFallback />}><Uploads /></Suspense>} />
            <Route path="stats" element={<Suspense fallback={<PortalFallback />}><StatsPage /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<PortalFallback />}><UserManagement /></Suspense>} />
            <Route path="roles" element={<Suspense fallback={<PortalFallback />}><PermissionMatrix /></Suspense>} />
            <Route path="ai-config" element={<Suspense fallback={<PortalFallback />}><AiConfig /></Suspense>} />
            <Route path="knowledge" element={<Suspense fallback={<PortalFallback />}><Knowledge /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
