"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Watch } from "lucide-react";
import { toast } from "sonner";

const PROVIDERS = [
  { id: "FITBIT", name: "Fitbit", color: "text-teal-400" },
  { id: "GARMIN", name: "Garmin", color: "text-blue-400" },
  { id: "APPLE_HEALTH", name: "Apple Health", color: "text-red-400" },
  { id: "SAMSUNG_HEALTH", name: "Samsung Health", color: "text-indigo-400" },
];

export default function WearablesPage() {
  const [connections, setConnections] = useState<{ provider: string; isActive: boolean }[]>([]);

  useEffect(() => {
    fetch("/api/wearables")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []));
  }, []);

  async function connect(provider: string) {
    const res = await fetch("/api/wearables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error("Verbindung fehlgeschlagen");
      return;
    }
    toast.success(`${provider} vorbereitet – OAuth in Produktion`);
    setConnections((c) => [...c.filter((x) => x.provider !== provider), { provider, isActive: true }]);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <Watch className="text-cyan-400" /> Smartwatch Integration
      </h1>
      <p className="text-zinc-400 max-w-2xl">
        API-Endpunkte für Fitbit, Garmin, Apple Health und Samsung Health sind vorbereitet.
        In der Produktionsumgebung wird OAuth pro Provider aktiviert.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((p) => {
          const connected = connections.some((c) => c.provider === p.id && c.isActive);
          return (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className={p.color}>{p.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500 mb-4">
                  Sync: Schritte, Herzfrequenz, Kalorien, Schlaf
                </p>
                <Button
                  variant={connected ? "secondary" : "default"}
                  onClick={() => connect(p.id)}
                >
                  {connected ? "Verbunden" : "Verbinden"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
