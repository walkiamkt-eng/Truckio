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

    // Obtener el perfil asociado al usuario autenticado
    return await AuthService.getCurrentProfile();
  }

  // Cerrar sesión
  public static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Obtener usuario/perfil actual desde Supabase Auth + tabla profiles
  public static async getCurrentProfile(): Promise<User | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    // Se usa .maybeSingle() en lugar de .single() para evitar el error HTTP 406
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error al consultar la tabla profiles:', profileError.message);
      return null;
    }

    if (!profile) {
      console.warn(`El usuario ${user.id} está autenticado pero no tiene un perfil registrado en la tabla 'profiles'.`);
      return null;
    }

    return {
      id: profile.id,
      tenant_id: profile.tenant_id,
      email: user.email || '',
      full_name: profile.full_name,
      role: profile.role,
    } as User;
  }
}