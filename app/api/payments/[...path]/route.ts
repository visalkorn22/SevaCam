import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function forward(request: NextRequest, method: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const authHeader = request.headers.get("authorization");
    const cookieHeader = request.headers.get("cookie");

    if (!token && !authHeader && !cookieHeader) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/payments/, "");
    const query = url.searchParams.toString();
    const endpoint = `${apiUrl}/api/payments${path}${query ? `?${query}` : ""}`;

    const bodyText = await request.text();
    const hasBody = bodyText.trim().length > 0;

    const res = await fetch(endpoint, {
      method,
      headers: {
        ...(authHeader
          ? { Authorization: authHeader }
          : token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(request.headers.get("content-type")
          ? { "Content-Type": request.headers.get("content-type") as string }
          : {}),
      },
      body: hasBody ? bodyText : undefined,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text().catch(() => "");
    return new NextResponse(text, {
      status: res.status,
      headers: contentType ? { "content-type": contentType } : undefined,
    });
  } catch (error) {
    console.error("Payments proxy error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}

export async function POST(request: NextRequest) {
  return forward(request, "POST");
}
