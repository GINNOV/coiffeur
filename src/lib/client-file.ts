export const LIKE_MAX = 120;
export const LIKE_COUNT_MAX = 30;
export const PHOTO_MAX_BYTES = 3_000_000;

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PhotoKind = "prima" | "dopo";

export function isPhotoKind(value: string): value is PhotoKind {
  return value === "prima" || value === "dopo";
}

export function normalizeLikes(
  lines: string[],
): { ok: true; likes: string[] } | { ok: false; code: "like_long" | "like_many" } {
  const likes: string[] = [];
  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;
    if (text.length > LIKE_MAX) return { ok: false, code: "like_long" };
    likes.push(text);
  }
  if (likes.length > LIKE_COUNT_MAX) return { ok: false, code: "like_many" };
  return { ok: true, likes };
}

export function inspectPhoto(
  contentType: string,
  size: number,
): { ok: true } | { ok: false; code: "photo_type" | "photo_big" } {
  if (!PHOTO_TYPES.has(contentType)) return { ok: false, code: "photo_type" };
  if (size <= 0 || size > PHOTO_MAX_BYTES) return { ok: false, code: "photo_big" };
  return { ok: true };
}
