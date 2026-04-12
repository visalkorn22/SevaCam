import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const body = await request.json();
  const res = await fetch(`${apiUrl}/api/telegram/send-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
