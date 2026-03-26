import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  try {
    const res = await fetch(`${apiUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const response = NextResponse.json({ user: null });
      response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
      return response;
    }

    const user = await res.json();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
