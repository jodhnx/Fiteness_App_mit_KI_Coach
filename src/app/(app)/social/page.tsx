"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Friend = {
  id: string;
  status: string;
  initiator: { id: string; name: string; email: string };
  receiver: { id: string; name: string; email: string };
};

export default function SocialPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [email, setEmail] = useState("");

  function load() {
    fetch("/api/social/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function sendRequest() {
    const res = await fetch("/api/social/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success("Anfrage gesendet");
    setEmail("");
    load();
  }

  async function accept(id: string) {
    await fetch("/api/social/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "accept" }),
    });
    toast.success("Freundschaft angenommen");
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Social</h1>

      <Card>
        <CardHeader>
          <CardTitle>Freund hinzufügen</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>E-Mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <Button className="self-end" onClick={sendRequest}>
            Anfrage senden
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Freunde & Anfragen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {friends.map((f) => (
            <div key={f.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {f.initiator.name ?? f.initiator.email} ↔ {f.receiver.name ?? f.receiver.email}
                </p>
                <p className="text-sm text-zinc-500">{f.status}</p>
              </div>
              {f.status === "PENDING" && (
                <Button size="sm" onClick={() => accept(f.id)}>
                  Annehmen
                </Button>
              )}
            </div>
          ))}
          {friends.length === 0 && <p className="text-zinc-500">Noch keine Verbindungen</p>}
        </CardContent>
      </Card>
    </div>
  );
}
