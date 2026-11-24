import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { goFetch } from "@/lib/go-api";

/** Proxy server action untuk client komponen: GET /api/go?path=/v1/... */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const path = req.nextUrl.searchParams.get("path");
  if (!path || !path.startsWith("/v1/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const upstream = await goFetch(path, session.user.email);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
