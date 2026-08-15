"use client";

import { useState } from "react";
import { logoutAndClear } from "@/lib/auth-logout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hapticTap } from "@/lib/haptic";

type SecurityMode = "all" | "password" | "delete";

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
  const [busyPwd, setBusyPwd] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [busyDel, setBusyDel] = useState(false);

  async function changePassword() {
    hapticTap();
    if (newPassword.length < 8) {
      toast.error("Neues Passwort mindestens 8 Zeichen");
      return;
    }
    setBusyPwd(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Änderung fehlgeschlagen");
        return;
      }
      toast.success("Passwort aktualisiert");
      setCurrent("");
      setNew("");
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

  return (
    <div className="space-y-6">
      {showPassword && (
      <section className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-4 space-y-3">
        <h3 className="font-semibold text-white">Passwort ändern</h3>
        <div>
          <Label>Aktuelles Passwort</Label>
          <Input
            type="password"
            className="mt-1"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label>Neues Passwort</Label>
          <Input
            type="password"
            className="mt-1"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
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
      </section>
      )}

      {showDelete && (
      <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 space-y-3">
        <h3 className="font-semibold text-red-300">Account löschen</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Unwiderruflich. Tippe zur Bestätigung <strong className="text-red-200">LÖSCHEN</strong>{" "}
          und gib dein Passwort ein.
        </p>
        <div>
          <Label>Passwort</Label>
          <Input
            type="password"
            className="mt-1"
            value={delPassword}
            onChange={(e) => setDelPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
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
