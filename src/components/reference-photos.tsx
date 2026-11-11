"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoBooth } from "@/components/photo-booth";
import { copy } from "@/lib/copy";
import type { ReferenceStrip } from "@/lib/types";

export function ReferencePhotos({ clientId, strips }: { clientId: string; strips: ReferenceStrip[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-serif text-2xl">{copy.reference}</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-12 items-center rounded-full bg-[#243246] px-4 text-white"
        >
          {copy.shoot}
        </button>
      </div>
      {strips.length === 0 ? (
        <p className="rounded-3xl bg-[#fffaf3] px-4 py-5 text-[#5c5348]">{copy.noPhotos}</p>
      ) : (
        <ul className="space-y-3">
          {strips.map((strip) => (
            <li key={strip.id}>
              <ul className="flex gap-2 overflow-x-auto rounded-[2rem] bg-[#1e1a16] p-3">
                {strip.shots.map((src, index) => (
                  <li key={src} className="shrink-0">
                    <button type="button" onClick={() => setSelected(src)} className="block rounded-[50%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7d7b1]">
                      <Image
                        src={src}
                        alt={`${copy.photoOf} ${index + 1}`}
                        width={280}
                        height={400}
                        unoptimized
                        style={{ height: "10rem", width: "7rem" }}
                        className="rounded-[50%] object-cover ring-1 ring-[#e7d7b1]"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#14110e]/90 px-4" role="dialog" aria-modal="true" aria-label={copy.photoOf}>
          <Image
            src={selected}
            alt={copy.photoOf}
            width={720}
            height={960}
            unoptimized
            style={{ width: "min(100%, 24rem)", height: "auto", maxHeight: "75dvh" }}
            className="rounded-[42%] object-contain"
          />
          <button type="button" onClick={() => setSelected(null)} className="min-h-12 rounded-full bg-[#f3efe6] px-5 text-[#1e1a16]">
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
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}
