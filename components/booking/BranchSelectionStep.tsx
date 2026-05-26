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
  address: string | null;
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
        <h3 className="text-base font-medium text-(--text-primary)">Choose a Branch</h3>
        <p className="text-sm text-(--text-secondary)">
          Select your preferred location for this appointment.
        </p>
      </div>
      <div className="space-y-3">
        {locations.map((loc) => {
          const selected = loc.id === selectedLocationId;
          return (
            <div
              key={loc.id}
              className={`sevacam-booking-card cursor-pointer p-4 transition-colors ${
                selected
                  ? "sevacam-booking-card-selected"
                  : "bg-(--bg-inset) hover:bg-(--bg-overlay)"
              }`}
              onClick={() => onSelect(loc.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-(--accent-primary) bg-(--accent-primary)"
                      : "border-(--booking-frame) bg-(--bg-inset)"
                  }`}
                >
                  {selected && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-(--text-primary)">{loc.name}</p>
                  {loc.address && (
                    <p className="mt-1 text-sm text-(--text-secondary)">{loc.address}</p>
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
