import { useState, useEffect } from 'react';
import { Plus, Power, Edit2, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { PortalLayout } from '@/components/portal/portal-layout';

interface Role {
  id: number;
  name: string;
  displayName: string;
}

interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: Role;
}

export function UserManagement() {
  const { user: currentUser, hasPermission } = useAuthStore();
  const canManage = hasPermission('users:manage');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form state
  const [form, setForm] = useState({ email: '', password: '', fullName: '', roleId: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get('/admin-users'),
        apiClient.get('/roles'),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const data: any = { fullName: form.fullName, email: form.email, roleId: form.roleId };
        if (form.password) data.password = form.password;
        await apiClient.put(`/admin-users/${editingUser.id}`, data);
      } else {
        await apiClient.post('/admin-users', form);
      }
      setShowModal(false);
      setEditingUser(null);
      setForm({ email: '', password: '', fullName: '', roleId: roles[0]?.id || 0 });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar');
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      await apiClient.patch(`/admin-users/${userId}/toggle-active`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ email: '', password: '', fullName: '', roleId: roles[0]?.id || 0 });
    setShowModal(true);
  };

  const openEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setForm({ email: u.email, password: '', fullName: u.fullName, roleId: u.role.id });
    setShowModal(true);
  };

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-slate-800">Gestion de Usuarios</h1>
        {canManage && (
          <button onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-corporate px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-corporate/90">
            <Plus size={15} />Nuevo Usuario
          </button>
        )}
      </div>

      {/* Table */}
      <div className="px-6 py-6">
        <div className="rounded-xl border bg-white p-6">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs font-bold uppercase text-slate-500">
                  <th className="pb-3 pr-4">Nombre</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Rol</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3 pr-4">Ultimo Login</th>
                  {canManage && <th className="pb-3">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-700">{u.fullName}</td>
                    <td className="py-3 pr-4 text-slate-500">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        u.role.name === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        <Shield size={10} />{u.role.displayName}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-400">{formatDate(u.lastLoginAt)}</td>
                    {canManage && (
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(u)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50" title="Editar">
                            <Edit2 size={14} />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button onClick={() => handleToggleActive(u.id)}
                              className={`rounded-lg border p-1.5 ${
                                u.isActive ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-500 hover:bg-green-50'
                              }`} title={u.isActive ? 'Desactivar' : 'Activar'}>
                              <Power size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No hay usuarios</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-black text-slate-800">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Nombre completo</label>
                <input type="text" required value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-corporate focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
                <input type="email" required value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-corporate focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Contrasena {editingUser && '(dejar vacio para no cambiar)'}
                </label>
                <input type="password" value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  minLength={editingUser ? 0 : 8}
                  required={!editingUser}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-corporate focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Rol</label>
                <select value={form.roleId}
                  onChange={(e) => setForm((f) => ({ ...f, roleId: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-corporate focus:outline-none">
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="rounded-lg bg-corporate px-4 py-2 text-sm font-bold text-white hover:bg-corporate/90">
                  {editingUser ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
