import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LocationsClient from "./LocationsClient";

async function getLocations() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/admin/locations`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getMe() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function LocationsPage() {
  const user = await getMe();
  if (!user || !["admin", "superadmin"].includes(user.role)) {
    redirect("/admin/dashboard");
  }
  const locations = await getLocations();
  return <LocationsClient initialLocations={locations} />;
}
