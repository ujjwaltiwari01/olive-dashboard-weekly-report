/**
 * Normalize accidental `http://` on public hosts — browsers block mixed content on https pages
 * ("Failed to fetch"). Local dev keeps http for localhost.
 */
export function normalizeApiOrigin(origin: string): string {
  let o = origin.trim().replace(/\/$/, "");
  if (!o) return o;
  try {
    const u = new URL(o);
    const host = u.hostname.toLowerCase();
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    if (u.protocol === "http:" && !isLocal) {
      u.protocol = "https:";
      o = u.toString().replace(/\/$/, "");
    }
  } catch {
    /* keep raw */
  }
  return o;
}
