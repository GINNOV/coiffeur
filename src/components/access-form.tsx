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
      <h1 className="mb-10 text-center font-serif text-5xl">Agenda</h1>
      <form onSubmit={onSubmit}>
        <label className="block">
          <span className="sr-only">PIN</span>
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="PIN"
            className="line-name text-center tracking-[0.4em]"
          />
        </label>
        {error ? (
          <p className="mt-3 text-center text-[var(--alert)]" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="save mt-8">
          {copy.enter}
        </button>
      </form>
    </main>
  );
}
