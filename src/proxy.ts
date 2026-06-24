import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeGetUser } from "@/lib/supabase/safe-auth";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const user = await safeGetUser(supabase);

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (pathname === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (pathname.startsWith("/login") && user) {
    const nextRaw = request.nextUrl.searchParams.get("next");
    if (nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
      try {
        const dest = new URL(nextRaw, request.nextUrl.origin);
        if (dest.origin === request.nextUrl.origin) {
          const redirectResponse = NextResponse.redirect(dest);
          copyCookies(response, redirectResponse);
          return redirectResponse;
        }
      } catch {
        /* fall through to dashboard */
      }
    }
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

/**
 * Must include exact `/login` and `/dashboard` — patterns like `/dashboard/:path*`
 * often do NOT match the index route `/dashboard` alone, so the proxy would skip
 * session refresh and Supabase cookies stay stale → server layout sees no user → redirect loop.
 */
export const config = {
  matcher: [
    "/",
    "/login",
    "/login/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/auth/:path*",
    "/invite/:path*",
    /** Refresh Supabase session cookies on API calls (otherwise /api/* skipped → stale JWT → 401 on invite accept). */
    "/api/:path*",
  ],
};
