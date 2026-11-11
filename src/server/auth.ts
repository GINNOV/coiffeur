import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  readSession,
  sessionStillValid,
  signSession,
  type SessionPayload,
} from "@/lib/session";
import { getPrisma } from "@/server/prisma";

export function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}

export async function readSessionFromCookies(): Promise<SessionPayload | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSession(token, secret);
}

export async function setSessionCookie(pinVersion: number) {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const token = signSession(
    { pinVersion, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS },
    secret,
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function requireSalon() {
  const payload = await readSessionFromCookies();
  if (!payload) redirect("/accesso");
  const salon = await getPrisma().salon.findFirst({
    include: { stylists: { orderBy: { position: "asc" } } },
  });
  if (!salon || !sessionStillValid(payload, salon.pinVersion)) redirect("/accesso");
  return salon;
}

export async function requireApiSalon() {
  const payload = await readSessionFromCookies();
  if (!payload) {
    return { response: Response.json({ error: copy.pinInvalid }, { status: 401 }) } as const;
  }
  const salon = await getPrisma().salon.findFirst({
    include: { stylists: { orderBy: { position: "asc" } } },
  });
  if (!salon || !sessionStillValid(payload, salon.pinVersion)) {
    return { response: Response.json({ error: copy.pinInvalid }, { status: 401 }) } as const;
  }
  return { salon } as const;
}
