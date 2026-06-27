/** Light haptic feedback for premium mobile UX (PWA / Capacitor WebView). */

const canVibrate =
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

export function hapticTap() {
  if (!canVibrate) return;
  navigator.vibrate(8);
}

export function hapticSelect() {
  if (!canVibrate) return;
  navigator.vibrate(12);
}

export function hapticSuccess() {
  if (!canVibrate) return;
  navigator.vibrate([15, 40, 25]);
}

export function hapticWarning() {
  if (!canVibrate) return;
  navigator.vibrate([20, 30, 20]);
}
