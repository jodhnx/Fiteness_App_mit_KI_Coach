"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getLoginErrorMessage } from "@/lib/auth-errors";
import {
  DEFAULT_POST_LOGIN,
  signInCredentials,
  redirectAfterLogin,
} from "@/lib/auth-flow";
import {
  AuthScreenLayout,
  GuestContinueButton,
} from "@/components/auth/auth-screen-layout";
import { signIn } from "next-auth/react";

function resolveErrorCode(error?: string | null, code?: string | null): string {
  if (code && code !== "CredentialsSignin" && code !== "credentials") return code;
  if (error && error !== "CredentialsSignin" && error !== "credentials") return error;
  return code ?? error ?? "invalid_credentials";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const err = params.get("error");
    if (err) {
      const msg = getLoginErrorMessage(err === "CredentialsSignin" ? "invalid_credentials" : err);
      setLastError(msg);
      toast.error(msg);
    }
  }, [params]);

  useEffect(() => {
    if (params.get("verified") === "1") {
      toast.success("E-Mail bestätigt. Du kannst dich jetzt anmelden.");
    }
  }, [params]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace(DEFAULT_POST_LOGIN);
    }
  }, [sessionStatus, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setLastError(null);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const res = await signInCredentials(email, password, DEFAULT_POST_LOGIN);
      if (res.ok) {
        toast.success("Willkommen zurück!");
        await redirectAfterLogin(router);
        return;
      }
      const errCode = resolveErrorCode(res.error, res.code);
      const message = getLoginErrorMessage(errCode);
      setLastError(message);
      toast.error(message);
      if (errCode === "email_not_verified") {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch {
      toast.error("Anmeldung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout
      title="Anmelden"
      subtitle="Willkommen zurück bei NEXFORM"
      footer={
        <div className="space-y-3">
          <GuestContinueButton />
          <p className="text-center text-sm text-zinc-500">
            Noch kein Konto?{" "}
            <Link href="/register" className="text-cyan-400 hover:underline">
              Registrieren
            </Link>
          </p>
        </div>
      }
    >
      {lastError && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
          {lastError}
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" required disabled={loading} className="mt-1.5 h-12 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" name="password" type="password" required disabled={loading} className="mt-1.5 h-12 rounded-xl" />
        </div>
        <Button type="submit" className="w-full h-14 rounded-2xl btn-accent" disabled={loading}>
          {loading ? "Wird angemeldet…" : "Anmelden"}
        </Button>
      </form>
      <Button
        variant="outline"
        className="w-full h-12 mt-3 rounded-xl border-zinc-700"
        disabled={loading}
        onClick={() => signIn("google", { callbackUrl: DEFAULT_POST_LOGIN, redirect: true })}
      >
        Mit Google anmelden
      </Button>
      <p className="text-center text-sm text-zinc-500 mt-4">
        <Link href="/reset-password" className="text-cyan-400 hover:underline">
          Passwort vergessen?
        </Link>
      </p>
    </AuthScreenLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
