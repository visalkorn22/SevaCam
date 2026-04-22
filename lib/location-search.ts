export type GeocodeResult = {
  display_name: string;
  lat: string;
  lon: string;
  name?: string | null;
};

async function parseMessage(res: Response, fallback: string) {
  const raw = (await res.text().catch(() => "")).trim();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as { message?: unknown; detail?: unknown };
    const message = parsed.message ?? parsed.detail;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {
    // Fall back to the raw response body.
  }

  return raw;
}

export async function searchLocationCandidates(query: string) {
  const params = new URLSearchParams({ q: query.trim() });
  const res = await fetch(`/api/geocode/search?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await parseMessage(res, "Failed to search locations."));
  }

  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? (data as GeocodeResult[]) : [];
}

export async function reverseGeocodeCandidate(
  latitude: number,
  longitude: number
) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  const res = await fetch(`/api/geocode/reverse?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await parseMessage(res, "Failed to resolve location."));
  }

  const data = (await res.json().catch(() => null)) as GeocodeResult | null;
  return data;
}

export function suggestLocationName(result: Pick<GeocodeResult, "name" | "display_name">) {
  if (typeof result.name === "string" && result.name.trim()) {
    return result.name.trim();
  }

  return result.display_name
    .split(",")
    .map((part) => part.trim())
    .find(Boolean) ?? "";
}
