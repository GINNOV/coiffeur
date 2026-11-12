"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy";

function currentHref(path: string): string | null {
  if (path === "/giorno") return "/giorno";
  if (path.startsWith("/impostazioni")) return "/impostazioni";
  return null;
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path === "/accesso") return children;

  const current = currentHref(path);
  const admin = path.startsWith("/impostazioni");

  return (
    <>
      <header
        className={
          admin
            ? "sticky top-0 z-30 h-14 bg-[#1E3A5F] text-white shadow-md"
            : "sticky top-0 z-30 h-14 border-b border-[var(--rule)] bg-[var(--paper)]"
        }
      >
        <nav
          aria-label={copy.mainNav}
          className={`mx-auto flex h-full items-center justify-between px-4 ${admin ? "max-w-6xl" : "max-w-3xl"}`}
        >
          <Link
            href="/giorno"
            aria-current={current === "/giorno" ? "page" : undefined}
            className={admin ? "font-serif text-lg tracking-tight" : "font-serif text-2xl"}
          >
            {copy.backToDay}
          </Link>
          <Link
            href="/impostazioni"
            aria-current={current === "/impostazioni" ? "page" : undefined}
            className={
              admin
                ? `pb-0.5 text-[11px] tracking-[1.5px] uppercase ${
                    current === "/impostazioni" ? "border-b-2 border-[#C9A962] text-[#C9A962]" : "border-b-2 border-transparent"
                  }`
                : "inline-flex min-h-11 items-center text-sm underline decoration-[var(--rule)] underline-offset-4"
            }
          >
            {copy.settings}
          </Link>
        </nav>
      </header>
      <div className={admin ? "flex-1 bg-[#F7F5F2]" : "flex-1"}>{children}</div>
    </>
  );
}
