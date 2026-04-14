"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapPin, Check, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ServiceFormData, UpdateServiceField } from "./types";

const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);

const LocationPickerMap = dynamic(
  () => import("@/components/admin/LocationPickerMap"),
  { ssr: false }
);

type LocationOption = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone?: string;
  is_active?: boolean;
};

type LocationDraft = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
};

type EnhancedLocationProps = {
  formData: ServiceFormData;
  updateField: UpdateServiceField;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

async function geocodeAddress(query: string) {
  const params = new URLSearchParams({ q: query, format: "json", limit: "5" });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "Accept-Language": "en" },
  });
  return res.json();
}

const emptyDraft = (): LocationDraft => ({
  name: "",
  address: "",
  latitude: null,
  longitude: null,
  timezone: "Asia/Phnom_Penh",
});

const fieldLabel =
  "mb-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";
const fieldInput =
  "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:ring-1 focus-visible:ring-(--accent-primary)";

export default function EnhancedLocation({ formData, updateField }: EnhancedLocationProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocationDraft>(emptyDraft());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const fetchLocations = () => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Selection logic
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

  // Modal open handlers
  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSearchQuery("");
    setSearchResults([]);
    setModalOpen(true);
  };

  const openEdit = (loc: LocationOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(loc.id);
    setDraft({
      name: loc.name,
      address: loc.address ?? "",
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone ?? "Asia/Phnom_Penh",
    });
    setSearchQuery(loc.address ?? "");
    setSearchResults([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSearchResults([]);
  };

  // Nominatim search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer) clearTimeout(searchTimer);
    if (value.length < 3) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const results = await geocodeAddress(value);
      setSearchResults(results);
    }, 500);
    setSearchTimer(t);
  };

  const selectResult = (result: any) => {
    setDraft((d) => ({
      ...d,
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    }));
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  const handlePinMove = useCallback((lat: number, lng: number) => {
    setDraft((d) => ({ ...d, latitude: lat, longitude: lng }));
  }, []);

  // Save location
  const handleSave = async () => {
    if (!draft.name.trim()) return;
    setIsSaving(true);
    try {
      const url = editingId
        ? `/api/admin/locations/${editingId}`
        : "/api/admin/locations";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved: LocationOption = await res.json();
      setLocations((prev) =>
        editingId
          ? prev.map((l) => (l.id === editingId ? saved : l))
          : [...prev, saved]
      );
      // Auto-select newly created location
      if (!editingId) {
        updateField("location_ids", [...(formData.location_ids ?? []), saved.id]);
      }
      closeModal();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete location
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this location?")) return;
    await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });
    setLocations((prev) => prev.filter((l) => l.id !== id));
    updateField(
      "location_ids",
      (formData.location_ids ?? []).filter((x) => x !== id)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-(--text-disabled)">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
        Loading locations…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
            Branch Locations
          </p>
          <p className="mt-0.5 text-xs text-(--text-disabled)">
            Select branches where this service is offered. Create new ones here if needed.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={openCreate} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          New Location
        </Button>
      </div>

      {/* Location list */}
      {locations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[0.85rem] border border-dashed border-(--border-subtle) py-12 text-center">
          <MapPin className="h-7 w-7 text-(--text-disabled)" />
          <div>
            <p className="text-sm font-medium text-(--text-primary)">No locations yet</p>
            <p className="mt-0.5 text-xs text-(--text-disabled)">
              Click &ldquo;New Location&rdquo; above to add your first branch.
            </p>
          </div>
          <Button type="button" size="sm" onClick={openCreate} className="gap-1.5 mt-1">
            <Plus className="h-3.5 w-3.5" />
            Add First Location
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => {
            const selected = (formData.location_ids ?? []).includes(loc.id);
            return (
              <div
                key={loc.id}
                onClick={() => toggleLocation(loc.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-[0.7rem] border px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-(--accent-primary) bg-[rgba(122,213,221,0.08)]"
                    : "border-(--border-subtle) bg-(--bg-inset) hover:bg-(--bg-elevated)"
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    selected
                      ? "border-(--accent-primary) bg-(--accent-primary)"
                      : "border-(--border-subtle)"
                  }`}
                >
                  {selected && <Check className="h-3 w-3 text-black" />}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--text-primary)">{loc.name}</p>
                  {loc.address && (
                    <p className="truncate text-xs text-(--text-disabled)">{loc.address}</p>
                  )}
                  {loc.latitude != null && (
                    <p className="mt-0.5 font-mono text-[0.65rem] text-(--text-disabled)">
                      {loc.latitude.toFixed(4)}, {loc.longitude?.toFixed(4)}
                    </p>
                  )}
                </div>

                {/* Edit / Delete */}
                <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => openEdit(loc, e)}
                    className="rounded p-1.5 text-(--text-disabled) hover:bg-(--bg-elevated) hover:text-(--text-primary)"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(loc.id, e)}
                    className="rounded p-1.5 text-(--text-disabled) hover:bg-(--bg-elevated) hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Map preview of first selected location */}
      {previewLocation && previewLocation.latitude !== null && previewLocation.longitude !== null && (
        <div>
          <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
            Map Preview
          </p>
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
            <p className="mt-1.5 text-[0.68rem] text-(--text-disabled)">
              Showing first selected location. All {selectedLocations.length} branches will be available to customers.
            </p>
          )}
        </div>
      )}

      {/* Inline create/edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-(--border-subtle) bg-(--bg-elevated) p-6 shadow-2xl mx-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-(--text-primary)">
                {editingId ? "Edit Location" : "New Location"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-(--text-disabled) hover:bg-(--bg-inset) hover:text-(--text-primary)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={fieldLabel}>Location Name</label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Main Branch"
                  className={fieldInput}
                />
              </div>

              <div className="relative">
                <label className={fieldLabel}>Search Address</label>
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Type to search address…"
                  className={fieldInput}
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) shadow-xl">
                    {searchResults.slice(0, 5).map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectResult(r)}
                        className="block w-full px-3 py-2 text-left text-xs text-(--text-secondary) hover:bg-(--bg-inset) first:rounded-t-[0.7rem] last:rounded-b-[0.7rem]"
                      >
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <LocationPickerMap
                latitude={draft.latitude}
                longitude={draft.longitude}
                onPinMove={handlePinMove}
                height={240}
              />

              {draft.latitude !== null && (
                <p className="text-[0.68rem] text-(--text-disabled)">
                  Pin: {draft.latitude.toFixed(6)}, {draft.longitude?.toFixed(6)}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !draft.name.trim()}
                >
                  {isSaving ? "Saving…" : "Save Location"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
