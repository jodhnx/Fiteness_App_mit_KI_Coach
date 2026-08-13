"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIntro } from "@/components/guide/page-intro";
import { toast } from "sonner";
import { Users, Trophy, Share2, Search, UserPlus, Check, X } from "lucide-react";
import { hapticTap } from "@/lib/haptic";
import { UserAvatar } from "@/components/user/user-avatar";
import { useDebounce } from "@/hooks/use-debounce";

type PublicUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  publicAchievements?: { name: string; icon: string | null }[];
};

type FriendRow = {
  id: string;
  status: string;
  initiatorId: string;
  receiverId: string;
  initiator: PublicUser;
  receiver: PublicUser;
  other?: PublicUser;
  publicAchievements?: { name: string; icon: string | null }[];
};

type ChallengeRow = {
  id: string;
  title: string;
  description?: string | null;
  progress?: number;
  targetDays?: number;
  status?: string;
};

function displayHandle(u: PublicUser) {
  if (u.username) return `@${u.username}`;
  return u.name?.trim() || "Nutzer";
}

export default function SocialPage() {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const debouncedQ = useDebounce(query, 250);

  const load = useCallback(() => {
    void fetch("/api/social/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []));
    void fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => setChallenges(d.challenges ?? []));
    void fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setMyId(d.user?.id ?? null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = debouncedQ.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    void fetch(`/api/social/friends?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.users ?? []))
      .finally(() => setSearching(false));
  }, [debouncedQ]);

  const pendingIncoming = useMemo(
    () =>
      friends.filter(
        (f) => f.status === "PENDING" && myId && f.receiverId === myId
      ),
    [friends, myId]
  );
  const pendingOutgoing = useMemo(
    () =>
      friends.filter(
        (f) => f.status === "PENDING" && myId && f.initiatorId === myId
      ),
    [friends, myId]
  );
  const accepted = useMemo(
    () => friends.filter((f) => f.status === "ACCEPTED"),
    [friends]
  );

  async function sendRequest(username: string) {
    hapticTap();
    const res = await fetch("/api/social/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Anfrage fehlgeschlagen");
      return;
    }
    toast.success("Freundschaftsanfrage gesendet");
    setQuery("");
    setResults([]);
    load();
  }

  async function patchFriend(id: string, action: "accept" | "reject" | "remove" | "cancel") {
    hapticTap();
    const res = await fetch("/api/social/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Aktion fehlgeschlagen");
      return;
    }
    if (action === "accept") toast.success("Freundschaft angenommen");
    else if (action === "reject") toast.message("Anfrage abgelehnt");
    else toast.message("Entfernt");
    load();
  }

  function shareAchievement() {
    hapticTap();
    const text = "Mein Fortschritt mit NEXFORM 💪";
    if (navigator.share) {
      void navigator.share({ title: "NEXFORM", text }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(text);
      toast.success("In Zwischenablage kopiert");
    }
  }

  return (
    <PageShell
      title="Community"
      subtitle="Freunde · Challenges · Teilen"
      className="pb-28 space-y-4"
      bottomNav={false}
    >
      <PageIntro pageId="social" />

      <PremiumCard className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-white">Freunde finden</h2>
        </div>
        <Label className="text-xs text-zinc-500">Benutzername suchen</Label>
        <Input
          placeholder="@benutzername"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11"
          autoComplete="off"
        />
        {searching && <p className="text-xs text-zinc-500">Suche…</p>}
        {results.length > 0 && (
          <ul className="space-y-2">
            {results.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5"
              >
                <UserAvatar src={u.image} name={u.name ?? u.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {displayHandle(u)}
                  </p>
                  {u.name && u.username && (
                    <p className="text-[11px] text-zinc-500 truncate">{u.name}</p>
                  )}
                  {(u.publicAchievements?.length ?? 0) > 0 && (
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                      {u.publicAchievements!.map((a) => a.name).join(" · ")}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="premium"
                  disabled={!u.username}
                  onClick={() => u.username && void sendRequest(u.username)}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Anfragen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PremiumCard>

      {pendingIncoming.length > 0 && (
        <PremiumCard className="space-y-2">
          <h2 className="text-sm font-semibold text-white">Anfragen</h2>
          {pendingIncoming.map((f) => {
            const other = f.initiator;
            return (
              <div key={f.id} className="flex items-center gap-3">
                <UserAvatar src={other.image} name={other.name ?? other.username} size="sm" />
                <p className="flex-1 text-sm text-zinc-200 truncate">{displayHandle(other)}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="premium"
                  onClick={() => void patchFriend(f.id, "accept")}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void patchFriend(f.id, "reject")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </PremiumCard>
      )}

      {pendingOutgoing.length > 0 && (
        <PremiumCard className="space-y-2">
          <h2 className="text-sm font-semibold text-white">Ausstehend</h2>
          {pendingOutgoing.map((f) => {
            const other = f.receiver;
            return (
              <div key={f.id} className="flex items-center gap-3">
                <UserAvatar src={other.image} name={other.name ?? other.username} size="sm" />
                <p className="flex-1 text-sm text-zinc-300 truncate">{displayHandle(other)}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void patchFriend(f.id, "cancel")}
                >
                  Zurückziehen
                </Button>
              </div>
            );
          })}
        </PremiumCard>
      )}

      <PremiumCard className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-white">
            Freunde ({accepted.length})
          </h2>
        </div>
        {accepted.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Noch keine Freunde — suche oben nach einem Benutzernamen.
          </p>
        ) : (
          <ul className="space-y-2">
            {accepted.map((f) => {
              const other =
                f.other ??
                (myId && f.initiatorId === myId ? f.receiver : f.initiator);
              const ach = f.publicAchievements ?? [];
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-2.5"
                >
                  <UserAvatar src={other.image} name={other.name ?? other.username} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {displayHandle(other)}
                    </p>
                    {ach.length > 0 && (
                      <p className="text-[10px] text-zinc-400 truncate">
                        {ach.map((a) => a.name).join(" · ")}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-zinc-500"
                    onClick={() => void patchFriend(f.id, "remove")}
                  >
                    Entfernen
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </PremiumCard>

      <PremiumCard className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-white">Challenges</h2>
        </div>
        {challenges.length === 0 ? (
          <p className="text-sm text-zinc-500">Aktuell keine Challenges.</p>
        ) : (
          challenges.slice(0, 5).map((c) => (
            <div key={c.id} className="rounded-xl bg-zinc-900/60 p-3">
              <p className="text-sm font-medium text-white">{c.title}</p>
              {c.description && (
                <p className="text-xs text-zinc-500 mt-0.5">{c.description}</p>
              )}
            </div>
          ))
        )}
      </PremiumCard>

      <Button type="button" variant="outline" className="w-full" onClick={shareAchievement}>
        <Share2 className="h-4 w-4 mr-2" />
        Fortschritt teilen
      </Button>
    </PageShell>
  );
}
