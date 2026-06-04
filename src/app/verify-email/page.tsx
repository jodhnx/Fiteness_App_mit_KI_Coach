"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getLoginErrorMessage } from "@/lib/auth-errors";
import { logAuthFlow, redirectAfterLogin } from "@/lib/auth-flow";
import { AuthFlowSteps } from "@/components/auth/auth-flow-steps";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Verifizierung fehlgeschlagen");
        return;
      }

      toast.success(data.message ?? "E-Mail bestätigt!");

      if (password.length >= 8) {
        const signInRes = await signIn("credentials", {
          email: email.trim(),
          password,
          redirect: false,
        });
        if (signInRes?.ok) {
          logAuthFlow("LOGIN SUCCESS");
          const statusRes = await fetch("/api/onboarding");
          const status = await statusRes.json().catch(() => ({}));
          const target = status.completed ? "/home" : "/onboarding";
          await redirectAfterLogin(router, target);
          return;
        }
        toast.message(getLoginErrorMessage(signInRes?.code));
        router.push("/login");
        return;
      }

      router.push("/login?verified=1");
    } catch {
      toast.error("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!email.trim()) {
      toast.error("Bitte E-Mail eingeben");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Code konnte nicht gesendet werden");
        return;
      }
      toast.success(data.message ?? "Neuer Code gesendet");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="gradient-mesh min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <AuthFlowSteps current={2} />
        <CardHeader>
          <CardTitle>E-Mail bestätigen</CardTitle>
          <CardDescription>
            Schritt 2 von 3 — 6-stelliger Code (15 Min. gültig)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onVerify} className="space-y-4">
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="code">Bestätigungscode</Label>
              <Input
                id="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="482913"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password">Passwort (optional, für direkten Login)</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Nach Bestätigung automatisch anmelden"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Wird geprüft..." : "E-Mail bestätigen"}
            </Button>
          </form>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onResend}
            disabled={resending || loading}
          >
            {resending ? "Wird gesendet..." : "Code erneut senden"}
          </Button>
          <p className="text-sm text-zinc-400 text-center">
            <Link href="/login" className="text-cyan-400 hover:underline">
              Zur Anmeldung
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 p-6">Lädt...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
