"use client";

import { useEffect, useRef } from "react";

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onPinMove: (lat: number, lng: number) => void;
  height?: number;
}

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282];

export default function LocationPickerMap({
  latitude,
  longitude,
  onPinMove,
  height = 280,
}: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const hasCoordinates = latitude !== null && longitude !== null;

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

      const center: [number, number] = hasCoordinates
        ? [latitude, longitude]
        : DEFAULT_CENTER;

      const map = L.map(mapRef.current, {
        center,
        zoom: hasCoordinates ? 15 : 13,
        scrollWheelZoom: true,
        doubleClickZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (hasCoordinates) {
        const marker = L.marker([latitude, longitude], {
          draggable: true,
        }).addTo(map);

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onPinMove(position.lat, position.lng);
        });

        markerRef.current = marker;
      }

      map.on("dblclick", (event: any) => {
        const { lat, lng } = event.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], {
            draggable: true,
          }).addTo(map);

          marker.on("dragend", () => {
            const position = marker.getLatLng();
            onPinMove(position.lat, position.lng);
          });

          markerRef.current = marker;
        }

        onPinMove(lat, lng);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [hasCoordinates, latitude, longitude, onPinMove]);

  useEffect(() => {
    if (!mapInstanceRef.current || latitude === null || longitude === null) return;

    import("leaflet").then((L) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], {
          draggable: true,
        }).addTo(mapInstanceRef.current);

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onPinMove(position.lat, position.lng);
        });

        markerRef.current = marker;
      }

      mapInstanceRef.current.setView([latitude, longitude], 15);
    });
  }, [latitude, longitude, onPinMove]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-[0.7rem] border border-(--border-subtle)"
      />
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg">
        {hasCoordinates
          ? "Click and drag to move the map. Double-click to confirm a new pin."
          : "Click and drag to move the map. Double-click to place a pin."}
      </div>
    </div>
  );
}
