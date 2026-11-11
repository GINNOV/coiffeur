import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isPhotoId, SHOT_COUNT } from "@/lib/photo-booth";
import type { ReferenceStrip } from "@/lib/types";

const JPEG_START = Buffer.from([0xff, 0xd8, 0xff]);
const MAX_BYTES = 1_500_000;

export function photoRoot(): string {
  const configured = process.env.PHOTO_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data", "photos");
}

export function isJpeg(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes.length <= MAX_BYTES && bytes.subarray(0, 3).equals(JPEG_START);
}

export function newStripId(now: number, suffix: string): string {
  return `${now.toString(10).padStart(13, "0")}-${suffix}`;
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function clientDir(clientId: string): string | null {
  if (!isPhotoId(clientId)) return null;
  const root = path.resolve(photoRoot());
  const dir = path.resolve(root, clientId);
  if (dir !== path.join(root, clientId)) return null;
  return dir;
}

function stripDir(clientId: string, stripId: string): string | null {
  if (!isPhotoId(stripId)) return null;
  const parent = clientDir(clientId);
  if (!parent) return null;
  const dir = path.resolve(parent, stripId);
  if (dir !== path.join(parent, stripId)) return null;
  return dir;
}

export async function saveStrip(clientId: string, shots: Buffer[]): Promise<string | null> {
  if (shots.length !== SHOT_COUNT || shots.some((shot) => !isJpeg(shot))) return null;
  const parent = clientDir(clientId);
  if (!parent) return null;
  const id = newStripId(Date.now(), randomBytes(4).toString("hex"));
  const dir = stripDir(clientId, id);
  if (!dir) return null;
  await mkdir(dir, { recursive: true });
  try {
    for (const [index, shot] of shots.entries()) {
      await writeFile(path.join(dir, `${index + 1}.jpg`), shot);
    }
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
  return id;
}

export async function listReferenceStrips(clientId: string): Promise<ReferenceStrip[]> {
  const parent = clientDir(clientId);
  if (!parent) return [];
  let names: string[];
  try {
    names = await readdir(parent);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  const strips: ReferenceStrip[] = [];
  const ordered = names.filter(isPhotoId).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  for (const id of ordered) {
    const dir = stripDir(clientId, id);
    if (!dir) continue;
    let files: string[];
    try {
      files = await readdir(dir);
    } catch (error) {
      if (isMissing(error)) continue;
      throw error;
    }
    if (!["1.jpg", "2.jpg", "3.jpg", "4.jpg"].every((name) => files.includes(name))) continue;
    strips.push({
      id,
      shots: [1, 2, 3, 4].map((shot) => `/api/clienti/${clientId}/foto/${id}/${shot}`),
    });
  }
  return strips;
}

export async function readShot(clientId: string, stripId: string, index: 1 | 2 | 3 | 4): Promise<Buffer | null> {
  const dir = stripDir(clientId, stripId);
  if (!dir) return null;
  try {
    return await readFile(path.join(dir, `${index}.jpg`));
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}
