"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";

export function AccessForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? copy.pinInvalid);
        return;
      }
      window.location.assign("/giorno");
    } catch {
      setError(copy.offline);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <p className="mb-2 text-center text-sm tracking-[0.2em] text-[#8a7d6d] uppercase">Salon</p>
      <h1 className="mb-8 text-center font-serif text-4xl">Agenda</h1>
      <form onSubmit={onSubmit} className="rounded-3xl bg-[#fffaf3] p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium">PIN</span>
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            className="mt-2 min-h-16 w-full rounded-2xl border border-[#e2d8c8] bg-white text-center text-3xl tracking-[0.5em]"
          />
        </label>
        {error ? (
          <p className="mt-3 text-center text-[#9c3b2e]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 min-h-14 w-full rounded-2xl bg-[#1e1a16] text-lg text-white"
        >
          {copy.enter}
        </button>
      </form>
    </main>
  );
}
