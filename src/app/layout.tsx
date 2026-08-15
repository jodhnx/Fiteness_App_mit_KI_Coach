import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { AppBootSplash } from "@/components/layout/app-boot-splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "NEXFORM",
    template: "%s | NEXFORM",
  },
  description:
    "NEXFORM – Training, Ernährung, Fortschritt und KI-Coaching in einer mobilen Premium-App.",
  keywords: ["NEXFORM", "Fitness", "KI Coach", "Training", "Ernährung"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NEXFORM",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0a0f14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark" data-theme="turquoise" data-density="standard">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
#nexform-boot{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-center;gap:1.25rem;background:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(34,211,238,.18),transparent),linear-gradient(180deg,#0c141c 0%,#09090b 55%,#050507 100%);color:#fafafa;font-family:system-ui,-apple-system,sans-serif;transition:opacity .2s ease,visibility .2s ease}
#nexform-boot.nexform-boot-hide{opacity:0;visibility:hidden;pointer-events:none}
#nexform-boot .nf-mark{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#22d3ee,#06b6d4);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.35rem;letter-spacing:.04em;color:#09090b;box-shadow:0 0 40px rgba(34,211,238,.35)}
#nexform-boot .nf-title{font-size:1.35rem;font-weight:700;letter-spacing:.12em;margin:0}
#nexform-boot .nf-sub{margin:0;font-size:.8rem;color:#a1a1aa}
#nexform-boot .nf-bar{width:120px;height:3px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
#nexform-boot .nf-bar>i{display:block;height:100%;width:40%;border-radius:99px;background:#22d3ee;animation:nf-boot 1s ease-in-out infinite}
@keyframes nf-boot{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
            `.replace(/\s+/g, " "),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mobile-app-body overscroll-none`}
      >
        <div id="nexform-boot" aria-live="polite" aria-busy="true">
          <div className="nf-mark">NX</div>
          <p className="nf-title">NEXFORM</p>
          <p className="nf-sub">Deine Daten werden geladen …</p>
          <div className="nf-bar" aria-hidden>
            <i />
          </div>
        </div>
        <AuthSessionProvider>
          <PreferencesProvider>
            <AppBootSplash />
            {children}
            <Toaster
              theme="dark"
              position="bottom-center"
              richColors
              offset="calc(5.5rem + env(safe-area-inset-bottom, 0px))"
              mobileOffset="calc(5.5rem + env(safe-area-inset-bottom, 0px))"
            />
          </PreferencesProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
