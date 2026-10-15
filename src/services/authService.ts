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

  // Obtener usuario/perfil actual vinculado a su empresa (tenant)
  public static async getCurrentProfile(): Promise<User | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    // 1. Obtener perfil del usuario desde la tabla users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error al consultar la tabla users:', profileError.message);
    }

    // Identificar el tenant_id real asignado
    const tenantId =
      profile?.tenant_id ||
      user.user_metadata?.tenant_id ||
      user.app_metadata?.tenant_id;

    let companyName =
      profile?.company_name ||
      user.user_metadata?.company_name ||
      user.app_metadata?.company_name;

    // 2. Si no tenemos companyName o el tenant_id es genérico, consultar la tabla tenants/organizaciones
    if ((!companyName || !tenantId) && tenantId) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .maybeSingle();

      if (tenantData?.name) {
        companyName = tenantData.name;
      }
    }

    // Si aún no hay tenant_id explícito, buscar el primer tenant/empresa asociado o el de su asignador
    let finalTenantId = tenantId;
    if (!finalTenantId) {
      const { data: defaultTenant } = await supabase
        .from('tenants')
        .select('id, name')
        .limit(1)
        .maybeSingle();

      if (defaultTenant) {
        finalTenantId = defaultTenant.id;
        if (!companyName) companyName = defaultTenant.name;
      }
    }

    return {
      id: profile?.id || user.id,
      tenant_id: finalTenantId || '00000000-0000-0000-0000-000000000000',
      email: user.email || '',
      full_name: profile?.full_name || user.user_metadata?.full_name || 'Usuario',
      company_name: companyName || 'Mi Empresa de Transporte',
      role: profile?.role || user.user_metadata?.role || 'driver',
    } as User;
  }
}