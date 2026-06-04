export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function verificationExpiresAt(): Date {
  return new Date(Date.now() + 15 * 60 * 1000);
}

export function isEmailVerified(emailVerified: Date | null | undefined): boolean {
  return emailVerified instanceof Date;
}

/** Default: verification required. Set EMAIL_VERIFICATION=false to skip e-mail step. */
export function isEmailVerificationEnabled(): boolean {
  const raw = process.env.EMAIL_VERIFICATION?.trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}
