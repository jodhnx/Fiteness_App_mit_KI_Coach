export default function SettingsLoading() {
  return (
    <div
      className="space-y-4 pb-24 animate-pulse"
      aria-busy="true"
      aria-label="Einstellungen laden"
    >
      <div className="h-8 w-40 rounded-lg bg-zinc-200 dark:bg-white/5" />
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3 shadow-sm dark:border-white/[0.06] dark:bg-zinc-900/50 dark:shadow-none">
        <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-white/5" />
        <div className="h-11 w-full rounded-xl bg-zinc-100 dark:bg-white/5" />
        <div className="h-11 w-full rounded-xl bg-zinc-100 dark:bg-white/5" />
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3 shadow-sm dark:border-white/[0.06] dark:bg-zinc-900/50 dark:shadow-none">
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-white/5" />
        <div className="h-11 w-full rounded-xl bg-zinc-100 dark:bg-white/5" />
        <div className="h-11 w-2/3 rounded-xl bg-zinc-100 dark:bg-white/5" />
      </div>
    </div>
  );
}
