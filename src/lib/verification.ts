export function isEmailVerificationEnabled(): boolean {
  return false;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function verificationExpiresAt(): Date {
  return new Date(Date.now() + 15 * 60 * 1000);
}

export function isEmailVerified(emailVerified: Date | null | undefined): boolean {
  return emailVerified instanceof Date;
}
