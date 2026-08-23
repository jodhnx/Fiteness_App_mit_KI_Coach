/**
 * Minimal server-side client for a PRIVATE Supabase Storage bucket.
 *
 * Uses the Storage REST API directly so no extra dependency is required.
 * The service role key must never be exposed to the client — every function
 * in this module is meant to run on the server only.
 */

export const PROGRESS_PHOTO_BUCKET = "progress-photos";

/** Signed URLs are only used to deliver a single image render. */
export const SIGNED_URL_TTL_SECONDS = 60;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("STORAGE_NOT_CONFIGURED");
    this.name = "StorageNotConfiguredError";
  }
}

export class StorageRequestError extends Error {
  readonly status: number;
  constructor(operation: string, status: number, detail: string) {
    super(`Storage ${operation} failed (${status}): ${detail}`);
    this.name = "StorageRequestError";
    this.status = status;
  }
}

function readConfig(): { baseUrl: string; serviceKey: string } | null {
  const baseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!baseUrl || !serviceKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), serviceKey };
}

export function isPrivateStorageConfigured(): boolean {
  return readConfig() !== null;
}

function requireConfig() {
  const config = readConfig();
  if (!config) throw new StorageNotConfiguredError();
  return config;
}

function authHeaders(serviceKey: string): Record<string, string> {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
}

/**
 * Object keys are always generated server-side. This guard exists so a
 * malformed or tampered value can never escape its intended prefix.
 */
export function isSafeObjectKey(key: string): boolean {
  if (!key || key.length > 300) return false;
  if (key.startsWith("/") || key.endsWith("/")) return false;
  if (key.includes("..") || key.includes("//") || key.includes("\\")) return false;
  return /^[A-Za-z0-9._/-]+$/.test(key);
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export async function uploadPrivateObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (!isSafeObjectKey(key)) throw new Error("INVALID_OBJECT_KEY");
  const { baseUrl, serviceKey } = requireConfig();

  const res = await fetch(
    `${baseUrl}/storage/v1/object/${PROGRESS_PHOTO_BUCKET}/${encodeKey(key)}`,
    {
      method: "POST",
      headers: {
        ...authHeaders(serviceKey),
        "Content-Type": contentType,
        "cache-control": "private, max-age=31536000",
        // Re-uploading the same key replaces it instead of failing.
        "x-upsert": "true",
      },
      body: new Uint8Array(body),
    }
  );

  if (!res.ok) {
    throw new StorageRequestError("upload", res.status, await res.text());
  }
}

/** Short-lived signed URL for one image delivery. Caller must authorize first. */
export async function createSignedObjectUrl(
  key: string,
  expiresIn = SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  if (!isSafeObjectKey(key)) throw new Error("INVALID_OBJECT_KEY");
  const { baseUrl, serviceKey } = requireConfig();

  const res = await fetch(
    `${baseUrl}/storage/v1/object/sign/${PROGRESS_PHOTO_BUCKET}/${encodeKey(key)}`,
    {
      method: "POST",
      headers: { ...authHeaders(serviceKey), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn }),
      cache: "no-store",
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new StorageRequestError("sign", res.status, await res.text());
  }

  const data = (await res.json()) as { signedURL?: string };
  if (!data.signedURL) return null;
  // The API returns a path relative to /storage/v1.
  return `${baseUrl}/storage/v1${data.signedURL}`;
}

/** Returns true when the object is gone afterwards (deleted or already absent). */
export async function deletePrivateObject(key: string): Promise<boolean> {
  if (!isSafeObjectKey(key)) throw new Error("INVALID_OBJECT_KEY");
  const { baseUrl, serviceKey } = requireConfig();

  const res = await fetch(
    `${baseUrl}/storage/v1/object/${PROGRESS_PHOTO_BUCKET}/${encodeKey(key)}`,
    { method: "DELETE", headers: authHeaders(serviceKey), cache: "no-store" }
  );

  if (res.ok || res.status === 404) return true;
  throw new StorageRequestError("delete", res.status, await res.text());
}
