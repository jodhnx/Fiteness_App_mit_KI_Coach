"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getLoginErrorMessage } from "@/lib/auth-errors";
import {
  DEFAULT_POST_LOGIN,
  logAuthFlow,
  redirectAfterLogin,
  signInCredentials,
} from "@/lib/auth-flow";

const SHOW_AUTH_DEBUG =
  process.env.NEXT_PUBLIC_DEBUG_AUTH === "1" ||
  process.env.NODE_ENV !== "production";

function resolveErrorCode(
  error?: string | null,
  code?: string | null
): string {
  if (code && code !== "CredentialsSignin" && code !== "credentials") {
    return code;
  }
  if (error && error !== "CredentialsSignin" && error !== "credentials") {
    return error;
  }
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
      const msg = getLoginErrorMessage(
        err === "CredentialsSignin" ? "invalid_credentials" : err
      );
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
      logAuthFlow("already_authenticated", DEFAULT_POST_LOGIN);
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
      logAuthFlow("signIn_result", res);

      if (res.ok) {
        toast.success("Willkommen zurück!");
        await redirectAfterLogin(router);
        return;
      }

      const errCode = resolveErrorCode(res.error, res.code);
      const message = getLoginErrorMessage(errCode);
      const detail = SHOW_AUTH_DEBUG
        ? `${message} (${errCode}, HTTP ${res.status})`
        : message;

      setLastError(detail);
      toast.error(detail);
      console.log("LOGIN ERROR", { code: errCode, status: res.status, url: res.url });

      if (errCode === "email_not_verified") {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      console.log("LOGIN ERROR", err);
      const raw = err instanceof Error ? err.message : String(err);
      const detail = SHOW_AUTH_DEBUG
        ? `Anmeldung fehlgeschlagen: ${raw}`
        : getLoginErrorMessage("unknown");
      setLastError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gradient-mesh min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Anmelden</CardTitle>
          <CardDescription>Willkommen bei AI Fitness Coach Pro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastError && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {lastError}
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" required disabled={loading} />
            </div>
            <div>
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" name="password" type="password" required disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Wird angemeldet..." : "Anmelden"}
            </Button>
          </form>
          <Button
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() =>
              signIn("google", { callbackUrl: DEFAULT_POST_LOGIN, redirect: true })
            }
          >
            Mit Google anmelden
          </Button>
          <p className="text-sm text-zinc-400 text-center">
            <Link href="/reset-password" className="text-cyan-400 hover:underline">
              Passwort vergessen?
            </Link>
            {" · "}
            <Link href="/register" className="text-cyan-400 hover:underline">
              Registrieren
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
