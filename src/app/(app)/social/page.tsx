"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Flame,
  Dumbbell,
  RefreshCw,
  Star,
  Footprints,
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

function feedIcon(type: string) {
  if (type === "workout" || type === "WORKOUT") return Dumbbell;
  if (type === "streak" || type === "STREAK") return Flame;
  if (type === "achievement" || type === "ACHIEVEMENT") return Star;
  if (type === "challenge" || type === "CHALLENGE") return Trophy;
  return Activity;
}

function feedColor(type: string) {
  if (type === "workout" || type === "WORKOUT") return "text-cyan-400 bg-cyan-500/10";
  if (type === "streak" || type === "STREAK") return "text-amber-400 bg-amber-500/10";
  if (type === "achievement" || type === "ACHIEVEMENT") return "text-violet-400 bg-violet-500/10";
  if (type === "challenge" || type === "CHALLENGE") return "text-emerald-400 bg-emerald-500/10";
  return "text-zinc-400 bg-zinc-800";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default function SocialPage() {
  const [tab, setTab] = useState<Tab>("feed");
  // Empty on first render to avoid SSR/hydration mismatch — populated from cache in useEffect
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [rankMetric, setRankMetric] = useState("workouts");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<{
    feed?: boolean;
    friends?: boolean;
    challenges?: boolean;
    ranks?: boolean;
  }>({});
  const debouncedQ = useDebounce(query, 250);

  // Hydrate from client cache on mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const cachedFriends = getCached<FriendRow[]>("social-friends", { allowStale: true });
    const cachedChallenges = getCached<ChallengeRow[]>("social-challenges", { allowStale: true });
    const cachedFeed = getCached<FeedItem[]>("social-feed", { allowStale: true });
    const cachedRanks = getCached<LeaderRow[]>("social-ranks-workouts", { allowStale: true });
    if (cachedFriends?.length) setFriends(cachedFriends);
    if (cachedChallenges?.length) setChallenges(cachedChallenges);
    if (cachedFeed?.length) setFeed(cachedFeed);
    if (cachedRanks?.length) setLeaderboard(cachedRanks);
  }, []);

  const load = useCallback(() => {
    setLoadingFeed(true);
    setSectionErrors({});
    const p1 = fetch("/api/social/friends", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("friends");
        return r.json();
      })
      .then((d) => {
        const list: FriendRow[] = d.friends ?? [];
        setFriends(list);
        setCached("social-friends", list, 120_000);
      })
      .catch(() => {
        setSectionErrors((e) => ({ ...e, friends: true }));
      });

    const p2 = fetch("/api/challenges", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("challenges");
        return r.json();
      })
      .then((d) => {
        const list: ChallengeRow[] = d.challenges ?? [];
        setChallenges(list);
        setCached("social-challenges", list, 120_000);
      })
      .catch(() => {
        setSectionErrors((e) => ({ ...e, challenges: true }));
      });

    const p3 = fetch("/api/social/feed", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("feed");
        return r.json();
      })
      .then((d) => {
        const list: FeedItem[] = d.feed ?? [];
        setFeed(list);
        setCached("social-feed", list, 90_000);
      })
      .catch(() => {
        setSectionErrors((e) => ({ ...e, feed: true }));
      });

    const p4 = fetch("/api/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.id) setMyId(d.user.id);
      })
      .catch(() => undefined);

    void Promise.all([p1, p2, p3, p4]).finally(() => setLoadingFeed(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== "ranks") return;
    const cacheKey = `social-ranks-${rankMetric}`;
    const cached = getCached<LeaderRow[]>(cacheKey, { allowStale: true });
    if (cached?.length) setLeaderboard(cached);
    void fetch(`/api/social/leaderboard?metric=${rankMetric}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("ranks");
        return r.json();
      })
      .then((d) => {
        const list: LeaderRow[] = d.leaderboard ?? [];
        setLeaderboard(list);
        setCached(cacheKey, list, 120_000);
        setSectionErrors((e) => ({ ...e, ranks: false }));
      })
      .catch(() => {
        setSectionErrors((e) => ({ ...e, ranks: true }));
      });
  }, [tab, rankMetric]);

  useEffect(() => {
    const q = debouncedQ.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    void fetch(`/api/social/friends?q=${encodeURIComponent(q)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d) => setResults(d.users ?? []))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQ]);

  const pendingIncoming = useMemo(
    () => friends.filter((f) => f.status === "PENDING" && myId && f.receiverId === myId),
    [friends, myId]
  );
  const pendingOutgoing = useMemo(
    () => friends.filter((f) => f.status === "PENDING" && myId && f.initiatorId === myId),
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error((data as { error?: string }).error ?? "Anfrage fehlgeschlagen"); return; }
    toast.success("Freundschaftsanfrage gesendet ✓");
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
      toast.error((data as { error?: string }).error ?? "Aktion fehlgeschlagen");
      return;
    }
    if (action === "accept") toast.success("Freundschaft angenommen ✓");
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
    { id: "feed", label: "Aktivität", icon: Flame },
    { id: "friends", label: "Freunde", icon: Users },
    { id: "challenges", label: "Challenges", icon: Trophy },
    { id: "ranks", label: "Rangliste", icon: Medal },
  ];

  return (
    <PageShell
      title="Community"
      className="pb-28 space-y-3"
      bottomNav={false}
    >
      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { hapticTap(); setTab(id); }}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-sm font-semibold min-h-[40px] transition-colors",
              tab === id
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-white/[0.07] bg-zinc-900/60 text-zinc-400 hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── FEED ── */}
      {tab === "feed" && (
        <section className="space-y-2.5">
          {sectionErrors.feed && (
            <p className="text-xs text-amber-400/90 px-1">
              Aktivität: Konnte gerade nicht aktualisiert werden.
            </p>
          )}
          {loadingFeed && feed.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 animate-pulse" />
              ))}
            </div>
          )}

          {!loadingFeed && feed.length === 0 && (
            <div className="rounded-3xl border border-dashed border-zinc-700/60 py-14 text-center space-y-3">
              <Activity className="h-10 w-10 text-zinc-600 mx-auto" />
              <div>
                <p className="text-sm font-medium text-zinc-400">Noch keine Aktivitäten</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Schließe ein Workout ab oder füge Freunde hinzu
                </p>
              </div>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Aktualisieren
              </button>
            </div>
          )}

          {feed.map((item) => {
            const FeedIcon = feedIcon(item.type);
            const colorClass = feedColor(item.type);
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-white/[0.07] bg-zinc-900/70 px-4 py-3 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar src={item.user.image} name={item.user.name ?? item.user.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {displayHandle(item.user)}
                    </p>
                    <p className="text-[10px] text-zinc-500">{timeAgo(item.createdAt)}</p>
                  </div>
                  <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center shrink-0", colorClass)}>
                    <FeedIcon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-base font-bold text-white mt-0.5">{item.subtitle}</p>
                  )}
                  {item.meta && (
                    <p className="text-xs text-zinc-500 mt-0.5">{item.meta}</p>
                  )}
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl"
            onClick={shareAchievement}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Fortschritt teilen
          </Button>
        </section>
      )}

      {/* ── FRIENDS ── */}
      {tab === "friends" && (
        <div className="space-y-3">
          {sectionErrors.friends && (
            <p className="text-xs text-amber-400/90 px-1">
              Freunde: Konnte gerade nicht aktualisiert werden.
            </p>
          )}
          {/* Search */}
          <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/70 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-accent shrink-0" />
              <h2 className="text-sm font-bold text-white">Benutzer suchen</h2>
            </div>
            <div className="relative">
              <Input
                placeholder="Benutzername eingeben …"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pr-10"
                autoComplete="off"
                autoCorrect="off"
              />
              {searching && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 animate-spin" />
              )}
            </div>

            {results.length > 0 && (
              <ul className="space-y-2">
                {results.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
                  >
                    <UserAvatar src={u.image} name={u.name ?? u.username} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{displayHandle(u)}</p>
                      {u.name && u.username && (
                        <p className="text-[11px] text-zinc-500 truncate">{u.name}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl shrink-0"
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
            {!searching && debouncedQ.trim().length >= 2 && results.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-2">
                Keine Benutzer gefunden
              </p>
            )}
          </div>

          {/* Incoming requests */}
          {pendingIncoming.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Anfragen ({pendingIncoming.length})
              </h2>
              {pendingIncoming.map((f) => {
                const other = f.initiator;
                return (
                  <div key={f.id} className="flex items-center gap-3 min-h-[44px]">
                    <UserAvatar src={other.image} name={other.name ?? other.username} size="sm" />
                    <p className="flex-1 text-sm font-medium text-zinc-200 truncate">
                      {displayHandle(other)}
                    </p>
                    <button
                      type="button"
                      onClick={() => void patchFriend(f.id, "accept")}
                      className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400"
                      aria-label="Annehmen"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void patchFriend(f.id, "reject")}
                      className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400"
                      aria-label="Ablehnen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Outgoing */}
          {pendingOutgoing.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-4 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Ausstehend ({pendingOutgoing.length})
              </h2>
              {pendingOutgoing.map((f) => {
                const other = f.receiver;
                return (
                  <div key={f.id} className="flex items-center gap-3">
                    <UserAvatar src={other.image} name={other.name ?? other.username} size="sm" />
                    <p className="flex-1 text-sm text-zinc-300 truncate">{displayHandle(other)}</p>
                    <button
                      type="button"
                      onClick={() => void patchFriend(f.id, "cancel")}
                      className="text-[11px] text-zinc-500 hover:text-red-400"
                    >
                      Abbrechen
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Friends list */}
          <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-4 space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Freunde ({accepted.length})
            </h2>
            {accepted.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <Users className="h-8 w-8 text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-500">
                  Noch keine Freunde — suche oben nach einem Benutzernamen
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {accepted.map((f) => {
                  const other =
                    f.other ??
                    (myId && f.initiatorId === myId ? f.receiver : f.initiator);
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5"
                    >
                      <UserAvatar src={other.image} name={other.name ?? other.username} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {displayHandle(other)}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-medium">Freunde</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void patchFriend(f.id, "remove")}
                        className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        Entfernen
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── CHALLENGES ── */}
      {tab === "challenges" && (
        <section className="space-y-2.5">
          {sectionErrors.challenges && (
            <p className="text-xs text-amber-400/90 px-1">
              Challenges: Konnte gerade nicht aktualisiert werden.
            </p>
          )}
          {challenges.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-700/60 py-14 text-center space-y-3">
              <Trophy className="h-10 w-10 text-zinc-600 mx-auto" />
              <div>
                <p className="text-sm font-medium text-zinc-400">Noch keine Challenges</p>
                <p className="text-xs text-zinc-600 mt-0.5">Challenges werden bald verfügbar</p>
              </div>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Aktualisieren
              </button>
            </div>
          ) : (
            challenges.map((c) => {
              const target = Math.max(1, c.targetDays ?? 1);
              const progress = c.progress ?? 0;
              const pct = Math.min(100, Math.round((progress / target) * 100));
              const done = c.status === "COMPLETED";
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-2xl border p-4 space-y-2.5",
                    done
                      ? "border-emerald-500/20 bg-emerald-950/10"
                      : "border-white/[0.07] bg-zinc-900/70"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{c.title}</p>
                      {c.description && (
                        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{c.description}</p>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wide shrink-0 px-2 py-0.5 rounded-lg",
                      done
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-cyan-400 bg-cyan-500/10"
                    )}>
                      {done ? "Fertig" : "Aktiv"}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1 tabular-nums">
                      <span>{progress} / {target}</span>
                      <span className="font-semibold text-white">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", done ? "bg-emerald-500" : "bg-cyan-500")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* ── RANKS ── */}
      {tab === "ranks" && (
        <section className="space-y-3">
          {sectionErrors.ranks && (
            <p className="text-xs text-amber-400/90 px-1">
              Rangliste: Konnte gerade nicht aktualisiert werden.
            </p>
          )}
          {/* Metric selector */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {(
              [
                ["workouts", "Workouts", Dumbbell],
                ["streak", "Streak", Flame],
                ["steps", "Schritte", Footprints],
                ["cardio", "Cardio", Activity],
                ["challenges", "Challenges", Trophy],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRankMetric(id)}
                className={cn(
                  "shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                  rankMetric === id
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-white/[0.07] bg-zinc-900/60 text-zinc-400"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {leaderboard.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-700/60 py-14 text-center space-y-3">
              <Medal className="h-10 w-10 text-zinc-600 mx-auto" />
              <div>
                <p className="text-sm font-medium text-zinc-400">Noch keine Ranglisten-Daten</p>
                <p className="text-xs text-zinc-600 mt-0.5">Füge Freunde hinzu und trainiere</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((row) => (
                <div
                  key={row.user.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3",
                    row.isMe
                      ? "border-accent/30 bg-accent/5"
                      : "border-white/[0.06] bg-zinc-900/60"
                  )}
                >
                  <span
                    className={cn(
                      "w-7 text-center text-base font-black tabular-nums shrink-0",
                      row.rank === 1 ? "text-amber-400" :
                      row.rank === 2 ? "text-zinc-300" :
                      row.rank === 3 ? "text-orange-400" :
                      "text-zinc-600"
                    )}
                  >
                    {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : row.rank}
                  </span>
                  <UserAvatar src={row.user.image} name={row.user.name ?? row.user.username} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {displayHandle(row.user)}
                      {row.isMe && <span className="text-accent/80 text-[11px] ml-1">(du)</span>}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-cyan-400 tabular-nums shrink-0">
                    {row.value.toLocaleString("de-DE")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}
