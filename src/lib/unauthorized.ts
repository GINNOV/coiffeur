export function redirectIfUnauthorized(status: number): boolean {
  if (status !== 401 || typeof window === "undefined") return false;
  window.location.assign("/accesso");
  return true;
}
