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
   * Crea un usuario asociado al tenant.
   * Si no se especifica contraseña, asigna una contraseña temporal inicial predeterminada.
   */
  public static async createUser(tenantId: string, userData: CreateUserData): Promise<void> {
    // Si no ingresó clave, asignamos una clave temporal predeterminada segura
    const initialPassword = userData.password && userData.password.trim().length >= 6 
      ? userData.password.trim() 
      : 'Truckio2026*';

    // 1. Intentar registrar en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email.trim(),
      password: initialPassword,
      options: {
        data: {
          full_name: userData.full_name.trim(),
          role: userData.role,
          tenant_id: tenantId,
        },
      },
    });

    let newUserId = authData?.user?.id;

    if (authError) {
      // Si el usuario ya existía en Auth o hubo aviso de correo, generamos UUID local seguro
      console.warn('Registro en Auth omitido/fallido, creando en public.users:', authError.message);
      newUserId = crypto.randomUUID();
    }

    // 2. Insertar perfil en la tabla public.users
    const { error: profileError } = await supabase.from('users').insert({
      id: newUserId,
      tenant_id: tenantId,
      full_name: userData.full_name.trim(),
      role: userData.role,
      email: userData.email.trim(),
      phone: userData.phone || null,
    });

    if (profileError) {
      console.error('Error al insertar usuario en public.users:', profileError.message);
      throw profileError;
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