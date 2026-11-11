export const SHOT_COUNT = 4;

const PHOTO_ID = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,78}[a-zA-Z0-9])?$/;

export function isPhotoId(value: string): boolean {
  return PHOTO_ID.test(value);
}

export function shotIndex(value: string): 1 | 2 | 3 | 4 | null {
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3") return 3;
  if (value === "4") return 4;
  return null;
}

export type SourceRect = { sx: number; sy: number; sw: number; sh: number };

/** Maps the on-screen head frame back to raw camera pixels. */
export function frameSourceRect(input: {
  videoWidth: number;
  videoHeight: number;
  elementWidth: number;
  elementHeight: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  mirrored: boolean;
}): SourceRect | null {
  const { videoWidth, videoHeight, elementWidth, elementHeight } = input;
  if (videoWidth < 2 || videoHeight < 2 || elementWidth < 2 || elementHeight < 2) return null;
  if (input.frameWidth < 2 || input.frameHeight < 2) return null;

  const scale = Math.max(elementWidth / videoWidth, elementHeight / videoHeight);
  const offsetX = (elementWidth - videoWidth * scale) / 2;
  const offsetY = (elementHeight - videoHeight * scale) / 2;
  const frameX = input.mirrored ? elementWidth - (input.frameX + input.frameWidth) : input.frameX;

  const rect = clampRect(
    {
      sx: (frameX - offsetX) / scale,
      sy: (input.frameY - offsetY) / scale,
      sw: input.frameWidth / scale,
      sh: input.frameHeight / scale,
    },
    videoWidth,
    videoHeight,
  );
  return rect;
}

function clampRect(rect: SourceRect, videoWidth: number, videoHeight: number): SourceRect | null {
  const x1 = Math.max(0, rect.sx);
  const y1 = Math.max(0, rect.sy);
  const x2 = Math.min(videoWidth, rect.sx + rect.sw);
  const y2 = Math.min(videoHeight, rect.sy + rect.sh);
  const sw = x2 - x1;
  const sh = y2 - y1;
  if (sw < 8 || sh < 8) return null;
  return { sx: x1, sy: y1, sw, sh };
}
