"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReferencePhotos } from "@/components/reference-photos";
import { VisitPhotosFields } from "@/components/visit-photos";
import { copy } from "@/lib/copy";
import type { ClientDetail, ClientVisitRow, ReferenceStrip } from "@/lib/types";
import { redirectIfUnauthorized } from "@/lib/unauthorized";

export function ClientForm({ client, strips }: { client: ClientDetail; strips: ReferenceStrip[] }) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [note, setNote] = useState(client.note);
  const [likes, setLikes] = useState(client.likes);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/clienti/${client.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, note, likes }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (redirectIfUnauthorized(response.status)) return;
      if (!response.ok) {
        setError(body.error ?? copy.offline);
        return;
      }
      router.refresh();
    } catch {
      setError(copy.offline);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-4">
      <Link href="/giorno" className="inline-flex min-h-12 items-center text-[#243246]">
        {copy.backToDay}
      </Link>
      <h1 className="mt-2 mb-4 font-serif text-3xl">{client.name}</h1>
      <form onSubmit={onSubmit} className="rounded-3xl bg-[#fffaf3] p-4">
        <label className="mb-3 block">
          <span className="text-sm font-medium">{copy.nome}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 text-lg"
          />
        </label>
        <label className="mb-3 block">
          <span className="text-sm font-medium">{copy.telefono}</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 text-lg"
          />
        </label>
        <div className="mb-3">
          <span className="text-sm font-medium">{copy.likes}</span>
          <ul className="mt-2 space-y-2">
            {likes.map((line, index) => (
              <li key={`${line}-${index}`} className="flex items-center gap-2">
                <span className="flex-1 rounded-xl bg-white px-3 py-2">{line}</span>
                <button
                  type="button"
                  onClick={() => setLikes(likes.filter((_, item) => item !== index))}
                  className="min-h-10 px-2 text-sm text-[#9c3b2e]"
                >
                  {copy.remove}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-12 flex-1 rounded-xl border border-[#e2d8c8] bg-white px-3 text-lg"
            />
            <button
              type="button"
              onClick={() => {
                const text = draft.trim();
                if (!text) return;
                setLikes([...likes, text]);
                setDraft("");
              }}
              className="min-h-12 rounded-xl bg-[#243246] px-3 text-white"
            >
              {copy.addLike}
            </button>
          </div>
        </div>
        <label className="mb-3 block">
          <span className="text-sm font-medium">{copy.note}</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            className="mt-1 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 py-3 text-lg"
          />
        </label>
        {error ? (
          <p className="mb-3 text-[#9c3b2e]" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="min-h-14 w-full rounded-2xl bg-[#1e1a16] text-lg text-white">
          {copy.save}
        </button>
      </form>
      <ReferencePhotos clientId={client.id} strips={strips} />
      <h2 className="mt-8 mb-2 font-serif text-2xl">{copy.visits}</h2>
      <ul className="space-y-3">
        {client.visits.map((visit) => (
          <VisitFile key={visit.id} visit={visit} />
        ))}
      </ul>
    </main>
  );
}

function VisitFile({ visit }: { visit: ClientVisitRow }) {
  const [request, setRequest] = useState(visit.request);
  const [photos, setPhotos] = useState(visit.photos);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveRequest() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/visite/${visit.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (redirectIfUnauthorized(response.status)) return;
      if (!response.ok) setError(body.error ?? copy.offline);
    } catch {
      setError(copy.offline);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="rounded-2xl bg-[#fffaf3] px-3 py-3">
      <Link href={`/giorno?d=${visit.dateKey}`} className="inline-flex min-h-10 items-center text-sm text-[#243246]">
        {copy.openDay}
      </Link>
      <span className="block font-medium">{visit.when}</span>
      <span className="mb-2 block text-sm text-[#5c5348]">
        {visit.stylistName}
        {visit.service ? ` · ${visit.service}` : ""} · {visit.status}
      </span>
      <label className="mb-2 block">
        <span className="text-sm font-medium">{copy.request}</span>
        <textarea
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 py-2 text-base"
        />
      </label>
      <button
        type="button"
        onClick={saveRequest}
        disabled={pending}
        className="mb-3 min-h-12 rounded-xl bg-[#1e1a16] px-4 text-white"
      >
        {copy.save}
      </button>
      <VisitPhotosFields visitId={visit.id} photos={photos} onPhotos={setPhotos} />
      {error ? (
        <p className="text-[#9c3b2e]" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
