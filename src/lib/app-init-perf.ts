/** Internal boot timing — dev / DEBUG_BOOT only, never shown in UI. */

export type BootPerfMark =
  | "auth_start"
  | "auth_end"
  | "cache_hydrate_start"
  | "cache_hydrate_end"
  | "bootstrap_start"
  | "bootstrap_end"
  | "home_apply_start"
  | "home_apply_end"
  | "profile_apply_end"
  | "nutrition_apply_end"
  | "progress_apply_end"
  | "boot_ready";

const marks = new Map<string, number>();
let bootT0 = 0;

function enabled() {
  return (
    typeof window !== "undefined" &&
    (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_BOOT === "1")
  );
}

export function bootPerfReset() {
  bootT0 = performance.now();
  marks.clear();
  bootPerfMark("auth_start");
}

export function bootPerfMark(name: BootPerfMark) {
  if (!enabled()) return;
  marks.set(name, performance.now());
  if (name === "boot_ready") {
    const lines: string[] = [];
    for (const [k, t] of marks) {
      lines.push(`  ${k}: +${Math.round(t - bootT0)}ms`);
    }
    console.info("[boot-perf] ready\n" + lines.join("\n"));
  }
}

export function bootPerfDelta(from: BootPerfMark, to: BootPerfMark): number | null {
  const a = marks.get(from);
  const b = marks.get(to);
  if (a == null || b == null) return null;
  return Math.round(b - a);
}
