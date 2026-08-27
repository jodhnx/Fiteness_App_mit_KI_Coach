export default function SettingsLoading() {
  return (
    <div className="space-y-4 pb-24 animate-pulse" aria-busy="true" aria-label="Einstellungen laden">
      <div className="h-8 w-40 rounded-lg bg-white/5" />
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-4 space-y-3">
        <div className="h-4 w-28 rounded bg-white/5" />
        <div className="h-11 w-full rounded-xl bg-white/5" />
        <div className="h-11 w-full rounded-xl bg-white/5" />
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-4 space-y-3">
        <div className="h-4 w-32 rounded bg-white/5" />
        <div className="h-11 w-full rounded-xl bg-white/5" />
        <div className="h-11 w-2/3 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
