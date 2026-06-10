"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SUPPORT_STATUS_LABELS, supportCategoryLabel } from "@/lib/support-config";
import type { SupportCategory, SupportRequestStatus } from "@prisma/client";
import { toast } from "sonner";

type SupportRow = {
  id: string;
  name: string;
  email: string;
  category: SupportCategory;
  message: string;
  status: SupportRequestStatus;
  createdAt: string;
  userId: string | null;
  user: { id: string; name: string | null; email: string } | null;
};

type SupportPayload = {
  requests: SupportRow[];
  statusCounts: Record<SupportRequestStatus, number>;
};

const STATUS_TABS: SupportRequestStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];

export function AdminSupportPanel() {
  const [data, setData] = useState<SupportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SupportRequestStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/admin/support?${params}`);
      if (!res.ok) throw new Error("Laden fehlgeschlagen");
      const json = (await res.json()) as SupportPayload;
      setData(json);
    } catch {
      toast.error("Support-Anfragen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: SupportRequestStatus) {
    const res = await fetch(`/api/admin/support?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Status konnte nicht gespeichert werden");
      return;
    }
    toast.success("Status aktualisiert");
    void load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support-Anfragen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusFilter === "ALL" ? "bg-cyan-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            Alle ({data ? Object.values(data.statusCounts).reduce((a, b) => a + b, 0) : 0})
          </button>
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                statusFilter === s ? "bg-cyan-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {SUPPORT_STATUS_LABELS[s]} ({data?.statusCounts[s] ?? 0})
            </button>
          ))}
        </div>

        <Input
          placeholder="Suchen (Name, E-Mail, Nachricht)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && <p className="text-sm text-zinc-500">Lädt…</p>}

        {!loading && data?.requests.length === 0 && (
          <p className="text-sm text-zinc-500">Keine Anfragen gefunden.</p>
        )}

        <div className="space-y-3 max-h-[480px] overflow-y-auto">
          {data?.requests.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 space-y-2 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{r.name}</p>
                  <p className="text-zinc-500 text-xs">{r.email}</p>
                </div>
                <span className="text-xs rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">
                  {supportCategoryLabel(r.category)}
                </span>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap line-clamp-4">{r.message}</p>
              <p className="text-[10px] text-zinc-600">
                {new Date(r.createdAt).toLocaleString("de-DE")}
                {r.userId ? ` · User ${r.userId.slice(0, 8)}…` : ""}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {STATUS_TABS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={r.status === s ? "default" : "outline"}
                    onClick={() => void updateStatus(r.id, s)}
                  >
                    {SUPPORT_STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
