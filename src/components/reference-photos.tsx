"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PhotoBooth } from "@/components/photo-booth";
import { copy } from "@/lib/copy";
import { isReferenceStripList } from "@/lib/photo-booth";
import type { ReferenceStrip } from "@/lib/types";

export function ReferencePhotos({
  clientId,
  strips: initialStrips = [],
}: {
  clientId: string;
  strips?: ReferenceStrip[];
}) {
  const router = useRouter();
  const [strips, setStrips] = useState(initialStrips);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    let stop = false;
    void fetch(`/api/clienti/${clientId}/foto`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (typeof body !== "object" || body === null || !("strips" in body)) return;
        if (!stop && isReferenceStripList(body.strips)) setStrips(body.strips);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [clientId, loaded]);

  const faces = strips.flatMap((strip) => strip.shots);
  return (
    <section className="mb-4">
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {faces.map((src, index) => (
          <button key={src} type="button" onClick={() => setSelected(src)} className="shrink-0">
            <Image
              src={src}
              alt={`${copy.photoOf} ${index + 1}`}
              width={112}
              height={144}
              unoptimized
              style={{ height: "4.5rem", width: "3.4rem" }}
              className="rounded-full object-cover"
            />
          </button>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-3">
          <span className="grid h-16 w-12 place-items-center rounded-full border border-[var(--ink)] font-serif text-lg">4</span>
          <span>{copy.shoot}</span>
        </button>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#111]/92 px-4" role="dialog" aria-modal="true" aria-label={copy.photoOf}>
          <Image
            src={selected}
            alt={copy.photoOf}
            width={720}
            height={960}
            unoptimized
            style={{ width: "min(100%, 24rem)", height: "auto", maxHeight: "75dvh" }}
            className="rounded-[42%] object-contain"
          />
          <button type="button" onClick={() => setSelected(null)} className="min-h-12 bg-[var(--sheet)] px-5 text-[var(--ink)]">
            {copy.close}
          </button>
        </div>
      ) : null}
      {open ? (
        <PhotoBooth
          clientId={clientId}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setLoaded((value) => value + 1);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}
