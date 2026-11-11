"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import type { VisitPhotos } from "@/lib/types";
import { redirectIfUnauthorized } from "@/lib/unauthorized";

export function VisitPhotosFields({
  visitId,
  photos,
  onPhotos,
}: {
  visitId: string | null;
  photos: VisitPhotos;
  onPhotos: (photos: VisitPhotos) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function upload(kind: "prima" | "dopo", file: File | undefined) {
    if (!visitId || !file) return;
    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch(`/api/visite/${visitId}/foto`, { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; photos?: VisitPhotos };
      if (redirectIfUnauthorized(response.status)) return;
      if (!response.ok || !payload.photos) {
        setError(payload.error ?? copy.offline);
        return;
      }
      onPhotos(payload.photos);
    } catch {
      setError(copy.offline);
    } finally {
      setPending(false);
    }
  }

  async function remove(kind: "prima" | "dopo") {
    if (!visitId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/visite/${visitId}/foto?kind=${kind}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; photos?: VisitPhotos };
      if (redirectIfUnauthorized(response.status)) return;
      if (!response.ok || !payload.photos) {
        setError(payload.error ?? copy.offline);
        return;
      }
      onPhotos(payload.photos);
    } catch {
      setError(copy.offline);
    } finally {
      setPending(false);
    }
  }

  if (!visitId) {
    return <p className="mb-3 text-sm text-[#5c5348]">{copy.saveForPhotos}</p>;
  }

  return (
    <div className="mb-3">
      <div className="grid grid-cols-2 gap-2">
        <PhotoSlot
          label={copy.before}
          photoId={photos.prima}
          pending={pending}
          onFile={(file) => upload("prima", file)}
          onRemove={() => remove("prima")}
        />
        <PhotoSlot
          label={copy.after}
          photoId={photos.dopo}
          pending={pending}
          onFile={(file) => upload("dopo", file)}
          onRemove={() => remove("dopo")}
        />
      </div>
      {error ? (
        <p className="mt-2 text-[#9c3b2e]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PhotoSlot({
  label,
  photoId,
  pending,
  onFile,
  onRemove,
}: {
  label: string;
  photoId: string | null;
  pending: boolean;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[#f3efe6] p-2">
      <span className="text-sm font-medium">{label}</span>
      {photoId ? (
        // The photo route is same-origin and checks the PIN cookie. next/image would need a remote config.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/foto/${photoId}`} alt={label} className="mt-2 aspect-[3/4] w-full rounded-xl object-cover" />
      ) : (
        <div className="mt-2 grid aspect-[3/4] place-items-center rounded-xl border border-dashed border-[#c8bba8] text-sm text-[#8a7d6d]">
          {label}
        </div>
      )}
      <label className="mt-2 block">
        <span className="sr-only">{label}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            onFile(file);
          }}
          className="block w-full text-sm"
        />
      </label>
      {photoId ? (
        <button type="button" onClick={onRemove} disabled={pending} className="mt-2 min-h-10 text-sm text-[#9c3b2e]">
          {copy.remove}
        </button>
      ) : null}
    </div>
  );
}

