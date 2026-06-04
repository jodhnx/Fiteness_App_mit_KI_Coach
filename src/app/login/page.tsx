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
} from "@/lib/auth-flow";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = params.get("error");
    if (err) {
      toast.error(getLoginErrorMessage(err === "CredentialsSignin" ? "invalid_credentials" : err));
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

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: DEFAULT_POST_LOGIN,
      });

      logAuthFlow("signIn_response", {
        ok: res?.ok,
        status: res?.status,
        error: res?.error,
        code: res?.code,
        url: res?.url,
      });

      if (res?.url && /^https?:\/\//i.test(res.url)) {
        logAuthFlow("ignored_absolute_redirect_url", res.url);
      }

      if (res?.ok) {
        toast.success("Willkommen zurück!");
        await redirectAfterLogin(router);
        return;
      }

      const code =
        res?.code && res.code !== "CredentialsSignin" && res.code !== "credentials"
          ? res.code
          : res?.error && res.error !== "CredentialsSignin"
            ? res.error
            : res?.code ?? res?.error ?? "invalid_credentials";

      const message = getLoginErrorMessage(
        typeof code === "string" ? code : undefined
      );
      toast.error(message);

      if (code === "email_not_verified") {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      logAuthFlow("signIn_exception", err instanceof Error ? err.message : String(err));
      toast.error("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
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
