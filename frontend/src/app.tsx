import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages';
import { LoginPage } from '@/pages/login';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PortalDashboard } from '@/pages/portal/dashboard';
import { UserManagement } from '@/pages/portal/user-management';
import { PermissionMatrix } from '@/pages/portal/permission-matrix';
import { AiConfig } from '@/pages/portal/ai-config';
import { useAuthStore } from '@/stores/auth.store';

export function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Redirect legacy /admin */}
        <Route path="/admin" element={<Navigate to="/portal/dashboard" replace />} />

        {/* Rutas protegidas del portal */}
        <Route path="/portal" element={<ProtectedRoute />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PortalDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="roles" element={<PermissionMatrix />} />
          <Route path="ai-config" element={<AiConfig />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
