import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("lat");
  const longitude = request.nextUrl.searchParams.get("lon");

  if (!latitude || !longitude) {
    return NextResponse.json(
      { message: "Latitude and longitude are required." },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    lat: latitude,
    lon: longitude,
    format: "jsonv2",
    addressdetails: "1",
  });

  try {
    const res = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
      cache: "no-store",
      headers: {
        "Accept-Language": "en",
        "User-Agent": "booking-schedule-system/1.0",
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { message: detail || "Failed to reverse geocode location." },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Reverse geocode proxy error:", error);
    return NextResponse.json(
      { message: "Failed to reverse geocode location." },
      { status: 502 }
    );
  }
}
