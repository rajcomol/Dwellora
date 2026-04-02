import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const rl = rateLimitResponse(
    `auth:confirm:${ip}`,
    RATE_LIMIT.authConfirm.limit,
    RATE_LIMIT.authConfirm.windowMs,
    { scope: "auth:confirm", clientIp: ip }
  );
  if (rl) return rl;

  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = request.nextUrl.origin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    url.pathname = "/login";
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  if (!code) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth confirm exchangeCodeForSession", error.message);
    const errUrl = new URL("/login", origin);
    errUrl.searchParams.set("error", "auth");
    response = NextResponse.redirect(errUrl);
  }

  return response;
}
