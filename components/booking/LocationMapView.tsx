"use client";

import { useEffect, useRef } from "react";
import { MapPin, Navigation } from "lucide-react";

export interface LocationData {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

interface LocationMapViewProps {
  location: LocationData;
  height?: number;
  compact?: boolean;
}

export default function LocationMapView({
  location,
  height,
  compact = false,
}: LocationMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapHeight = height ?? (compact ? 200 : 280);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "/marker-icon.png",
        iconRetinaUrl: "/marker-icon-2x.png",
        shadowUrl: "/marker-shadow.png",
      });

      if ((mapRef.current as any)._leaflet_id) {
        (mapRef.current as any)._leaflet_id = undefined;
      }

      const map = L.map(mapRef.current, {
        center: [location.latitude, location.longitude],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.marker([location.latitude, location.longitude])
        .addTo(map)
        .bindPopup(`<b>${location.name}</b>${location.address ? `<br/>${location.address}` : ""}`)
        .openPopup();

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location.latitude, location.longitude, location.name, location.address]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
        <div>
          <p className="text-sm font-medium text-(--text-primary)">{location.name}</p>
          {location.address && (
            <p className="text-xs text-(--text-disabled)">{location.address}</p>
          )}
        </div>
      </div>

      <div
        ref={mapRef}
        style={{ height: mapHeight }}
        className="sevacam-booking-map-frame w-full"
      />

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sevacam-booking-secondary-action inline-flex items-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]"
      >
        <Navigation className="h-3.5 w-3.5" />
        Get Directions
      </a>
    </div>
  );
}
