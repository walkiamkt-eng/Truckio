import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types/truckio';

export interface CreateUserData {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export class UserService {
  /**
   * Obtiene todos los usuarios pertenecientes al tenant_id del usuario actual directamente desde Supabase.
   */
  public static async getTenantUsers(tenantId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error al obtener los usuarios del tenant:', error.message);
      throw error;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    return (data || []).map((p) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      email: p.email || (p.id === authUser?.id ? authUser?.email : '') || '',
      full_name: p.full_name,
      role: p.role,
      phone: p.phone,
    }));
  }

  /**
   * Crea un usuario asociado al tenant utilizando la función segura RPC del backend,
   * evitando que la sesión actual del administrador se cierre o sea reemplazada.
   */
  public static async createUser(tenantId: string, userData: CreateUserData): Promise<void> {
    const initialPassword = userData.password && userData.password.trim().length >= 6 
      ? userData.password.trim() 
      : 'Truckio2026*';

    // Llamada a la función RPC segura en Supabase (admin_create_user)
    const { error: rpcError } = await supabase.rpc('admin_create_user', {
      email: userData.email.trim(),
      password: initialPassword,
      full_name: userData.full_name.trim(),
      tenant_id: tenantId,
      role: userData.role,
      phone: userData.phone?.trim() || null,
    });

    if (rpcError) {
      console.error('Error al crear el usuario mediante RPC:', rpcError.message);
      throw new Error(rpcError.message || 'No se pudo crear el usuario.');
    }
  }

  /**
   * Actualiza el rol de un usuario
   */
  public static async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Elimina un usuario de public.users
   */
  public static async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }
}