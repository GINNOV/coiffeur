"use client";

import Link from "next/link";
import { useState } from "react";
import { copy } from "@/lib/copy";

function SettingsPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-6">
      <Link
        href="/impostazioni"
        className="text-sm text-[var(--quiet)] underline decoration-[var(--rule)] underline-offset-4"
      >
        {copy.settings}
      </Link>
      <h1 className="mt-3 mb-6 font-serif text-4xl">{title}</h1>
      {children}
    </main>
  );
}

function errorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  return typeof body.error === "string" ? body.error : null;
}

export function ColumnNamesForm({
  stylists,
}: {
  stylists: { id: string; name: string; position: number }[];
}) {
  const [names, setNames] = useState(stylists.map((stylist) => ({ id: stylist.id, name: stylist.name })));
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveNames(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setNameError(null);
    try {
      const response = await fetch("/api/impostazioni", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "names", names }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) setNameError(errorMessage(body) ?? copy.offline);
    } catch {
      setNameError(copy.offline);
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPage title={copy.chairs}>
      <form onSubmit={saveNames}>
        {names.map((entry, index) => (
          <label key={entry.id} className="mb-3 block">
            <span className="text-sm text-[var(--quiet)]">{index + 1}</span>
            <input
              value={entry.name}
              maxLength={40}
              onChange={(event) =>
                setNames((current) =>
                  current.map((item) => (item.id === entry.id ? { ...item, name: event.target.value } : item)),
                )
              }
              className="line"
            />
          </label>
        ))}
        {nameError ? (
          <p className="mb-3 text-[var(--alert)]" role="alert">
            {nameError}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="save mt-4">
          {copy.save}
        </button>
      </form>
    </SettingsPage>
  );
}

export function PinForm() {
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function savePin(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setPinError(null);
    try {
      const response = await fetch("/api/impostazioni", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "pin", currentPin, nextPin, confirmPin }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setPinError(errorMessage(body) ?? copy.offline);
        return;
      }
      setCurrentPin("");
      setNextPin("");
      setConfirmPin("");
    } catch {
      setPinError(copy.offline);
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPage title={copy.pinTitle}>
      <form onSubmit={savePin}>
        <PinField label={copy.pinCurrent} value={currentPin} onChange={setCurrentPin} />
        <PinField label={copy.pinNew} value={nextPin} onChange={setNextPin} />
        <PinField label={copy.pinConfirm} value={confirmPin} onChange={setConfirmPin} />
        {pinError ? (
          <p className="mb-3 text-[var(--alert)]" role="alert">
            {pinError}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="save mt-4">
          {copy.save}
        </button>
      </form>
    </SettingsPage>
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
      <span className="sr-only">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        placeholder={label}
        className="line tracking-[0.4em]"
      />
    </label>
  );
}
