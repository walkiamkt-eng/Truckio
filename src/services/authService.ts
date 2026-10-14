import { supabase } from '../lib/supabase';
import type { User } from '../types/truckio';

export class AuthService {
  // Iniciar sesión con email y contraseña
  public static async signIn(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) return null;

    return await AuthService.getCurrentProfile();
  }

  // Cerrar sesión
  public static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Obtener usuario/perfil actual desde Supabase Auth + tabla users
  public static async getCurrentProfile(): Promise<User | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error al consultar la tabla users:', profileError.message);
    }

    // Extraer el nombre de la empresa desde los metadatos de registro de Supabase Auth
    const companyName = user.user_metadata?.company_name || 'Mi Empresa de Transporte';

    return {
      id: profile?.id || user.id,
      tenant_id: profile?.tenant_id || user.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000',
      email: user.email || '',
      full_name: profile?.full_name || user.user_metadata?.full_name || 'Administrador',
      company_name: companyName, // <--- Aquí inyectamos el nombre real de la empresa
      role: profile?.role || user.user_metadata?.role || 'admin',
    } as User;
  }
}