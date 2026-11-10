import { describe, expect, it } from "vitest";
import {
  canOpenSession,
  hashPin,
  pinAccepts,
  readSession,
  sessionStillValid,
  signSession,
  verifyPin,
} from "@/lib/session";

const KNOWN_HASH =
  "scrypt$00112233445566778899aabbccddeeff$a9d90a5b903041d430f3120a37e7dcb3bdc71c05ec54f79c2088ad704db11ba5";

describe("session pin", () => {
  it("does not open a session for a wrong PIN or a PIN that is not 4 digits", () => {
    expect(pinAccepts("123")).toBe(false);
    expect(pinAccepts("12345")).toBe(false);
    expect(pinAccepts("12a4")).toBe(false);
    expect(pinAccepts("")).toBe(false);
    expect(canOpenSession("123", KNOWN_HASH)).toBe(false);
    expect(canOpenSession("12345", KNOWN_HASH)).toBe(false);
    expect(canOpenSession("0000", KNOWN_HASH)).toBe(false);
    expect(canOpenSession("9999", KNOWN_HASH)).toBe(false);
    expect(verifyPin("0000", KNOWN_HASH)).toBe(false);
    expect(verifyPin("1234", KNOWN_HASH)).toBe(true);
    expect(canOpenSession("1234", KNOWN_HASH)).toBe(true);
  });

  it("matches the known hash produced with a fixed salt", () => {
    const salt = Buffer.from("00112233445566778899aabbccddeeff", "hex");
    expect(hashPin("1234", salt)).toBe(KNOWN_HASH);
  });

  it("rejects a session payload from the previous PIN version", () => {
    const secret = "test-session-secret-value";
    const token = signSession({ pinVersion: 1, exp: 2_000_000_000 }, secret);
    const payload = readSession(token, secret, 1_700_000_000);
    expect(payload?.pinVersion).toBe(1);
    expect(sessionStillValid(payload, 1)).toBe(true);
    expect(sessionStillValid(payload, 2)).toBe(false);
    expect(sessionStillValid(null, 1)).toBe(false);
    expect(readSession(`${token}x`, secret, 1_700_000_000)).toBeNull();
  });
});
