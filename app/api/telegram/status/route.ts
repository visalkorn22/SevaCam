import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/telegram/status`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
