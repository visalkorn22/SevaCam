import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

type RouteContext = {
  params: { serviceId: string } | Promise<{ serviceId: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const authHeader = request.headers.get("authorization");

  if (!token && !authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const { serviceId } = params ?? {};
  if (!serviceId || serviceId === "undefined") {
    return NextResponse.json({ message: "Invalid service id" }, { status: 400 });
  }

  const body = await request.text();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const res = await fetch(`${apiUrl}/api/services/${serviceId}/locations`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader
        ? { Authorization: authHeader }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {}),
    },
    body,
  });

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
