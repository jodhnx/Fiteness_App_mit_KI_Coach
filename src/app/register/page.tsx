"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AuthFlowSteps } from "@/components/auth/auth-flow-steps";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const payload = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      let data: {
        error?: string;
        message?: string;
        email?: string;
        devVerificationCode?: string;
        skipVerifyPage?: boolean;
      } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Ungültige Server-Antwort");
      }

      if (!res.ok) {
        toast.error(data.error ?? "Registrierung fehlgeschlagen");
        return;
      }

      toast.success(data.message ?? "Bestätigungscode wurde gesendet.");
      if (data.devVerificationCode) {
        toast.message("Dev-Code (E-Mail fehlgeschlagen)", {
          description: data.devVerificationCode,
          duration: 30000,
        });
      }
      if (data.skipVerifyPage) {
        router.push("/login");
        return;
      }
      const email = encodeURIComponent(data.email ?? payload.email);
      router.push(`/verify-email?email=${email}`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.error("Zeitüberschreitung. Prüfe die Datenbank-Verbindung.");
      } else {
        toast.error(
          err instanceof Error ? err.message : "Netzwerkfehler. Bitte erneut versuchen."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gradient-mesh min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <AuthFlowSteps current={1} />
        <CardHeader>
          <CardTitle>Konto erstellen</CardTitle>
          <CardDescription>
            Schritt 1 von 3 — Name, E-Mail und Passwort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required disabled={loading} />
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" required disabled={loading} />
            </div>
            <div>
              <Label htmlFor="password">Passwort (min. 8 Zeichen)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Wird erstellt..." : "Konto erstellen"}
            </Button>
          </form>
          <p className="text-sm text-zinc-400 text-center mt-4">
            Bereits registriert?{" "}
            <Link href="/login" className="text-cyan-400 hover:underline">
              Anmelden
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
