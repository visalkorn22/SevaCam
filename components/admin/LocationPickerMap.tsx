"use client";

import { useEffect, useRef } from "react";

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onPinMove: (lat: number, lng: number) => void;
  height?: number;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onPinMove,
  height = 280,
}: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const defaultCenter: [number, number] = [11.5564, 104.9282]; // Phnom Penh

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

      // React Strict Mode runs effects twice — clean any stale Leaflet state on the container
      if ((mapRef.current as any)._leaflet_id) {
        (mapRef.current as any)._leaflet_id = undefined;
      }

      const center: [number, number] =
        latitude && longitude ? [latitude, longitude] : defaultCenter;

      const map = L.map(mapRef.current, {
        center,
        zoom: 14,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (latitude && longitude) {
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onPinMove(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }

      // Click to place/move pin
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onPinMove(pos.lat, pos.lng);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when lat/lng props change externally (from Nominatim search)
  useEffect(() => {
    if (!mapInstanceRef.current || latitude === null || longitude === null) return;
    import("leaflet").then((L) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(
          mapInstanceRef.current
        );
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onPinMove(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }
      mapInstanceRef.current.setView([latitude, longitude], 15);
    });
  }, [latitude, longitude, onPinMove]);

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="w-full rounded-[0.7rem] overflow-hidden border border-(--border-subtle)"
    />
  );
}
