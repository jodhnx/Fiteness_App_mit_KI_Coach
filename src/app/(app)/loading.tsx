/** Soft branded frame during route transitions — never a blank black screen. */
export default function AppLoading() {
  return (
    <div className="min-h-[50dvh] flex flex-col items-center justify-center gap-4 px-6 py-16">
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm px-8 py-7 flex flex-col items-center gap-3 shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-zinc-950 font-extrabold text-sm tracking-wide shadow-[0_0_32px_rgba(34,211,238,0.35)]">
          NX
        </div>
        <p className="text-xs font-semibold tracking-[0.2em] text-zinc-300 uppercase">
          NEXFORM
        </p>
        <p className="text-[11px] text-zinc-500 text-center max-w-[12rem] leading-relaxed">
          Deine Fitnessdaten werden vorbereitet …
        </p>
        <div className="h-0.5 w-28 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}
