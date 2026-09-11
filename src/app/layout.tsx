import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { RootProvidersBoundary } from "@/components/layout/root-providers-boundary";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
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
  themeColor: "#f4f6f8",
};

/**
 * Minimal root layout — no splash overlay, no artificial delays.
 * Session + preferences sit inside RootProvidersBoundary so provider
 * crashes never escalate to the blank global-error screen unnoticed.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBoot = `(function(){try{var m=localStorage.getItem('app-color-mode')||'light';var t=localStorage.getItem('app-theme')||'blue';var d=localStorage.getItem('app-density')||'standard';var r=document.documentElement;r.dataset.theme=t;r.dataset.density=d;r.dataset.colorMode=m;r.classList.toggle('light',m==='light');r.classList.toggle('dark',m!=='light');}catch(e){}})();`;

  return (
    <html lang="de" className="light" data-theme="blue" data-color-mode="light" data-density="standard" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mobile-app-body overscroll-none`}
      >
        <RootProvidersBoundary>
          <ServiceWorkerProvider />
          <AuthSessionProvider>
            <PreferencesProvider>
              {children}
              <Toaster theme="system" position="bottom-center" richColors offset={88} />
            </PreferencesProvider>
          </AuthSessionProvider>
        </RootProvidersBoundary>
      </body>
    </html>
  );
}
