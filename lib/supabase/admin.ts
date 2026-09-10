import { createClient as createAdminSupabase } from "@supabase/supabase-js";

// Cliente con permisos de administrador. SOLO se puede usar del lado del servidor:
// la service role key saltea todas las reglas de seguridad de la base.
// Nunca importar este archivo desde un componente "use client".
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Falta la variable SUPABASE_SERVICE_ROLE_KEY. Cargala en Vercel para poder blanquear contraseñas."
    );
  }
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
