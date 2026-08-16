"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageIntro } from "@/components/guide/page-intro";
import { toast } from "sonner";
import {
  Users,
  Trophy,
  Share2,
  Search,
  UserPlus,
  Check,
  X,
  Activity,
  Medal,
} from "lucide-react";
import { hapticTap } from "@/lib/haptic";
import { UserAvatar } from "@/components/user/user-avatar";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { getCached, setCached } from "@/lib/client-cache";

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

type FeedItem = {
  id: string;
  type: string;
  createdAt: string;
  user: PublicUser;
  title: string;
  subtitle?: string;
  meta?: string;
};

type LeaderRow = {
  rank: number;
  value: number;
  isMe: boolean;
  user: PublicUser;
};

type Tab = "feed" | "friends" | "challenges" | "ranks";

function displayHandle(u: PublicUser) {
  if (u.username) return `@${u.username}`;
  return u.name?.trim() || "Nutzer";
}

export default function SocialPage() {
  const [tab, setTab] = useState<Tab>("feed");
  const [friends, setFriends] = useState<FriendRow[]>(
    () => getCached<FriendRow[]>("social-friends", { allowStale: true }) ?? []
  );
  const [challenges, setChallenges] = useState<ChallengeRow[]>(
    () =>
      getCached<ChallengeRow[]>("social-challenges", { allowStale: true }) ?? []
  );
  const [feed, setFeed] = useState<FeedItem[]>(
    () => getCached<FeedItem[]>("social-feed", { allowStale: true }) ?? []
  );
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [rankMetric, setRankMetric] = useState("workouts");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const debouncedQ = useDebounce(query, 250);

  const load = useCallback(() => {
    void fetch("/api/social/friends")
      .then((r) => r.json())
      .then((d) => {
        const list = d.friends ?? [];
        setFriends(list);
        setCached("social-friends", list, 120_000);
      });
    void fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => {
        const list = d.challenges ?? [];
        setChallenges(list);
        setCached("social-challenges", list, 120_000);
      });
    void fetch("/api/social/feed")
      .then((r) => r.json())
      .then((d) => {
        const list = d.feed ?? [];
        setFeed(list);
        setCached("social-feed", list, 90_000);
      })
      .catch(() => undefined);
    void fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setMyId(d.user?.id ?? null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== "ranks") return;
    void fetch(`/api/social/leaderboard?metric=${rankMetric}`)
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.leaderboard ?? []))
      .catch(() => setLeaderboard([]));
  }, [tab, rankMetric]);

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

  async function patchFriend(
    id: string,
    action: "accept" | "reject" | "remove" | "cancel"
  ) {
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

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: "feed", label: "Feed", icon: Activity },
    { id: "friends", label: "Freunde", icon: Users },
    { id: "challenges", label: "Challenges", icon: Trophy },
    { id: "ranks", label: "Rangliste", icon: Medal },
  ];

  return (
    <PageShell
      title="Community"
      subtitle="Feed · Freunde · Challenges · Rangliste"
      className="pb-28 space-y-4"
      bottomNav={false}
    >
      <PageIntro pageId="social" />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium min-h-[44px]",
              tab === id
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-white/[0.08] bg-zinc-900/80 text-zinc-400"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "feed" && (
        <section className="space-y-3">
          {feed.length === 0 ? (
            <PremiumCard>
              <p className="text-sm text-zinc-400 text-center py-6">
                Noch keine Aktivitäten. Schließe ein Workout ab oder füge Freunde
                hinzu.
              </p>
            </PremiumCard>
          ) : (
            feed.map((item) => (
              <PremiumCard key={item.id} className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    src={item.user.image}
                    name={item.user.name ?? item.user.username}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {displayHandle(item.user)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(item.createdAt).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                {item.subtitle && (
                  <p className="text-base font-semibold text-white">
                    {item.subtitle}
                  </p>
                )}
                {item.meta && (
                  <p className="text-xs text-zinc-500">{item.meta}</p>
                )}
              </PremiumCard>
            ))
          )}
          <Button type="button" variant="outline" className="w-full" onClick={shareAchievement}>
            <Share2 className="h-4 w-4 mr-2" />
            Fortschritt teilen
          </Button>
        </section>
      )}

      {tab === "friends" && (
        <div className="space-y-4">
          <PremiumCard className="space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-white">Benutzer suchen …</h2>
            </div>
            <Input
              placeholder="Benutzer suchen …"
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
                    <UserAvatar
                      src={u.image}
                      name={u.name ?? u.username}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {displayHandle(u)}
                      </p>
                      {u.name && u.username && (
                        <p className="text-[11px] text-zinc-500 truncate">
                          {u.name}
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
                      Hinzufügen
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
                  <div key={f.id} className="flex items-center gap-3 min-h-[44px]">
                    <UserAvatar
                      src={other.image}
                      name={other.name ?? other.username}
                      size="sm"
                    />
                    <p className="flex-1 text-sm text-zinc-200 truncate">
                      {displayHandle(other)}
                    </p>
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
                    <UserAvatar
                      src={other.image}
                      name={other.name ?? other.username}
                      size="sm"
                    />
                    <p className="flex-1 text-sm text-zinc-300 truncate">
                      {displayHandle(other)}
                    </p>
                    <span className="text-[10px] text-zinc-500">Anfrage ausstehend</span>
                  </div>
                );
              })}
            </PremiumCard>
          )}

          <PremiumCard className="space-y-3">
            <h2 className="text-sm font-semibold text-white">
              Freunde ({accepted.length})
            </h2>
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
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-2.5"
                    >
                      <UserAvatar
                        src={other.image}
                        name={other.name ?? other.username}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {displayHandle(other)}
                        </p>
                        <p className="text-[10px] text-emerald-400/90">Freunde</p>
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
        </div>
      )}

      {tab === "challenges" && (
        <section className="space-y-3">
          {challenges.length === 0 ? (
            <PremiumCard>
              <p className="text-sm text-zinc-400 text-center py-6">
                Challenges werden eingerichtet. Bitte kurz warten und neu laden.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={load}>
                Aktualisieren
              </Button>
            </PremiumCard>
          ) : (
            challenges.map((c) => {
              const target = Math.max(1, c.targetDays ?? 1);
              const progress = c.progress ?? 0;
              const pct = Math.min(100, Math.round((progress / target) * 100));
              return (
                <PremiumCard key={c.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{c.title}</p>
                      {c.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {c.description}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {c.status === "COMPLETED" ? "Fertig" : "Aktiv"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400 tabular-nums">
                    <span>
                      {progress} / {target}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500/80"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </PremiumCard>
              );
            })
          )}
        </section>
      )}

      {tab === "ranks" && (
        <section className="space-y-3">
          <div className="flex gap-2">
            {(
              [
                ["workouts", "Workouts"],
                ["steps", "Schritte"],
                ["streak", "Streak"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRankMetric(id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  rankMetric === id
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-white/10 text-zinc-400"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {leaderboard.length === 0 ? (
            <PremiumCard>
              <p className="text-sm text-zinc-400 text-center py-6">
                Noch keine Ranglisten-Daten. Füge Freunde hinzu und trainiere.
              </p>
            </PremiumCard>
          ) : (
            leaderboard.map((row) => (
              <PremiumCard
                key={row.user.id}
                className={cn(
                  "flex items-center gap-3",
                  row.isMe && "border-accent/30"
                )}
              >
                <span
                  className={cn(
                    "w-8 text-center text-lg font-bold tabular-nums",
                    row.rank === 1
                      ? "text-amber-400"
                      : row.rank === 2
                        ? "text-zinc-300"
                        : row.rank === 3
                          ? "text-orange-400"
                          : "text-zinc-500"
                  )}
                >
                  {row.rank}
                </span>
                <UserAvatar
                  src={row.user.image}
                  name={row.user.name ?? row.user.username}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {displayHandle(row.user)}
                    {row.isMe ? " (du)" : ""}
                  </p>
                </div>
                <span className="text-sm font-bold text-cyan-400 tabular-nums">
                  {row.value.toLocaleString("de-DE")}
                </span>
              </PremiumCard>
            ))
          )}
        </section>
      )}
    </PageShell>
  );
}
