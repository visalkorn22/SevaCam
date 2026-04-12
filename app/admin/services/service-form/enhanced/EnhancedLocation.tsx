"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Check } from "lucide-react";
import type { ServiceFormData, UpdateServiceField } from "./types";

const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);

type LocationOption = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

type EnhancedLocationProps = {
  formData: ServiceFormData;
  updateField: UpdateServiceField;
};

const fieldLabel =
  "mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]";

export default function EnhancedLocation({ formData, updateField }: EnhancedLocationProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/locations`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setLocations(data))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleLocation = (id: string) => {
    const current = formData.location_ids ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    updateField("location_ids", next);
  };

  const selectedLocations = locations.filter((l) =>
    (formData.location_ids ?? []).includes(l.id)
  );

  const previewLocation = selectedLocations.find(
    (l) => l.latitude !== null && l.longitude !== null
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-disabled)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
        Loading locations…
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-[0.85rem] border border-dashed border-[var(--border-subtle)] p-8 text-center">
        <MapPin className="mx-auto mb-2 h-6 w-6 text-[var(--text-disabled)]" />
        <p className="text-sm text-[var(--text-disabled)]">
          No locations defined yet.{" "}
          <a href="/admin/locations" className="underline text-[var(--accent-primary)]">
            Create one first.
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className={fieldLabel}>Assign Branches</label>
        <p className="mb-3 text-xs text-[var(--text-disabled)]">
          Select all locations where this service is offered.
        </p>
        <div className="space-y-2">
          {locations.map((loc) => {
            const selected = (formData.location_ids ?? []).includes(loc.id);
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => toggleLocation(loc.id)}
                className={`flex w-full items-center gap-3 rounded-[0.7rem] border px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-[var(--accent-primary)] bg-[rgba(122,213,221,0.08)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-inset)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    selected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)]"
                  }`}
                >
                  {selected && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{loc.name}</p>
                  {loc.address && (
                    <p className="truncate text-xs text-[var(--text-disabled)]">{loc.address}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {previewLocation && previewLocation.latitude !== null && previewLocation.longitude !== null && (
        <div>
          <label className={fieldLabel}>Map Preview</label>
          <LocationMapView
            location={{
              name: previewLocation.name,
              address: previewLocation.address ?? "",
              latitude: previewLocation.latitude,
              longitude: previewLocation.longitude,
            }}
            height={200}
            compact
          />
          {selectedLocations.length > 1 && (
            <p className="mt-1.5 text-[0.68rem] text-[var(--text-disabled)]">
              Showing first selected location. All {selectedLocations.length} branches will be available to customers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
