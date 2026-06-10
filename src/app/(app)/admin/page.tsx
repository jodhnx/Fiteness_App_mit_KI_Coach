"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSupportPanel } from "@/components/admin/admin-support-panel";

type AdminStats = {
  userCount: number;
  sessionCount: number;
  aiTokens: number;
  aiRequests: number;
  users: { name: string; email: string; role: string; _count: { workoutPlans: number; aiChats: number } }[];
  errors: { message: string; route?: string; createdAt: string }[];
  logs: { action: string; createdAt: string; user?: { email: string } }[];
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Kein Admin-Zugriff");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!stats) return <p className="text-zinc-500">Lädt...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nutzer</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.userCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trainings</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.sessionCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">KI Tokens</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.aiTokens}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">KI Anfragen</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.aiRequests}</CardContent>
        </Card>
      </div>

      <AdminSupportPanel />

      <Card>
        <CardHeader>
          <CardTitle>Benutzerübersicht</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="pb-2">Name</th>
                <th>E-Mail</th>
                <th>Rolle</th>
                <th>Workouts</th>
                <th>Chats</th>
              </tr>
            </thead>
            <tbody>
              {stats.users.map((u) => (
                <tr key={u.email} className="border-t border-white/10">
                  <td className="py-2">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u._count.workoutPlans}</td>
                  <td>{u._count.aiChats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitäts-Logs</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto text-sm space-y-2">
            {stats.logs.map((l, i) => (
              <p key={i} className="text-zinc-400">
                {new Date(l.createdAt).toLocaleString("de-DE")} – {l.action}{" "}
                {l.user?.email && `(${l.user.email})`}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fehlerberichte</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto text-sm space-y-2">
            {stats.errors.length === 0 ? (
              <p className="text-zinc-500">Keine offenen Fehler</p>
            ) : (
              stats.errors.map((e, i) => (
                <p key={i} className="text-red-300">
                  {e.message} {e.route && `– ${e.route}`}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
