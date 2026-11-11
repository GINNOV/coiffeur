"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy";

const links = [
  { href: "/giorno", label: copy.backToDay },
  { href: "/impostazioni", label: copy.settings },
] as const;

function currentHref(path: string): string | null {
  if (path === "/giorno") return "/giorno";
  if (path.startsWith("/impostazioni")) return "/impostazioni";
  return null;
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path === "/accesso") return children;

  const current = currentHref(path);

  return (
    <>
      <header className="sticky top-0 z-30 h-14 border-b border-[#e2d8c8] bg-[#f3efe6]/95 backdrop-blur">
        <nav aria-label={copy.mainNav} className="mx-auto flex h-full max-w-3xl items-center justify-between gap-3 px-3">
          <Link
            href="/giorno"
            aria-current={current === "/giorno" ? "page" : undefined}
            className="font-serif text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#243246]"
          >
            {copy.backToDay}
          </Link>
          <Link
            href="/impostazioni"
            aria-current={current === "/impostazioni" ? "page" : undefined}
            className={
              current === "/impostazioni"
                ? "inline-flex min-h-11 items-center rounded-full bg-[#fffaf3] px-3 text-sm text-[#1e1a16] ring-1 ring-[#1e1a16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#243246]"
                : "inline-flex min-h-11 items-center rounded-full bg-[#243246] px-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#243246]"
            }
          >
            {copy.settings}
          </Link>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="bg-[#243246] text-[#f3efe6]">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <p className="font-serif text-lg leading-tight">
            {copy.backToDay}
            <span className="mt-1 block font-sans text-sm text-[#f3efe6]/75">{copy.salonBook}</span>
          </p>
          <nav aria-label={copy.footerNav}>
            <ul className="flex gap-4 text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={link.href === current ? "page" : undefined}
                    className="inline-flex min-h-11 items-center underline decoration-[#f3efe6]/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3efe6]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
