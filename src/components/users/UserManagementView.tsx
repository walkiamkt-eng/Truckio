import React, { useState, useEffect } from 'react';
import { Users, UserPlus, RefreshCw, AlertCircle, CheckCircle2, Trash2, Pencil, Lock } from 'lucide-react';
import { UserService, CreateUserData } from '../../services/userService';
import { supabase } from '../../lib/supabase';
import type { User, UserRole } from '../../types/truckio';

interface UserManagementViewProps {
  currentUser: User;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Formulario Nuevo Usuario
  const [createFormData, setCreateFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    full_name: '',
    role: 'driver',
    phone: '',
  });

  // Formulario Edición de Usuario
  const [editRole, setEditRole] = useState<UserRole>('driver');
  const [editFullName, setEditFullName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await UserService.getTenantUsers(currentUser.tenant_id);
      setUsers(data);
    } catch (err: any) {
      setError('Error al cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser.tenant_id]);

  // Crear Usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      await UserService.createUser(currentUser.tenant_id, createFormData);
      setSuccessMsg(`Usuario ${createFormData.full_name} registrado correctamente.`);
      setIsCreateModalOpen(false);
      setCreateFormData({ email: '', password: '', full_name: '', role: 'driver', phone: '' });
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Error al crear el usuario.');
    }
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditRole(userToEdit.role);
    setEditFullName(userToEdit.full_name || '');
    setAdminPassword('');
    setError(null);
  };

  // Confirmar Edición de Usuario verificando la contraseña del Admin
  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    setSuccessMsg(null);
    setIsSubmittingEdit(true);

    try {
      // 1. Validar la contraseña actual del administrador re-autenticándolo en Supabase
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: adminPassword,
      });

      if (authError) {
        throw new Error('Contraseña de administrador incorrecta. No se realizaron cambios.');
      }

      // 2. Si la clave es correcta, aplicar el cambio de rol/datos
      await UserService.updateUserRole(editingUser.id, editRole);
      
      setSuccessMsg(`Usuario ${editingUser.full_name} actualizado correctamente.`);
      setEditingUser(null);
      setAdminPassword('');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el usuario.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Eliminar Usuario
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${name}"?`)) return;
    try {
      await UserService.deleteUser(userId);
      setSuccessMsg(`Usuario ${name} eliminado.`);
      await loadUsers();
    } catch (err: any) {
      setError('Error al eliminar el usuario.');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-500/20 text-purple-300 text-xs font-semibold px-2.5 py-1 rounded border border-purple-500/30">Administrador</span>;
      case 'fleet_manager':
        return <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded border border-amber-500/30">Gerente de Flota</span>;
      case 'driver':
        return <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded border border-emerald-500/30">Chofer</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded">{role}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 font-mono">
            <Users className="w-7 h-7 text-amber-400" />
            Gestión de Personal
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra los usuarios y roles asignados a tu empresa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Recargar usuarios"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-amber-500/20"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {/* Tabla de Usuarios */}
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-2" />
            Cargando personal...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No hay usuarios registrados en esta empresa.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Contacto / Email</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center">
                        {u.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-white">{u.full_name}</div>
                        {u.id === currentUser.id && (
                          <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono border border-slate-700">Tú (Sesión actual)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300">{u.email || 'Sin correo registrado'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botón de Editar con Lápiz */}
                        {isAdmin && u.id !== currentUser.id && (
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
                            title="Editar usuario / Cambiar rol"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {/* Botón de Eliminar */}
                        {isAdmin && u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Crear Usuario */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Registrar Nuevo Personal
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={createFormData.full_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, full_name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                  className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Contraseña Inicial (Opcional)</label>
                <input
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  placeholder="Dejar en blanco para Google Sign-In"
                  className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Rol en la Empresa</label>
                <select
                  value={createFormData.role}
                  onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="driver">Chofer</option>
                  <option value="fleet_manager">Gerente de Flota</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2.5 text-sm text-slate-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition">Guardar Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Usuario y Requerir Clave de Admin */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <Pencil className="w-5 h-5 text-amber-400" />
                Modificar Usuario
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Usuario</label>
                <input
                  type="text"
                  disabled
                  value={editingUser.full_name || editingUser.email}
                  className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-3.5 py-2.5 text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Nuevo Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="driver">Chofer</option>
                  <option value="fleet_manager">Gerente de Flota</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Confirmación con Contraseña del Administrador */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Confirmación de Seguridad
                </label>
                <p className="text-xs text-slate-400">
                  Ingresa tu contraseña de administrador para autorizar los cambios:
                </p>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="w-full bg-slate-950 border border-amber-500/40 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || !adminPassword}
                  className="px-5 py-2.5 text-sm bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition"
                >
                  {isSubmittingEdit ? 'Guardando...' : 'Confirmar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};