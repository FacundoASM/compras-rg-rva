import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLICAS = ["/login"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esPublica = PUBLICAS.some((r) => request.nextUrl.pathname.startsWith(r));

  if (!user && !esPublica) {
    const redir = NextResponse.redirect(new URL("/login", request.url));
    // IMPORTANTE: arrastrar las cookies de sesión ya refrescadas a la respuesta
    // de redirección. Sin esto se pierde la sesión y el usuario queda deslogueado.
    response.cookies.getAll().forEach((c) => redir.cookies.set(c));
    return redir;
  }

  if (user && esPublica) {
    const redir = NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((c) => redir.cookies.set(c));
    return redir;
  }

  return response;
}

export const config = {
  matcher: [
    // todo menos estáticos, imágenes y archivos con extensión (logo, favicon)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|gif|webp|ico)$).*)",
  ],
};
