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
    return <p className="mb-3 text-sm text-[var(--quiet)]">{copy.saveForPhotos}</p>;
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
        <p className="mt-2 text-[var(--alert)]" role="alert">
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
    <div>
      <label className="block">
        <span className="text-sm text-[var(--quiet)]">{label}</span>
        {photoId ? (
          // The photo route is same-origin and checks the PIN cookie. next/image would need a remote config.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/foto/${photoId}`} alt={label} className="mt-1 aspect-[3/4] w-full object-cover" />
        ) : (
          <span className="mt-1 grid aspect-[3/4] place-items-center border border-dashed border-[var(--rule)] text-sm text-[var(--quiet)]">
            {label}
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            onFile(file);
          }}
          className="sr-only"
        />
      </label>
      {photoId ? (
        <button type="button" onClick={onRemove} disabled={pending} className="mt-1 min-h-10 text-sm text-[var(--alert)]">
          {copy.remove}
        </button>
      ) : null}
    </div>
  );
}

