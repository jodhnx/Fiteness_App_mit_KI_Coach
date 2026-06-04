"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/user/avatar-upload";
import { useSession } from "next-auth/react";
import { ChevronRight } from "lucide-react";

export default function ProfilePage() {
  const { update: updateSession } = useSession();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    weightKg: "",
    heightCm: "",
    gender: "MALE",
    activityLevel: "MODERATE",
    trainingGoal: "GENERAL_FITNESS",
    bio: "",
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setUserImage(d.user?.image ?? null);
        setForm({
          name: d.user?.name ?? "",
          age: d.profile?.age?.toString() ?? "",
          weightKg: d.profile?.weightKg?.toString() ?? "",
          heightCm: d.profile?.heightCm?.toString() ?? "",
          gender: d.profile?.gender ?? "MALE",
          activityLevel: d.profile?.activityLevel ?? "MODERATE",
          trainingGoal: d.profile?.trainingGoal ?? "GENERAL_FITNESS",
          bio: d.profile?.bio ?? "",
        });
      });
  }, []);

  async function save() {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim().length >= 2 ? form.name.trim() : undefined,
        age: form.age ? Number(form.age) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        gender: form.gender,
        activityLevel: form.activityLevel,
        trainingGoal: form.trainingGoal,
        bio: form.bio || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Speichern fehlgeschlagen");
      return;
    }
    toast.success("Profil gespeichert – Makros berechnet");
  }

  return (
    <div className="space-y-6 max-w-2xl pb-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Fitness Profil</h1>
        <Link href="/settings" className="text-sm text-cyan-400 hover:underline shrink-0">
          Einstellungen →
        </Link>
      </div>
      <Link
        href="/erfolge"
        className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-violet-500/10 p-4 hover:border-amber-500/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-semibold text-white">Erfolge & Level</p>
            <p className="text-xs text-zinc-500">XP, Badges, Challenges, Trophäen</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-500" />
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Profilbild</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            imageUrl={userImage}
            name={form.name}
            onUpdated={async (url) => {
              setUserImage(url);
              await updateSession({ user: { image: url ?? undefined } });
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Alter</Label>
            <Input
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              type="number"
            />
          </div>
          <div>
            <Label>Gewicht (kg)</Label>
            <Input
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              type="number"
            />
          </div>
          <div>
            <Label>Größe (cm)</Label>
            <Input
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
              type="number"
            />
          </div>
          <div>
            <Label>Geschlecht</Label>
            <select
              className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="MALE">Männlich</option>
              <option value="FEMALE">Weiblich</option>
            </select>
          </div>
          <div>
            <Label>Aktivitätslevel</Label>
            <select
              className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
              value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
            >
              <option value="SEDENTARY">Kaum aktiv</option>
              <option value="LIGHT">Leicht aktiv</option>
              <option value="MODERATE">Aktiv</option>
              <option value="VERY_ACTIVE">Sehr aktiv</option>
            </select>
          </div>
          <div>
            <Label>Trainingsziel</Label>
            <select
              className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
              value={form.trainingGoal}
              onChange={(e) => setForm({ ...form, trainingGoal: e.target.value })}
            >
              <option value="GAIN_MUSCLE">Muskelaufbau</option>
              <option value="LOSE_WEIGHT">Fettabbau</option>
              <option value="GENERAL_FITNESS">Gesundheit</option>
              <option value="STRENGTH">Kraft</option>
              <option value="ENDURANCE">Ausdauer</option>
            </select>
          </div>
          <div>
            <Label>Bio</Label>
            <Input
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>
          <Button onClick={save} className="w-full">
            Speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
