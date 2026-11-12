"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { filterAdminCards, groupAdminCards, type AdminCard } from "@/lib/admin-hub";
import { copy } from "@/lib/copy";

export function AdminHub({ cards }: { cards: AdminCard[] }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const visible = filterAdminCards(cards, query);
  const sections = groupAdminCards(visible);
  const countLabel = visible.length === 1 ? copy.adminOne : `${visible.length} ${copy.adminMany}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 overflow-hidden rounded-3xl border border-[#E8EDE4] bg-[#F8FBF7] shadow-sm">
        <div className="flex">
          <div className="w-1.5 bg-[#C9A962]" />
          <div className="flex-1 p-8">
            <p className="text-xs font-medium tracking-[1.5px] text-[#6B7F6A] uppercase">{copy.adminEyebrow}</p>
            <h1 className="mt-2 font-serif text-4xl tracking-[-1px] text-[#1E3A5F]">{copy.adminTitle}</h1>
            <p className="mt-2 max-w-5xl text-[#6B5F5F]">{copy.adminLead}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#EDEAE5] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="admin-search" className="text-sm font-medium text-[#3C2F2F]">
            {copy.adminSearchLabel}
          </label>
          <p className="mt-0.5 text-xs text-[#6B5F5F]">{copy.adminSearchHint}</p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <input
            ref={searchRef}
            id="admin-search"
            type="search"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder={copy.adminSearchPlaceholder}
            className="h-11 w-full rounded-lg border border-[#D4CFC6] bg-[#FDFBF7] px-3 text-sm text-[#3C2F2F] outline-none placeholder:text-[#6B5F5F] focus:border-[#C9A962] focus:ring-2 focus:ring-[#C9A962]/20"
          />
          {query ? (
            <button
              type="button"
              aria-label={copy.adminSearchClear}
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#1E3A5F] hover:bg-[#E8D5A3]/40"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <p role="status" className="mb-6 text-sm text-[#6B5F5F]">
        {countLabel}
      </p>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-[#EDEAE5] bg-white p-8 text-center">
          <h2 className="font-medium text-[#1E3A5F]">{copy.adminEmptyTitle}</h2>
          <p className="mt-2 text-sm text-[#6B5F5F]">{copy.adminEmpty}</p>
        </div>
      ) : (
        sections.map((section) => (
          <section key={section.title} className="mb-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-5 w-1 rounded bg-[#C9A962]" />
              <h2 className="text-sm font-semibold tracking-widest text-[#3C2F2F] uppercase">{section.title}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {section.cards.map((card) => (
                <Link key={card.href} href={card.href} className="group block h-full">
                  <div className="h-full rounded-2xl border border-[#EDEAE5] bg-white p-5 transition-all hover:border-[#C9A962] hover:shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F5F0] text-sm text-[#1E3A5F] ring-1 ring-[#EDEAE5]">
                        {card.mark}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-[#1E3A5F] group-hover:text-[#C9A962]">{card.title}</div>
                          {card.badge ? (
                            <span className="shrink-0 rounded-full bg-[#E8D5A3] px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-[#1E3A5F] uppercase">
                              {card.badge}
                              {card.badgeLabel ? ` ${card.badgeLabel}` : ""}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-xs leading-snug text-[#6B5F5F]">{card.description}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}

      <p className="mt-10 text-center text-xs text-[#6B5F5F]">
        Le modifiche sono disponibili subito sull&apos;agenda.
      </p>
    </div>
  );
}
