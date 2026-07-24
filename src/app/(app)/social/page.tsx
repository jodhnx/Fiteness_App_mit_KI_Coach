"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIntro } from "@/components/guide/page-intro";
import { toast } from "sonner";
import { Users, Trophy, Share2, Medal } from "lucide-react";
import { hapticTap } from "@/lib/haptic";

type Friend = {
  id: string;
  status: string;
  initiator: { id: string; name: string; email: string };
  receiver: { id: string; name: string; email: string };
};

type ChallengeRow = {
  id: string;
  title: string;
  description?: string | null;
  progress?: number;
  targetDays?: number;
  status?: string;
};

export default function SocialPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [email, setEmail] = useState("");

  const load = useCallback(() => {
    void fetch("/api/social/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []));
    void fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => setChallenges(d.challenges ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendRequest() {
    hapticTap();
    const res = await fetch("/api/social/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Anfrage fehlgeschlagen");
      return;
    }
    toast.success("Anfrage gesendet");
    setEmail("");
    load();
  }

  async function accept(id: string) {
    hapticTap();
    await fetch("/api/social/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "accept" }),
    });
    toast.success("Freundschaft angenommen");
    load();
  }

  function shareAchievement() {
    hapticTap();
    const text = "Mein Fortschritt mit NEXFORM 💪";
    if (navigator.share) {
      void navigator.share({ title: "NEXFORM", text }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(text);
      toast.success("Text kopiert — teile ihn mit Freunden");
    }
  }

  const accepted = friends.filter((f) => f.status === "ACCEPTED");
  const pending = friends.filter((f) => f.status === "PENDING");

  return (
    <PageShell
      title="Community"
      subtitle="Freunde · Challenges · Teilen"
      maxWidth="2xl"
      className="pb-28"
      bottomNav={false}
    >
      <PageIntro pageId="social" />

      <PremiumCard glow className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="font-semibold text-white">Freund hinzufügen</h2>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="sr-only">E-Mail</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="freund@email.de"
              className="h-11"
            />
          </div>
          <Button variant="premium" className="h-11" onClick={() => void sendRequest()}>
            Einladen
          </Button>
        </div>
      </PremiumCard>

      <PremiumCard className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Freunde & Anfragen</h2>
        {pending.map((f) => (
          <div
            key={f.id}
            className="flex justify-between items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2"
          >
            <p className="text-sm text-zinc-300 truncate">
              {f.initiator.name ?? f.initiator.email}
            </p>
            <Button size="sm" onClick={() => void accept(f.id)}>
              Annehmen
            </Button>
          </div>
        ))}
        {accepted.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-2 text-sm text-zinc-300 rounded-xl bg-white/[0.03] px-3 py-2"
          >
            <Medal className="h-4 w-4 text-accent shrink-0" />
            <span className="truncate">
              {f.initiator.name ?? f.initiator.email} ↔{" "}
              {f.receiver.name ?? f.receiver.email}
            </span>
          </div>
        ))}
        {friends.length === 0 && (
          <p className="text-sm text-zinc-500">Noch keine Verbindungen</p>
        )}
      </PremiumCard>

      <PremiumCard className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h2 className="font-semibold text-white">Challenges</h2>
        </div>
        {challenges.length === 0 && (
          <p className="text-sm text-zinc-500">
            Noch keine Challenges — schau unter Erfolge vorbei.
          </p>
        )}
        {challenges.slice(0, 6).map((c) => {
          const target = c.targetDays ?? 0;
          const pct =
            target > 0
              ? Math.min(100, Math.round(((c.progress ?? 0) / target) * 100))
              : 0;
          return (
            <div key={c.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-200">{c.title}</span>
                <span className="text-zinc-500 tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </PremiumCard>

      <PremiumCard className="space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-accent" />
          <h2 className="font-semibold text-white">Teilen</h2>
        </div>
        <p className="text-xs text-zinc-400">
          Teile Erfolge und Trainingsfortschritte mit Freunden.
        </p>
        <Button variant="secondary" className="w-full" onClick={shareAchievement}>
          Erfolg teilen
        </Button>
      </PremiumCard>

      <PremiumCard>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Rangliste (Freunde)
        </p>
        <p className="text-sm text-zinc-400">
          {accepted.length > 0
            ? `${accepted.length} Freunde verbunden — gemeinsame Challenges erscheinen hier.`
            : "Lade Freunde ein, um Ranglisten freizuschalten."}
        </p>
      </PremiumCard>
    </PageShell>
  );
}
