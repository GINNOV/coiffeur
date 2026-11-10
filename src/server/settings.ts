import "server-only";
import { copy } from "@/lib/copy";
import { canOpenSession, hashPin, pinAccepts } from "@/lib/session";
import { setSessionCookie } from "@/server/auth";
import { getPrisma } from "@/server/prisma";

export async function renameColumns(
  salonId: string,
  names: { id: string; name: string }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (names.length !== 2) return { ok: false, error: copy.writeName };
  for (const entry of names) {
    const name = entry.name.trim();
    if (!name) return { ok: false, error: copy.writeName };
    if (name.length > 40) return { ok: false, error: copy.writeName };
  }
  const prisma = getPrisma();
  const stylists = await prisma.stylist.findMany({ where: { salonId } });
  const ids = new Set(stylists.map((stylist) => stylist.id));
  if (!names.every((entry) => ids.has(entry.id))) return { ok: false, error: copy.writeName };
  await prisma.$transaction(
    names.map((entry) =>
      prisma.stylist.update({
        where: { id: entry.id },
        data: { name: entry.name.trim() },
      }),
    ),
  );
  return { ok: true };
}

export async function changePin(
  salonId: string,
  input: { currentPin: string; nextPin: string; confirmPin: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.nextPin !== input.confirmPin) return { ok: false, error: copy.pinMismatch };
  if (!pinAccepts(input.nextPin) || !pinAccepts(input.currentPin)) {
    return { ok: false, error: copy.pinInvalid };
  }
  const prisma = getPrisma();
  const salon = await prisma.salon.findFirst({ where: { id: salonId } });
  if (!salon || !canOpenSession(input.currentPin, salon.pinHash)) {
    return { ok: false, error: copy.pinInvalid };
  }
  const updated = await prisma.salon.update({
    where: { id: salon.id },
    data: { pinHash: hashPin(input.nextPin), pinVersion: { increment: 1 } },
  });
  await setSessionCookie(updated.pinVersion);
  return { ok: true };
}
