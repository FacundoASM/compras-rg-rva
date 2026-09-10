import { cookies } from "next/headers";

const CLAVE = "flash";

export type Flash = { texto: string; tipo: "exito" | "error" | "info" };

/** Se llama desde una server action, justo antes de revalidar. */
export function ponerFlash(texto: string, tipo: Flash["tipo"] = "exito") {
  cookies().set(CLAVE, JSON.stringify({ texto, tipo }), {
    path: "/",
    maxAge: 15,
    httpOnly: false, // el componente de aviso la borra desde el navegador
    sameSite: "lax",
  });
}

/** Se lee en el layout, del lado del servidor. */
export function leerFlash(): Flash | null {
  const bruto = cookies().get(CLAVE)?.value;
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as Flash;
  } catch {
    return null;
  }
}
