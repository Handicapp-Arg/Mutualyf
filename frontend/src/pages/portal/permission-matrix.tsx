import { useState, useEffect, useMemo } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { PortalLayout } from '@/components/portal/portal-layout';

interface Role {
  id: number;
  name: string;
  displayName: string;
  isSystem: boolean;
}

interface Permission {
  id: number;
  code: string;
  displayName: string;
  module: string;
}

interface Grant {
  roleId: number;
  permissionId: number;
  granted: boolean;
}

export function PermissionMatrix() {
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission('roles:manage');

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [originalGrants, setOriginalGrants] = useState<Grant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', displayName: '', description: '' });

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/roles/matrix');
      setRoles(res.data.roles);
      setPermissions(res.data.permissions);
      setGrants(res.data.grants);
      setOriginalGrants(JSON.parse(JSON.stringify(res.data.grants)));
    } catch (err) {
      console.error('Error cargando matriz:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const modules = useMemo(() => {
    const moduleMap = new Map<string, Permission[]>();
    permissions.forEach((p) => {
      const existing = moduleMap.get(p.module) || [];
      moduleMap.set(p.module, [...existing, p]);
    });
    return Array.from(moduleMap.entries());
  }, [permissions]);

  const getGrant = (roleId: number, permissionId: number): boolean => {
    const grant = grants.find((g) => g.roleId === roleId && g.permissionId === permissionId);
    return grant?.granted ?? false;
  };

  const toggleGrant = (roleId: number, permissionId: number) => {
    setGrants((prev) => {
      const idx = prev.findIndex((g) => g.roleId === roleId && g.permissionId === permissionId);
      if (idx >= 0) {
        return prev.map((g, i) => (i === idx ? { ...g, granted: !g.granted } : g));
      }
      return [...prev, { roleId, permissionId, granted: true }];
    });
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(grants) !== JSON.stringify(originalGrants);
  }, [grants, originalGrants]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Enviar solo los cambios
      const changedGrants = grants.filter((g) => {
        const original = originalGrants.find(
          (o) => o.roleId === g.roleId && o.permissionId === g.permissionId
        );
        return !original || original.granted !== g.granted;
      });

      // Incluir grants nuevos que no existian
      const allGrants = [...changedGrants];

      if (allGrants.length > 0) {
        // Enviar solo roleId, permissionId, granted (sin id ni campos extra)
        const cleanGrants = allGrants.map(({ roleId, permissionId, granted }) => ({
          roleId,
          permissionId,
          granted,
        }));
        await apiClient.put('/roles/matrix', { grants: cleanGrants });
      }

      setOriginalGrants(JSON.parse(JSON.stringify(grants)));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/roles', newRole);
      setShowNewRole(false);
      setNewRole({ name: '', displayName: '', description: '' });
      loadMatrix();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear rol');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm('Seguro que desea eliminar este rol?')) return;
    try {
      await apiClient.delete(`/roles/${roleId}`);
      loadMatrix();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const moduleLabels: Record<string, string> = {
    conversations: 'Conversaciones',
    sessions: 'Sesiones',
    uploads: 'Ordenes Medicas',
    users: 'Usuarios',
    roles: 'Roles y Permisos',
  };

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-slate-800">Roles y Permisos</h1>
        <div className="flex items-center gap-2">
          {canManage && (
            <button onClick={() => setShowNewRole(true)}
              className="flex items-center gap-2 rounded-lg bg-corporate px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-corporate/90">
              <Plus size={15} />Nuevo Rol
            </button>
          )}
          {canManage && hasChanges && (
            <button onClick={handleSave} disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-corporate px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-corporate/90 disabled:opacity-50">
              <Save size={15} />{isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </div>

      {/* Matrix */}
      <div className="px-6 py-6">
        {hasChanges && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            Hay cambios sin guardar
          </div>
        )}

        <div className="rounded-xl border bg-white p-6">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 pr-6 text-left text-xs font-bold uppercase text-slate-500">Permiso</th>
                    {roles.map((role) => (
                      <th key={role.id} className="px-4 pb-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            role.name === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {role.displayName}
                          </span>
                          {canManage && !role.isSystem && (
                            <button onClick={() => handleDeleteRole(role.id)}
                              className="text-red-400 hover:text-red-600" title="Eliminar rol">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map(([module, perms]) => (
                    <>
                      <tr key={`header-${module}`}>
                        <td colSpan={roles.length + 1} className="pb-1 pt-4 text-xs font-black uppercase text-corporate">
                          {moduleLabels[module] || module}
                        </td>
                      </tr>
                      {perms.map((perm) => (
                        <tr key={perm.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 pr-6">
                            <div>
                              <p className="font-medium text-slate-700">{perm.displayName}</p>
                              <p className="text-xs text-slate-400">{perm.code}</p>
                            </div>
                          </td>
                          {roles.map((role) => (
                            <td key={`${role.id}-${perm.id}`} className="px-4 py-2.5 text-center">
                              <label className="inline-flex cursor-pointer items-center">
                                <input
                                  type="checkbox"
                                  checked={getGrant(role.id, perm.id)}
                                  onChange={() => canManage && toggleGrant(role.id, perm.id)}
                                  disabled={!canManage}
                                  className="h-4 w-4 rounded border-slate-300 text-corporate accent-corporate focus:ring-corporate disabled:opacity-50"
                                />
                              </label>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Role Modal */}
      {showNewRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNewRole(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-black text-slate-800">Nuevo Rol</h2>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Identificador (sin espacios)</label>
                <input type="text" required value={newRole.name}
                  onChange={(e) => setNewRole((r) => ({ ...r, name: e.target.value.toLowerCase().replace(/\s/g, '-') }))}
                  placeholder="ej: supervisor"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-corporate focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Nombre para mostrar</label>
                <input type="text" required value={newRole.displayName}
                  onChange={(e) => setNewRole((r) => ({ ...r, displayName: e.target.value }))}
                  placeholder="ej: Supervisor"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-corporate focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Descripcion (opcional)</label>
                <input type="text" value={newRole.description}
                  onChange={(e) => setNewRole((r) => ({ ...r, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-corporate focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewRole(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="rounded-lg bg-corporate px-4 py-2 text-sm font-bold text-white hover:bg-corporate/90">
                  Crear Rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
