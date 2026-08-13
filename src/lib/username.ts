/** Username rules for community & registration. */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const USERNAME_REGEX = /^[a-z0-9_]+$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function isValidUsername(raw: string): boolean {
  const u = normalizeUsername(raw);
  return (
    u.length >= USERNAME_MIN &&
    u.length <= USERNAME_MAX &&
    USERNAME_REGEX.test(u)
  );
}

export function usernameError(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (u.length < USERNAME_MIN) return "Benutzername muss mindestens 3 Zeichen haben";
  if (u.length > USERNAME_MAX) return "Benutzername darf maximal 24 Zeichen haben";
  if (!USERNAME_REGEX.test(u)) {
    return "Nur Kleinbuchstaben, Zahlen und Unterstrich (_)";
  }
  return null;
}
