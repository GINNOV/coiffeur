import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "coiffeur_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  pinVersion: number;
  exp: number;
};

export function pinAccepts(input: string): boolean {
  return /^\d{4}$/.test(input);
}

export function hashPin(pin: string, salt: Buffer = randomBytes(16)): string {
  const hash = scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = scryptSync(pin, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function canOpenSession(pin: string, pinHash: string): boolean {
  if (!pinAccepts(pin)) return false;
  return verifyPin(pin, pinHash);
}

export function sessionStillValid(
  payload: { pinVersion: number } | null | undefined,
  currentPinVersion: number,
): boolean {
  if (!payload) return false;
  return payload.pinVersion === currentPinVersion;
}

export function signSession(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSession(token: string, secret: string, nowSeconds = Date.now() / 1000): SessionPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof parsed.pinVersion !== "number" || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= nowSeconds) return null;
    return parsed;
  } catch {
    return null;
  }
}
