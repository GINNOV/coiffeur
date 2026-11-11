"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { copy } from "@/lib/copy";
import type { ClientDetail } from "@/lib/types";
import { redirectIfUnauthorized } from "@/lib/unauthorized";

export function ClientForm({ client }: { client: ClientDetail }) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [note, setNote] = useState(client.note);
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
        body: JSON.stringify({ name, phone, note }),
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
      <h2 className="mt-8 mb-2 font-serif text-2xl">{copy.visits}</h2>
      <ul className="space-y-2">
        {client.visits.map((visit) => (
          <li key={visit.id}>
            <Link href={`/giorno?d=${visit.dateKey}`} className="block rounded-2xl bg-[#fffaf3] px-3 py-3">
              <span className="block font-medium">{visit.when}</span>
              <span className="block text-sm text-[#5c5348]">
                {visit.stylistName}
                {visit.service ? ` · ${visit.service}` : ""} · {visit.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
