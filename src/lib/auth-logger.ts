/** Structured auth logs — only when DEBUG_AUTH=1 */
export const AuthLog = {
  LOGIN_ATTEMPT: "LOGIN ATTEMPT",
  USER_FOUND: "USER FOUND",
  USER_NOT_FOUND: "USER NOT FOUND",
  PASSWORD_VALID: "PASSWORD VALID",
  PASSWORD_INVALID: "PASSWORD INVALID",
  EMAIL_NOT_VERIFIED: "EMAIL NOT VERIFIED",
  SESSION_CREATED: "SESSION CREATED",
  REDIRECT_SUCCESS: "REDIRECT SUCCESS",
  AUTH_ERROR: "AUTH ERROR",
  RATE_LIMITED: "RATE LIMITED",
  DB_UNAVAILABLE: "DB UNAVAILABLE",
} as const;

const enabled = () => process.env.DEBUG_AUTH === "1";

export function logAuth(
  tag: (typeof AuthLog)[keyof typeof AuthLog],
  detail?: Record<string, unknown> | string
) {
  if (!enabled()) return;
  if (detail === undefined) {
    console.log(tag);
    return;
  }
  if (typeof detail === "string") {
    console.log(tag, detail);
    return;
  }
  console.log(tag, detail);
}
