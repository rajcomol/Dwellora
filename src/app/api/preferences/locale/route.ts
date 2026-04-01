import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE_NAME } from "@/i18n/config";

/**
 * Stelt `renotasker-locale` voor toekomstige meertaligheid. Alleen geregistreerde locales zijn geldig.
 * Na een wijziging: `router.refresh()` in de client om de server layout opnieuw te laden.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const raw =
    typeof body === "object" && body !== null && "locale" in body
      ? (body as { locale: unknown }).locale
      : undefined;
  if (typeof raw !== "string" || !isLocale(raw)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true as const });
  res.cookies.set(LOCALE_COOKIE_NAME, raw, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  return res;
}
