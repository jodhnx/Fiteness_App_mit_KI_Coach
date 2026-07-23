"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupportCategory } from "@prisma/client";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_QUICK_TOPICS,
} from "@/lib/support-config";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";
import { cn } from "@/lib/utils";

type ProfileCache = {
  user?: { name?: string; email?: string; image?: string | null };
};

export default function SupportPage() {
  const { data: profile } = useCachedFetch<ProfileCache>(
    PROFILE_CACHE_KEY,
    "/api/profile",
    120_000,
    6_000,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<SupportCategory>("OTHER");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(true);

  useEffect(() => {
    if (profile?.user?.name && !name) setName(profile.user.name);
    if (profile?.user?.email && !email) setEmail(profile.user.email ?? "");
  }, [profile, name, email]);

  const submit = useCallback(async () => {
    if (sending) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          message: message.trim(),
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? "Senden fehlgeschlagen");
        return;
      }
      setSuccess(true);
      setEmailSent((data as { emailSent?: boolean }).emailSent !== false);
      setMessage("");
    } catch {
      toast.error("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  }, [sending, name, email, category, message, website]);

  if (success) {
    return (
      <div className="max-w-lg mx-auto space-y-6 pb-24">
        <PageHeader title="Support" subtitle="Wir sind für dich da" />
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" aria-hidden />
          <p className="text-emerald-100 font-medium leading-relaxed">
            Deine Anfrage wurde erfolgreich gesendet.
            {emailSent
              ? " Du erhältst in Kürze eine Bestätigungs-E-Mail an deine Adresse. Unser Team antwortet in der Regel innerhalb von 24 Stunden."
              : " Deine Nachricht wurde gespeichert. Unser Team prüft sie und meldet sich bei dir."}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setSuccess(false)}
            >
              Weitere Anfrage senden
            </Button>
            <Link href="/settings">
              <Button type="button" variant="ghost" className="w-full">
                Zurück zu Einstellungen
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-28">
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader title="Support" subtitle="Kontakt & Feedback" />
      </div>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-0.5">
          Schnellauswahl
        </p>
        <div className="grid gap-2">
          {SUPPORT_QUICK_TOPICS.map((topic) => (
            <button
              key={topic.title}
              type="button"
              onClick={() => {
                setCategory(topic.category);
                document.getElementById("support-form")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors active:opacity-90",
                category === topic.category && topic.title !== "Sonstiges"
                  ? "border-cyan-500/40 bg-cyan-500/10"
                  : "border-white/10 bg-zinc-900/60"
              )}
            >
              <p className="font-medium text-white text-sm">{topic.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{topic.description}</p>
            </button>
          ))}
        </div>
      </section>

      <form
        id="support-form"
        className="card-premium p-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2 className="font-semibold text-white text-lg">Kontaktformular</h2>

        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
        />

        <div>
          <Label htmlFor="support-name">Name *</Label>
          <Input
            id="support-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="mt-1 h-12 text-base"
            autoComplete="name"
          />
        </div>

        <div>
          <Label htmlFor="support-email">E-Mail *</Label>
          <Input
            id="support-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
            className="mt-1 h-12 text-base"
            autoComplete="email"
          />
        </div>

        <div>
          <Label htmlFor="support-category">Kategorie *</Label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            required
            className="mt-1 w-full h-12 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-base"
          >
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="support-message">Nachricht *</Label>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            placeholder="Beschreibe dein Anliegen…"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-3 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none"
          />
          <p className="text-[10px] text-zinc-600 mt-1 text-right">{message.length}/5000</p>
        </div>

        <Button
          type="submit"
          disabled={sending}
          className="w-full h-14 text-base font-semibold btn-accent rounded-2xl"
        >
          <Send className="h-5 w-5 mr-2" aria-hidden />
          {sending ? "Wird gesendet…" : "Nachricht senden"}
        </Button>
      </form>
    </div>
  );
}
