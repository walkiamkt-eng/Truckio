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
   * Obtiene todos los usuarios pertenecientes al tenant_id del usuario actual
   */
  public static async getTenantUsers(tenantId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
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
   * Crea un perfil de usuario asociado al tenant sin interferir con la sesión actual
   */
  public static async createUser(tenantId: string, userData: CreateUserData): Promise<void> {
    const userId = crypto.randomUUID();

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      tenant_id: tenantId,
      full_name: userData.full_name,
      role: userData.role,
      email: userData.email,
      phone: userData.phone || null,
    });

    if (profileError) {
      console.error('Error al insertar perfil:', profileError.message);
      throw profileError;
    }
  }

  /**
   * Actualiza el rol de un usuario
   */
  public static async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Elimina un perfil de usuario
   */
  public static async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }
}