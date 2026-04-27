import { NextRequest, NextResponse } from "next/server";

/** FastAPI origin. Read at request time so Vercel/Render split deploy works without baking
 * the URL into `next.config` at build time. */
function backendOrigin(): string {
  const raw = (process.env.BACKEND_URL || process.env.API_URL || "")
    .trim()
    .replace(/\/$/, "");
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
          "On Vercel, set BACKEND_URL to your Render API base URL (no trailing slash), e.g. https://your-service.onrender.com — then redeploy.",
        target,
      },
      { status: 502 },
    );
  }
}
