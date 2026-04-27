import { NextRequest, NextResponse } from "next/server";
import { normalizeApiOrigin } from "@/lib/normalizeApiOrigin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** FastAPI origin. Read at request time so Vercel/Render split deploy works without baking
 * the URL into `next.config` at build time.
 *
 * `NEXT_PUBLIC_API_URL` is included so you can set a single var on Vercel: the server-side
 * proxy and the client (when using direct API calls) both see the same origin. */
function backendOrigin(): string {
  const raw = normalizeApiOrigin(
    (
      process.env.BACKEND_URL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      ""
    )
      .trim()
      .replace(/\/$/, ""),
  );
  if (raw) return raw;
  return "http://127.0.0.1:8000";
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  if (!path?.length) {
    return NextResponse.json({ error: "Missing API path" }, { status: 404 });
  }
  const subpath = path.join("/");
  const incoming = new URL(request.url);
  const target = `${backendOrigin()}/api/${subpath}${incoming.search}`;

  try {
    const upstream = await fetch(target, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream fetch failed";
    return NextResponse.json(
      {
        error: msg,
        hint:
          "On Vercel set BACKEND_URL or NEXT_PUBLIC_API_URL to your Render API base (https://…, no trailing slash), then redeploy. Use https, not http, or the browser will block mixed content (Failed to fetch).",
        target,
      },
      { status: 502 },
    );
  }
}
