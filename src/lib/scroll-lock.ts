/** Reference-counted body scroll lock — safe for nested modals/sheets. */

let lockCount = 0;

export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    document.body.style.overflow = "hidden";
    document.body.dataset.scrollLock = "1";
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
    delete document.body.dataset.scrollLock;
  }
}

/** Force-clear all scroll locks (safety net after modal close). */
export function resetBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  document.body.style.overflow = "";
  delete document.body.dataset.scrollLock;
  delete document.body.dataset.foodAddPopup;
  delete document.body.dataset.mobileSheet;
}
