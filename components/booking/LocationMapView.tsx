"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
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

type Coordinates = {
  latitude: number;
  longitude: number;
};

function buildDirectionsUrl(
  location: LocationData,
  origin?: Coordinates,
): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${location.latitude},${location.longitude}`,
    travelmode: "driving",
    dir_action: "navigate",
  });

  if (origin) {
    params.set("origin", `${origin.latitude},${origin.longitude}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function LocationMapView({
  location,
  height,
  compact = false,
}: LocationMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isResolvingDirections, setIsResolvingDirections] = useState(false);
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

  const directionsUrl = buildDirectionsUrl(location);

  const handleDirectionsClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") return;

    event.preventDefault();

    if (isResolvingDirections) return;

    const popup = window.open(directionsUrl, "_blank");
    if (popup) {
      popup.opener = null;
    }

    if (!("geolocation" in navigator)) {
      if (!popup) {
        window.location.assign(directionsUrl);
      }
      return;
    }

    setIsResolvingDirections(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const preciseDirectionsUrl = buildDirectionsUrl(location, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        if (popup && !popup.closed) {
          popup.location.replace(preciseDirectionsUrl);
          popup.focus();
        } else {
          window.location.assign(preciseDirectionsUrl);
        }

        setIsResolvingDirections(false);
      },
      () => {
        if (!popup) {
          window.location.assign(directionsUrl);
        }
        setIsResolvingDirections(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

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
        onClick={handleDirectionsClick}
        target="_blank"
        rel="noopener noreferrer"
        aria-busy={isResolvingDirections}
        className="sevacam-booking-secondary-action inline-flex items-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]"
      >
        <Navigation className="h-3.5 w-3.5" />
        {isResolvingDirections ? "Locating you..." : "Get Directions"}
      </a>
    </div>
  );
}
