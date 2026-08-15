/** Soft branded frame during route transitions — never a blank black screen. */
export default function AppLoading() {
  return (
    <div className="min-h-[50dvh] flex flex-col items-center justify-center gap-3 px-6 py-16">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-zinc-950 font-extrabold text-sm tracking-wide shadow-[0_0_32px_rgba(34,211,238,0.35)]">
        NX
      </div>
      <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase">
        NEXFORM
      </p>
      <div className="h-0.5 w-24 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-cyan-400 animate-pulse" />
      </div>
    </div>
  );
}
