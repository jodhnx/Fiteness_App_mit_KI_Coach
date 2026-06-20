export const GUEST_EMAIL_SUFFIX = "@nexform.guest";

export function isGuestEmail(email: string): boolean {
  return email.toLowerCase().endsWith(GUEST_EMAIL_SUFFIX);
}
