"use client";

import { useEffect, useState } from "react";
import { logoutAndClear } from "@/lib/auth-logout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { hapticTap } from "@/lib/haptic";

type SecurityMode = "all" | "password" | "delete";

type AuthMeta = {
  hasPassword: boolean;
  isGuest: boolean;
  providers: string[];
};

/** Password change + account delete — real APIs with confirmation. */
export function SettingsSecurityPanel({
  mode = "all",
}: {
  mode?: SecurityMode;
}) {
  const showPassword = mode === "all" || mode === "password";
  const showDelete = mode === "all" || mode === "delete";
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [busyPwd, setBusyPwd] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [busyDel, setBusyDel] = useState(false);
  const [authMeta, setAuthMeta] = useState<AuthMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/password", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        setAuthMeta({
          hasPassword: Boolean(data.hasPassword),
          isGuest: Boolean(data.isGuest),
          providers: Array.isArray(data.providers) ? data.providers : [],
        });
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function changePassword() {
    hapticTap();
    if (newPassword.length < 8) {
      toast.error("Neues Passwort mindestens 8 Zeichen");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }
    setBusyPwd(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Änderung fehlgeschlagen");
        return;
      }
      toast.success(data.message ?? "Passwort aktualisiert");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusyPwd(false);
    }
  }

  async function deleteAccount() {
    hapticTap();
    if (delConfirm !== "LÖSCHEN") {
      toast.error('Bitte zur Bestätigung „LÖSCHEN“ eingeben');
      return;
    }
    if (
      !window.confirm(
        "Konto wirklich unwiderruflich löschen? Alle Trainings-, Ernährungs- und Fortschrittsdaten gehen verloren."
      )
    ) {
      return;
    }
    setBusyDel(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: delPassword, confirm: "LÖSCHEN" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Löschen fehlgeschlagen");
        return;
      }
      toast.success("Konto gelöscht");
      await logoutAndClear("/login");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusyDel(false);
    }
  }

  const oauthOnly =
    authMeta != null && !authMeta.hasPassword && !authMeta.isGuest;
  const oauthProviders = (authMeta?.providers ?? [])
    .filter((p) => p !== "credentials")
    .map((p) => (p === "google" ? "Google" : p))
    .join(", ");

  return (
    <div className="space-y-6">
      {showPassword && (
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 space-y-3 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/80 dark:shadow-none">
          <h3 className="font-semibold text-zinc-900 dark:text-white">
            Passwort ändern
          </h3>
          {oauthOnly ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Dieses Konto meldet sich über{" "}
              <strong>{oauthProviders || "einen externen Anbieter"}</strong> an
              und hat kein lokales Passwort. Eine Passwortänderung ist daher nicht
              möglich. Nutze „Passwort vergessen“, falls du später ein
              E-Mail-Passwort setzen möchtest — oder bleibe bei der Google-Anmeldung.
            </p>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                Mindestens 8 Zeichen. Aktuelles Passwort wird serverseitig geprüft.
              </p>
              <div>
                <Label>Aktuelles Passwort</Label>
                <PasswordInput
                  className="mt-1"
                  value={currentPassword}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <Label>Neues Passwort</Label>
                <PasswordInput
                  className="mt-1"
                  value={newPassword}
                  onChange={(e) => setNew(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div>
                <Label>Neues Passwort bestätigen</Label>
                <PasswordInput
                  className="mt-1"
                  value={confirmPassword}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <Button
                type="button"
                variant="premium"
                className="w-full"
                disabled={busyPwd}
                onClick={() => void changePassword()}
              >
                {busyPwd ? "Speichern…" : "Passwort speichern"}
              </Button>
            </>
          )}
        </section>
      )}

      {showDelete && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3 dark:border-red-500/30 dark:bg-red-950/20">
          <h3 className="font-semibold text-red-600 dark:text-red-300">
            Account löschen
          </h3>
          <p className="text-xs text-zinc-600 leading-relaxed dark:text-zinc-400">
            Unwiderruflich. Tippe zur Bestätigung{" "}
            <strong className="text-red-600 dark:text-red-200">LÖSCHEN</strong>
            {authMeta?.hasPassword
              ? " und gib dein Passwort ein."
              : oauthOnly
                ? ". Bei Google-Konten ggf. Passwort-Feld leer lassen, falls die API es erlaubt — sonst Support kontaktieren."
                : " und gib dein Passwort ein."}
          </p>
          {authMeta?.hasPassword !== false && (
            <div>
              <Label>Passwort</Label>
              <PasswordInput
                className="mt-1"
                value={delPassword}
                onChange={(e) => setDelPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          )}
          <div>
            <Label>Bestätigung</Label>
            <Input
              className="mt-1"
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              placeholder="LÖSCHEN"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full border-red-500/50 text-red-300 hover:bg-red-500/10"
            disabled={busyDel}
            onClick={() => void deleteAccount()}
          >
            {busyDel ? "Löschen…" : "Konto endgültig löschen"}
          </Button>
        </section>
      )}
    </div>
  );
}
