import "server-only";
import { inspectPhoto, isPhotoKind, type PhotoKind } from "@/lib/client-file";
import { messageForCode } from "@/lib/messages";
import type { VisitPhotos } from "@/lib/types";
import { photoSlots } from "@/server/day";
import { getPrisma } from "@/server/prisma";

async function ownedVisit(salonId: string, visitId: string) {
  return getPrisma().appointment.findFirst({
    where: { id: visitId, salonId },
    select: { id: true },
  });
}

export async function saveVisitRequest(
  salonId: string,
  visitId: string,
  request: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const visit = await ownedVisit(salonId, visitId);
  if (!visit) return { ok: false, error: messageForCode("closed") };
  await getPrisma().appointment.update({
    where: { id: visitId },
    data: { request: request.trim() },
  });
  return { ok: true };
}

export async function saveVisitPhoto(
  salonId: string,
  visitId: string,
  kind: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<{ ok: true; photos: VisitPhotos } | { ok: false; error: string }> {
  if (!isPhotoKind(kind)) return { ok: false, error: messageForCode("photo_type") };
  const checked = inspectPhoto(contentType, bytes.byteLength);
  if (!checked.ok) return { ok: false, error: messageForCode(checked.code) };
  const visit = await ownedVisit(salonId, visitId);
  if (!visit) return { ok: false, error: messageForCode("closed") };
  const prisma = getPrisma();
  await prisma.visitPhoto.deleteMany({ where: { appointmentId: visitId, kind } });
  const stored = new Uint8Array(bytes.byteLength);
  stored.set(bytes);
  await prisma.visitPhoto.create({
    data: { appointmentId: visitId, kind, contentType, bytes: stored },
  });
  return { ok: true, photos: await loadPhotos(visitId) };
}

export async function removeVisitPhoto(
  salonId: string,
  visitId: string,
  kind: string,
): Promise<{ ok: true; photos: VisitPhotos } | { ok: false; error: string }> {
  if (!isPhotoKind(kind)) return { ok: false, error: messageForCode("photo_type") };
  const visit = await ownedVisit(salonId, visitId);
  if (!visit) return { ok: false, error: messageForCode("closed") };
  await getPrisma().visitPhoto.deleteMany({ where: { appointmentId: visitId, kind } });
  return { ok: true, photos: await loadPhotos(visitId) };
}

export async function readVisitPhoto(salonId: string, photoId: string) {
  const photo = await getPrisma().visitPhoto.findFirst({
    where: { id: photoId, appointment: { salonId } },
    select: { bytes: true, contentType: true },
  });
  if (!photo) return null;
  return photo;
}

async function loadPhotos(visitId: string): Promise<VisitPhotos> {
  const photos = await getPrisma().visitPhoto.findMany({
    where: { appointmentId: visitId },
    select: { id: true, kind: true },
  });
  return photoSlots(photos);
}

export type { PhotoKind };
