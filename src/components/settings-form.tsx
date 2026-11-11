"use client";

import Link from "next/link";
import { useState } from "react";
import { copy } from "@/lib/copy";

export function SettingsForm({
  stylists,
}: {
  stylists: { id: string; name: string; position: number }[];
}) {
  const [names, setNames] = useState(stylists.map((stylist) => ({ id: stylist.id, name: stylist.name })));
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pending, setPending] = useState<"names" | "pin" | null>(null);

  async function saveNames(event: React.FormEvent) {
    event.preventDefault();
    setPending("names");
    setNameError(null);
    try {
      const response = await fetch("/api/impostazioni", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "names", names }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) setNameError(body.error ?? copy.offline);
    } catch {
      setNameError(copy.offline);
    } finally {
      setPending(null);
    }
  }

  async function savePin(event: React.FormEvent) {
    event.preventDefault();
    setPending("pin");
    setPinError(null);
    try {
      const response = await fetch("/api/impostazioni", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "pin", currentPin, nextPin, confirmPin }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setPinError(body.error ?? copy.offline);
        return;
      }
      setCurrentPin("");
      setNextPin("");
      setConfirmPin("");
    } catch {
      setPinError(copy.offline);
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-4">
      <Link href="/giorno" className="inline-flex min-h-12 items-center">
        {copy.backToDay}
      </Link>
      <h1 className="mt-2 mb-4 font-serif text-3xl">{copy.settings}</h1>
      <form onSubmit={saveNames} className="mb-6 rounded-3xl bg-[#fffaf3] p-4">
        {names.map((entry, index) => (
          <label key={entry.id} className="mb-3 block">
            <span className="text-sm font-medium">{index + 1}</span>
            <input
              value={entry.name}
              maxLength={40}
              onChange={(event) =>
                setNames((current) =>
                  current.map((item) => (item.id === entry.id ? { ...item, name: event.target.value } : item)),
                )
              }
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 text-lg"
            />
          </label>
        ))}
        {nameError ? (
          <p className="mb-3 text-[#9c3b2e]" role="alert">
            {nameError}
          </p>
        ) : null}
        <button type="submit" disabled={pending === "names"} className="min-h-14 w-full rounded-2xl bg-[#1e1a16] text-lg text-white">
          {copy.save}
        </button>
      </form>
      <form onSubmit={savePin} className="rounded-3xl bg-[#fffaf3] p-4">
        <PinField label={copy.pinCurrent} value={currentPin} onChange={setCurrentPin} />
        <PinField label={copy.pinNew} value={nextPin} onChange={setNextPin} />
        <PinField label={copy.pinConfirm} value={confirmPin} onChange={setConfirmPin} />
        {pinError ? (
          <p className="mb-3 text-[#9c3b2e]" role="alert">
            {pinError}
          </p>
        ) : null}
        <button type="submit" disabled={pending === "pin"} className="min-h-14 w-full rounded-2xl bg-[#9c3b2e] text-lg text-white">
          {copy.save}
        </button>
      </form>
    </main>
  );
}

function PinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 text-lg tracking-[0.4em]"
      />
    </label>
  );
}
