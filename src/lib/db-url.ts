export function isNeonUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("neon.tech") || url.includes(".neon.");
}

/** Add Neon TLS and timeout params when they are missing. Other URLs are unchanged. */
export function withNeonParams(url: string): string {
  if (!isNeonUrl(url)) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "15");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
