const enabled = () => process.env.DEBUG_DB === "1";

export function logDatabaseConnected() {
  if (enabled()) console.log("DATABASE CONNECTED");
}

export function logDatabaseQueryStart(label: string) {
  if (enabled()) console.log("DATABASE QUERY START", label);
}

export function logDatabaseQuerySuccess(label: string) {
  if (enabled()) console.log("DATABASE QUERY SUCCESS", label);
}

export function logDatabaseError(error: unknown) {
  if (enabled()) {
    console.error("DATABASE ERROR", error);
  }
}
