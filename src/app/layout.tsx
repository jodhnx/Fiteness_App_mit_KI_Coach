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
#nexform-boot{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.35rem;padding:1.5rem;background:radial-gradient(ellipse 90% 55% at 50% -8%,rgba(34,211,238,.22),transparent 55%),radial-gradient(ellipse 60% 40% at 80% 90%,rgba(6,182,212,.08),transparent),linear-gradient(165deg,#0c141c 0%,#09090b 52%,#050507 100%);color:#fafafa;font-family:system-ui,-apple-system,sans-serif;transition:opacity .2s ease,visibility .2s ease}
#nexform-boot.nexform-boot-hide{opacity:0;visibility:hidden;pointer-events:none}
#nexform-boot .nf-glass{display:flex;flex-direction:column;align-items:center;gap:1.1rem;padding:2rem 2.25rem;border-radius:1.75rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 64px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);max-width:18rem;width:100%}
#nexform-boot .nf-mark{width:68px;height:68px;border-radius:1.15rem;background:linear-gradient(145deg,#22d3ee 0%,#06b6d4 55%,#0891b2 100%);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.4rem;letter-spacing:.05em;color:#09090b;box-shadow:0 0 0 1px rgba(34,211,238,.25),0 12px 40px rgba(34,211,238,.28);animation:nf-mark-pulse 2.4s ease-in-out infinite}
#nexform-boot .nf-title{font-size:1.4rem;font-weight:700;letter-spacing:.16em;margin:0}
#nexform-boot .nf-sub{margin:0;font-size:.78rem;line-height:1.45;color:#a1a1aa;text-align:center;max-width:14rem}
#nexform-boot .nf-bar{width:132px;height:3px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}
#nexform-boot .nf-bar>i{display:block;height:100%;width:38%;border-radius:99px;background:linear-gradient(90deg,transparent,#22d3ee,#67e8f9,transparent);animation:nf-boot 1.15s ease-in-out infinite}
#nexform-boot .nf-lines{position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:.35}
#nexform-boot .nf-lines span{position:absolute;height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,.5),transparent);animation:nf-line 3.2s ease-in-out infinite}
#nexform-boot .nf-lines span:nth-child(1){top:22%;left:8%;width:28%;animation-delay:0s}
#nexform-boot .nf-lines span:nth-child(2){top:68%;right:10%;width:22%;animation-delay:.8s}
#nexform-boot .nf-lines span:nth-child(3){bottom:18%;left:18%;width:18%;animation-delay:1.5s}
@keyframes nf-boot{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
@keyframes nf-mark-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
@keyframes nf-line{0%,100%{opacity:.2;transform:translateX(0)}50%{opacity:.7;transform:translateX(12px)}}
            `.replace(/\s+/g, " "),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mobile-app-body overscroll-none`}
      >
        <div id="nexform-boot" aria-live="polite" aria-busy="true">
          <div className="nf-lines" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <div className="nf-glass">
            <div className="nf-mark">NX</div>
            <p className="nf-title">NEXFORM</p>
            <p className="nf-sub">Deine Fitnessdaten werden vorbereitet …</p>
            <div className="nf-bar" aria-hidden>
              <i />
            </div>
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
