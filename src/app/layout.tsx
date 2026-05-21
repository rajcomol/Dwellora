import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { defaultLocale, isLocale, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";
import nl from "@/i18n/locales/nl.json";
import MicrosoftClarity from "@/components/analytics/MicrosoftClarity";
import { I18nProvider } from "@/i18n/provider";

/** Cosmos-inspired UI: geometric sans (Google Fonts), per Envato kit style guidance. */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function siteMetadataBase(): URL | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) {
    try {
      return new URL(`https://${process.env.VERCEL_URL}`);
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

const metadataBase = siteMetadataBase();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: nl.meta.appTitle,
  description: nl.meta.appDescription,
  applicationName: nl.brand.name,
  openGraph: {
    title: nl.meta.appTitle,
    description: nl.meta.appDescription,
    siteName: nl.brand.name,
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: nl.meta.appTitle,
    description: nl.meta.appDescription,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale: Locale = fromCookie && isLocale(fromCookie) ? fromCookie : defaultLocale;

  return (
    <html
      lang={locale}
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <MicrosoftClarity />
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
