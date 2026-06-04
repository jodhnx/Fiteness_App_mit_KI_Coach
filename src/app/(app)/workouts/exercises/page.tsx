"use client";

import { useEffect, useState, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { ExerciseVisual } from "@/components/workout/exercise-visual";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BarChart2, Star } from "lucide-react";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { toast } from "sonner";

const MUSCLES = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "ABS",
  "FOREARMS",
  "CALVES",
  "CARDIO",
] as const;

const MUSCLE_DE: Record<string, string> = {
  CHEST: "Brust",
  BACK: "Rücken",
  SHOULDERS: "Schultern",
  BICEPS: "Bizeps",
  TRICEPS: "Trizeps",
  LEGS: "Beine",
  ABS: "Bauch",
  FOREARMS: "Unterarme",
  CALVES: "Waden",
  CARDIO: "Cardio",
};

type Exercise = {
  id: string;
  slug: string;
  name: string;
  muscleGroup: string;
  difficulty: string;
  description: string;
  instructions: string;
  imageUrl: string | null;
  equipment: string;
  primaryMuscles: string[];
  isCompound: boolean;
  ratingAvg?: number | null;
  popularity?: number;
  isFavorite?: boolean;
};

export default function ExercisesPage() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 250);
  const [muscle, setMuscle] = useState<string>("");
  const [equipment, setEquipment] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const searchUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "120", sort: "popularity" });
    if (debouncedQ) params.set("q", debouncedQ);
    if (muscle) params.set("muscle", muscle);
    if (equipment) params.set("equipment", equipment);
    if (difficulty) params.set("difficulty", difficulty);
    return `/api/exercises?${params}`;
  }, [debouncedQ, muscle, equipment, difficulty]);

  useEffect(() => {
    setLoading(true);
    fetch(searchUrl)
      .then((r) => r.json())
      .then((d) => setExercises(d.exercises ?? []))
      .finally(() => setLoading(false));
  }, [searchUrl]);

  useEffect(() => {
    fetch("/api/exercises?favorites=1")
      .then((r) => r.json())
      .then((d) => setFavorites(new Set((d.exercises ?? []).map((e: Exercise) => e.id))));
  }, []);

  async function toggleFavorite(id: string) {
    if (favorites.has(id)) {
      await fetch(`/api/exercises/favorites?exerciseLibraryId=${id}`, { method: "DELETE" });
      setFavorites((f) => {
        const n = new Set(f);
        n.delete(id);
        return n;
      });
    } else {
      await fetch("/api/exercises/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseLibraryId: id }),
      });
      setFavorites((f) => new Set(f).add(id));
      toast.success("Zu Favoriten hinzugefügt");
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/workouts" className="text-cyan-400 text-sm flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Training
      </Link>
      <WorkoutNav />
      <h1 className="text-3xl font-bold text-white">Übungsdatenbank</h1>
      <p className="text-zinc-400">230+ Übungen · Sofortsuche · Filter · Statistik</p>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Sofortsuche..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        {loading && <span className="text-xs text-cyan-400">Suche...</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={!muscle ? "default" : "secondary"} size="sm" onClick={() => setMuscle("")}>
          Alle
        </Button>
        {MUSCLES.map((m) => (
          <Button
            key={m}
            variant={muscle === m ? "default" : "secondary"}
            size="sm"
            onClick={() => setMuscle(m)}
          >
            {MUSCLE_DE[m]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          <option value="">Equipment</option>
          {["BARBELL", "DUMBBELL", "CABLE", "MACHINE", "BODYWEIGHT", "KETTLEBELL", "BAND"].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">Schwierigkeit</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setSelected(ex)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                selected?.id === ex.id
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex justify-between">
                <span className="font-medium text-white">{ex.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(ex.id);
                  }}
                >
                  <Star
                    className={`h-4 w-4 ${favorites.has(ex.id) ? "fill-cyan-400 text-cyan-400" : ""}`}
                  />
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                {MUSCLE_DE[ex.muscleGroup] ?? ex.muscleGroup} · {ex.difficulty} · {ex.equipment}
                {ex.ratingAvg != null && ` · ★ ${ex.ratingAvg.toFixed(1)}`}
                {ex.popularity != null && ` · ${ex.popularity}×`}
              </p>
            </button>
          ))}
        </div>

        {selected && (
          <Card className="sticky top-24">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{selected.name}</CardTitle>
                <Link href={`/workouts/exercises/${selected.id}`}>
                  <Button variant="outline" size="sm">
                    <BarChart2 className="h-4 w-4 mr-1" /> Statistik
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <ExerciseVisual
                name={selected.name}
                muscleGroup={selected.muscleGroup}
                imageUrl={selected.imageUrl}
                equipment={selected.equipment}
              />
              <p>{selected.description}</p>
              <div>
                <p className="text-cyan-400 font-medium mb-1">Ausführung</p>
                <pre className="whitespace-pre-wrap font-sans text-zinc-400">
                  {selected.instructions}
                </pre>
              </div>
              <p>
                <span className="text-zinc-500">Primär:</span>{" "}
                {selected.primaryMuscles.join(", ")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
