import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    addressdetails: "1",
  });

  try {
    const res = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`, {
      cache: "no-store",
      headers: {
        "Accept-Language": "en",
        "User-Agent": "booking-schedule-system/1.0",
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { message: detail || "Failed to search locations." },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => []);
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Geocode search proxy error:", error);
    return NextResponse.json(
      { message: "Failed to search locations." },
      { status: 502 }
    );
  }
}
