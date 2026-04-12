"use client";

import dynamic from "next/dynamic";
import { Check } from "lucide-react";

const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);

export type BranchLocation = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

interface BranchSelectionStepProps {
  locations: BranchLocation[];
  selectedLocationId: string | null;
  onSelect: (locationId: string) => void;
}

export default function BranchSelectionStep({
  locations,
  selectedLocationId,
  onSelect,
}: BranchSelectionStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-(--text-primary)">Choose a Branch</h3>
        <p className="text-sm text-(--text-disabled)">Select your preferred location for this appointment.</p>
      </div>
      <div className="space-y-3">
        {locations.map((loc) => {
          const selected = loc.id === selectedLocationId;
          return (
            <div
              key={loc.id}
              className={`rounded-[0.85rem] border p-4 transition-colors cursor-pointer ${
                selected
                  ? "border-[var(--accent-primary)] bg-[rgba(122,213,221,0.06)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-inset)] hover:bg-[var(--bg-elevated)]"
              }`}
              onClick={() => onSelect(loc.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)]"
                  }`}
                >
                  {selected && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-(--text-primary)">{loc.name}</p>
                  {loc.address && (
                    <p className="text-sm text-(--text-disabled) mt-0.5">{loc.address}</p>
                  )}
                  {selected && loc.latitude !== null && loc.longitude !== null && (
                    <div className="mt-3">
                      <LocationMapView
                        location={{
                          name: loc.name,
                          address: loc.address,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                        }}
                        height={180}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
