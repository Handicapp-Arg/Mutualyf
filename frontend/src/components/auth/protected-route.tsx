import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

interface ProtectedRouteProps {
  requiredPermissions?: string[];
  requireAny?: boolean;
}

export function ProtectedRoute({ requiredPermissions, requireAny = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0 && user) {
    const hasAccess = requireAny
      ? requiredPermissions.some((p) => user.permissions.includes(p))
      : requiredPermissions.every((p) => user.permissions.includes(p));

    if (!hasAccess) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-950 text-white">
          <h1 className="text-4xl font-bold">403</h1>
          <p className="mt-2 text-gray-400">No tiene permisos para acceder a esta sección</p>
          <a href="/portal" className="mt-4 text-cyan-400 hover:underline">
            Volver al portal
          </a>
        </div>
      );
    }
  }

  return <Outlet />;
}
