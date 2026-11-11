export function isOverlapError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    if ((error as { code?: unknown }).code === "P2004") return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("23p01") ||
    lower.includes("appointment_blocking_no_overlap") ||
    lower.includes("exclusion")
  );
}
