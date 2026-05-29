import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

type RouteContext = {
  params: { userId: string } | Promise<{ userId: string }>;
};

function getAuthToken(cookieHeader: string | null, fallback?: string) {
  if (fallback) return fallback;
  if (!cookieHeader) return undefined;

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("auth_token="))
    ?.split("=")[1];
}

export async function POST(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie");
  const token = getAuthToken(cookieHeader, cookieStore.get("auth_token")?.value);

  if (!token && !authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const { userId } = params ?? {};
  if (!userId || userId === "undefined") {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const formData = await request.formData();
  const res = await fetch(`${apiUrl}/api/users/${userId}/avatar`, {
    method: "POST",
    headers: {
      ...(authHeader
        ? { Authorization: authHeader }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie");
  const token = getAuthToken(cookieHeader, cookieStore.get("auth_token")?.value);

  if (!token && !authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const { userId } = params ?? {};
  if (!userId || userId === "undefined") {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${apiUrl}/api/users/${userId}/avatar`, {
    method: "DELETE",
    headers: {
      ...(authHeader
        ? { Authorization: authHeader }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
