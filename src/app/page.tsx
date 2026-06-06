import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dumbbell, Bot, Trophy, Apple } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <div className="gradient-mesh min-h-screen">
      <header className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <span className="text-2xl font-extrabold tracking-tight">
          NEX<span className="text-cyan-400">FORM</span>
        </span>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost">Anmelden</Button>
          </Link>
          <Link href="/register">
            <Button>Registrieren</Button>
          </Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <p className="text-cyan-400 text-sm font-medium tracking-widest uppercase mb-4">
          HTL Diplomarbeit · SaaS Fitness Platform
        </p>
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Form deinen
          <br />
          <span className="text-cyan-400">nächsten Peak</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
          NEXFORM vereint Training, Ernährung, Fortschritt und KI-Coaching –
          präzise, schnell und mobil optimiert.
        </p>
        <Link href="/register">
          <Button size="lg">Kostenlos starten</Button>
        </Link>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-6">
        {[
          { icon: Dumbbell, title: "Training", desc: "Push Pull Legs, Upper Lower & mehr" },
          { icon: Apple, title: "Ernährung", desc: "Makros, Mahlzeiten & Lebensmittel-DB" },
          { icon: Bot, title: "KI Coach", desc: "Pläne, Analyse & Motivation" },
          { icon: Trophy, title: "Gamification", desc: "XP, Badges, Challenges & Rankings" },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6 text-center">
            <f.icon className="h-10 w-10 text-cyan-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-zinc-400">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-zinc-600 py-12 text-sm">
        © {new Date().getFullYear()} NEXFORM
      </footer>
    </div>
  );
}
