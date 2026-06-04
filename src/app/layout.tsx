import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Fitness Coach Pro",
    template: "%s | AI Fitness Coach Pro",
  },
  description:
    "Moderne Fitness-SaaS mit KI-Coach, Training, Ernährung, Vitaldaten und Gamification.",
  keywords: ["Fitness", "KI Coach", "Training", "Ernährung", "HTL Diplomarbeit"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark" data-theme="turquoise" data-density="standard">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthSessionProvider>
          <PreferencesProvider>
            {children}
            <Toaster theme="dark" position="top-right" richColors />
          </PreferencesProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
