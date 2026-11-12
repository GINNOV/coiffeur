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
    <main className="mx-auto max-w-lg px-5 py-4">
      <h1 className="sr-only">{client.name}</h1>
      <form onSubmit={onSubmit} className="mt-2">
        <label className="mb-3 block">
          <span className="sr-only">{copy.nome}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.nome} className="line-name" />
        </label>
        <label className="mb-3 block">
          <span className="sr-only">{copy.telefono}</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={copy.telefono}
            inputMode="tel"
            className="line"
          />
        </label>
        <ReferencePhotos clientId={client.id} strips={strips} />
        <div className="mb-3">
          <span className="text-sm text-[var(--quiet)]">{copy.likes}</span>
          <ul className="mt-2">
            {likes.map((line, index) => (
              <li key={`${line}-${index}`} className="flex items-center gap-2 border-b border-[var(--rule)]">
                <span className="flex-1 py-2">{line}</span>
                <button
                  type="button"
                  onClick={() => setLikes(likes.filter((_, item) => item !== index))}
                  className="min-h-10 px-2 text-sm text-[var(--alert)]"
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
              className="line"
            />
            <button
              type="button"
              onClick={() => {
                const text = draft.trim();
                if (!text) return;
                setLikes([...likes, text]);
                setDraft("");
              }}
              className="min-h-12 px-2"
            >
              {copy.addLike}
            </button>
          </div>
        </div>
        <label className="mb-3 block">
          <span className="sr-only">{copy.note}</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder={copy.note} className="line" />
        </label>
        {error ? (
          <p className="mb-3 text-[var(--alert)]" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="save">
          {copy.save}
        </button>
      </form>
      <h2 className="mt-10 mb-2 font-serif text-3xl">{copy.visits}</h2>
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
    <li className="border-t border-[var(--rule)] py-4">
      <Link href={`/giorno?d=${visit.dateKey}`} className="inline-flex min-h-10 items-center text-sm underline decoration-[var(--rule)] underline-offset-4">
        {copy.openDay}
      </Link>
      <span className="block font-serif text-xl">{visit.when}</span>
      <span className="mb-2 block text-sm text-[var(--quiet)]">
        {visit.stylistName}
        {visit.service ? ` · ${visit.service}` : ""} · {visit.status}
      </span>
      <label className="mb-2 block">
        <span className="text-sm font-medium">{copy.request}</span>
        <textarea
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          rows={3}
          placeholder={copy.request}
          className="line"
        />
      </label>
      <button type="button" onClick={saveRequest} disabled={pending} className="save mb-4">
        {copy.save}
      </button>
      <VisitPhotosFields visitId={visit.id} photos={photos} onPhotos={setPhotos} />
      {error ? (
        <p className="text-[var(--alert)]" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
