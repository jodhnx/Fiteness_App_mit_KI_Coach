"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = token
      ? { token, password: form.get("password") }
      : { email: form.get("email") };
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Fehler");
      return;
    }
    if (data.resetUrl) toast.message("Dev Reset-Link", { description: data.resetUrl });
    toast.success(data.message);
  }

  return (
    <div className="gradient-mesh min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{token ? "Neues Passwort" : "Passwort zurücksetzen"}</CardTitle>
          <CardDescription>
            {token ? "Gib dein neues Passwort ein" : "Wir senden dir einen Reset-Link (Dev: in Response)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {token ? (
              <div>
                <Label htmlFor="password">Neues Passwort</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
            ) : (
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : token ? "Passwort speichern" : "Link anfordern"}
            </Button>
          </form>
          <Link href="/login" className="text-sm text-cyan-400 block text-center mt-4">
            Zurück zur Anmeldung
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
