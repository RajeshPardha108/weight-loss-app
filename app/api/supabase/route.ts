import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment variables not configured on server" },
        { status: 503 }
      );
    }

    const payload = await req.json();
    const { path, method = "GET", headers = {}, body = null } = payload;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Missing request path" }, { status: 400 });
    }

    const targetUrl = `${SUPABASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

    const forwardHeaders: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    const allowedHeaderKeys = [
      "accept",
      "content-type",
      "prefer",
      "range",
      "accept-profile",
      "content-profile",
    ];

    for (const [k, v] of Object.entries(headers)) {
      if (v && allowedHeaderKeys.includes(k.toLowerCase())) {
        forwardHeaders[k] = String(v);
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: forwardHeaders,
      cache: "no-store",
    };

    if (body !== null && body !== undefined && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);
    const bodyText = await upstreamRes.text();

    // Gracefully handle RLS permission denied (42501) on optional user_settings table
    if (!upstreamRes.ok && path.includes("user_settings")) {
      try {
        const parsedErr = JSON.parse(bodyText);
        if (parsedErr?.code === "42501") {
          const isSingleObject =
            (forwardHeaders["Accept"] || forwardHeaders["accept"] || "").includes(
              "application/vnd.pgrst.object+json"
            );
          const fallbackPayload = isSingleObject
            ? JSON.stringify({ id: 1, goal_weight_kg: 70.0 })
            : JSON.stringify([{ id: 1, goal_weight_kg: 70.0 }]);
          return NextResponse.json({
            status: 200,
            statusText: "OK",
            headers: { "content-type": "application/json" },
            bodyText: fallbackPayload,
          });
        }
      } catch {
        // ignore JSON parse error
      }
    }

    const responseHeaders: Record<string, string> = {};
    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === "content-type" ||
        lower === "content-range" ||
        lower === "preference-applied"
      ) {
        responseHeaders[key] = value;
      }
    });

    return NextResponse.json({
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
      bodyText,
    });
  } catch (err: any) {
    console.error("[Supabase Proxy Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Internal proxy error" },
      { status: 500 }
    );
  }
}
