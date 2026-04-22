"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  reverseGeocodeCandidate,
  searchLocationCandidates,
  suggestLocationName,
  type GeocodeResult,
} from "@/lib/location-search";
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

async function getResponseMessage(res: Response, fallback: string) {
  const raw = (await res.text().catch(() => "")).trim();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown };
    const detail = parsed.detail ?? parsed.message;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to the raw response body.
  }

  return raw;
}

function buildLocationPayload(draft: LocationDraft, searchQuery: string) {
  const latitude =
    typeof draft.latitude === "number" && Number.isFinite(draft.latitude)
      ? draft.latitude
      : null;
  const longitude =
    typeof draft.longitude === "number" && Number.isFinite(draft.longitude)
      ? draft.longitude
      : null;

  return {
    name: draft.name.trim(),
    address: draft.address.trim() || searchQuery.trim() || null,
    latitude,
    longitude,
    timezone: draft.timezone || "Asia/Phnom_Penh",
  };
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

export default function EnhancedLocation({
  formData,
  updateField,
}: EnhancedLocationProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [recentlySavedLocationId, setRecentlySavedLocationId] = useState<string | null>(
    null
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocationDraft>(emptyDraft());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isResolvingPin, setIsResolvingPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const pinLookupRequestRef = useRef(0);

  const fetchLocations = useCallback(() => {
    setLoading(true);
    setLoadError(null);

    fetch("/api/admin/locations")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await getResponseMessage(res, "Failed to load locations."));
        }

        return res.json();
      })
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch((error: unknown) => {
        setLocations([]);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load locations."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const selectedLocations = locations.filter((location) =>
    (formData.location_ids ?? []).includes(location.id)
  );

  useEffect(() => {
    if (selectedLocations.length === 0) {
      setActivePreviewId(null);
      return;
    }

    if (activePreviewId && selectedLocations.some((location) => location.id === activePreviewId)) {
      return;
    }

    setActivePreviewId(selectedLocations[0].id);
  }, [activePreviewId, selectedLocations]);

  const previewLocation =
    selectedLocations.find(
      (location) =>
        location.id === activePreviewId &&
        location.latitude !== null &&
        location.longitude !== null
    ) ??
    selectedLocations.find(
      (location) => location.latitude !== null && location.longitude !== null
    ) ??
    null;

  const runSearch = useCallback(async (value: string) => {
    const query = value.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("Enter at least 2 characters to search.");
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchLocationCandidates(query);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      setSearchResults([]);
      setSearchError(
        error instanceof Error ? error.message : "Failed to search locations."
      );
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const toggleLocation = (id: string) => {
    const current = formData.location_ids ?? [];

    if (current.includes(id)) {
      const next = current.filter((value) => value !== id);
      updateField("location_ids", next);

      if (activePreviewId === id) {
        setActivePreviewId(next[0] ?? null);
      }

      return;
    }

    updateField("location_ids", [...current, id]);
    setActivePreviewId(id);
    setRecentlySavedLocationId(null);
  };

  const resetSearchState = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
    setIsSearching(false);
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSearchQuery("");
    resetSearchState();
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (location: LocationOption, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingId(location.id);
    setDraft({
      name: location.name,
      address: location.address ?? "",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone ?? "Asia/Phnom_Penh",
    });
    setSearchQuery(location.address || location.name);
    resetSearchState();
    setSaveError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetSearchState();
    setSaveError(null);
    setIsResolvingPin(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
    setIsSearching(false);

    if (value.trim().length < 2) {
      resetSearchState();
      return;
    }
  };

  const handleSearchSubmit = useCallback(() => {
    void runSearch(searchQuery);
  }, [runSearch, searchQuery]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    handleSearchSubmit();
  };

  const selectResult = (result: GeocodeResult) => {
    const suggestedName = suggestLocationName(result);

    setDraft((current) => ({
      ...current,
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      name: current.name.trim() || suggestedName,
    }));
    setSearchQuery(result.display_name);
    resetSearchState();
  };

  const handlePinMove = useCallback(async (latitude: number, longitude: number) => {
    setDraft((current) => ({ ...current, latitude, longitude }));
    resetSearchState();

    const requestId = pinLookupRequestRef.current + 1;
    pinLookupRequestRef.current = requestId;
    setIsResolvingPin(true);

    try {
      const result = await reverseGeocodeCandidate(latitude, longitude);

      if (!result || pinLookupRequestRef.current !== requestId) {
        return;
      }

      const suggestedName = suggestLocationName(result);

      setDraft((current) => ({
        ...current,
        address: result.display_name || current.address,
        name: current.name.trim() || suggestedName,
      }));
      setSearchQuery(result.display_name || "");
    } catch (error) {
      if (pinLookupRequestRef.current === requestId) {
        setSearchError(
          error instanceof Error ? error.message : "Failed to resolve location."
        );
      }
    } finally {
      if (pinLookupRequestRef.current === requestId) {
        setIsResolvingPin(false);
      }
    }
  }, [resetSearchState]);

  const handleSave = async () => {
    if (!draft.name.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const url = editingId
        ? `/api/admin/locations/${editingId}`
        : "/api/admin/locations";
      const method = editingId ? "PUT" : "POST";
      const payload = buildLocationPayload(draft, searchQuery);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setSaveError(
          await getResponseMessage(res, `Save failed (${res.status}).`)
        );
        return;
      }

      const saved: LocationOption = await res.json();
      setLocations((current) =>
        editingId
          ? current.map((location) =>
              location.id === editingId ? saved : location
            )
          : [saved, ...current]
      );

      setActivePreviewId(saved.id);
      setRecentlySavedLocationId(saved.id);

      if (!editingId) {
        updateField(
          "location_ids",
          Array.from(new Set([saved.id, ...(formData.location_ids ?? [])]))
        );
      }

      closeModal();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save location."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm("Delete this location?")) return;

    await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });
    setLocations((current) => current.filter((location) => location.id !== id));
    updateField(
      "location_ids",
      (formData.location_ids ?? []).filter((value) => value !== id)
    );

    if (activePreviewId === id) {
      const nextSelected = (formData.location_ids ?? []).filter((value) => value !== id);
      setActivePreviewId(nextSelected[0] ?? null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-(--text-disabled)">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
        Loading locations...
      </div>
    );
  }

  const showSearchDropdown =
    modalOpen &&
    (isSearching || !!searchError || searchResults.length > 0 || hasSearched);

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-[0.7rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
            Branch Locations
          </p>
          <p className="mt-0.5 text-xs text-(--text-disabled)">
            Select branches where this service is offered. New branches are selected automatically after you save them.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openCreate}
          className="shrink-0 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          New Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[0.85rem] border border-dashed border-(--border-subtle) py-12 text-center">
          <MapPin className="h-7 w-7 text-(--text-disabled)" />
          <div>
            <p className="text-sm font-medium text-(--text-primary)">No locations yet</p>
            <p className="mt-0.5 text-xs text-(--text-disabled)">
              Click &ldquo;New Location&rdquo; above to add your first branch.
            </p>
          </div>
          <Button type="button" size="sm" onClick={openCreate} className="mt-1 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add First Location
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((location) => {
            const selected = (formData.location_ids ?? []).includes(location.id);
            const highlighted = location.id === recentlySavedLocationId;

            return (
              <div
                key={location.id}
                onClick={() => toggleLocation(location.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-[0.7rem] border px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-(--accent-primary) bg-[rgba(122,213,221,0.08)]"
                    : "border-(--border-subtle) bg-(--bg-inset) hover:bg-(--bg-elevated)"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    selected
                      ? "border-(--accent-primary) bg-(--accent-primary)"
                      : "border-(--border-subtle)"
                  }`}
                >
                  {selected ? <Check className="h-3 w-3 text-black" /> : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-(--text-primary)">
                      {location.name}
                    </p>
                    {highlighted && selected ? (
                      <span className="rounded-full bg-(--accent-primary) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  {location.address ? (
                    <p className="truncate text-xs text-(--text-disabled)">
                      {location.address}
                    </p>
                  ) : null}
                  {location.latitude != null ? (
                    <p className="mt-0.5 font-mono text-[0.65rem] text-(--text-disabled)">
                      {location.latitude.toFixed(4)}, {location.longitude?.toFixed(4)}
                    </p>
                  ) : null}
                </div>

                <div
                  className="flex shrink-0 gap-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(event) => openEdit(location, event)}
                    className="rounded p-1.5 text-(--text-disabled) hover:bg-(--bg-elevated) hover:text-(--text-primary)"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => handleDelete(location.id, event)}
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

      {previewLocation ? (
        <div>
          <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
            Selected Location Preview
          </p>
          <LocationMapView
            location={{
              name: previewLocation.name,
              address: previewLocation.address ?? "",
              latitude: previewLocation.latitude!,
              longitude: previewLocation.longitude!,
            }}
            height={220}
            compact
          />
          {recentlySavedLocationId === previewLocation.id ? (
            <p className="mt-1.5 text-[0.68rem] text-(--text-disabled)">
              The newly created branch is selected and shown above so you can verify it immediately.
            </p>
          ) : null}
        </div>
      ) : selectedLocations.length > 0 ? (
        <div className="rounded-[0.7rem] border border-dashed border-(--border-subtle) px-4 py-3 text-sm text-(--text-disabled)">
          Selected branches do not have map coordinates yet. Edit one or create a new branch and place its pin on the map.
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-(--border-subtle) bg-(--bg-elevated) p-6 shadow-2xl">
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
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Main Branch"
                  className={fieldInput}
                />
              </div>

              <div className="space-y-2">
                <label className={fieldLabel}>Search Place Or Address</label>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search by place name or address..."
                    className={fieldInput}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSearchSubmit}
                    disabled={isSearching || searchQuery.trim().length < 2}
                    className="h-10 shrink-0"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>

                {showSearchDropdown ? (
                  <div className="rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) shadow-xl">
                    {isSearching ? (
                      <div className="px-3 py-2 text-xs text-(--text-disabled)">
                        Searching locations...
                      </div>
                    ) : searchError ? (
                      <div className="px-3 py-2 text-xs text-red-300">{searchError}</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={`${result.lat}:${result.lon}:${result.display_name}`}
                          type="button"
                          onClick={() => selectResult(result)}
                          className="block w-full px-3 py-2 text-left text-xs text-(--text-secondary) hover:bg-(--bg-inset) first:rounded-t-[0.7rem] last:rounded-b-[0.7rem]"
                        >
                          {result.display_name}
                        </button>
                      ))
                    ) : hasSearched ? (
                      <div className="px-3 py-2 text-xs text-(--text-disabled)">
                        No matches found. Try a broader place name or click the map below.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <LocationPickerMap
                  latitude={draft.latitude}
                  longitude={draft.longitude}
                  onPinMove={handlePinMove}
                  height={260}
                />

                <p className="text-[0.68rem] text-(--text-disabled)">
                  Use Search to find a place, or click and drag to move the map then double-click to confirm a pin.
                </p>

                {isResolvingPin ? (
                  <p className="text-[0.68rem] text-(--text-disabled)">
                    Looking up the nearby address...
                  </p>
                ) : null}

                {draft.latitude !== null ? (
                  <p className="text-[0.68rem] text-(--text-disabled)">
                    Pin: {draft.latitude.toFixed(6)}, {draft.longitude?.toFixed(6)}
                  </p>
                ) : null}
              </div>

              {saveError ? (
                <div className="rounded-[0.7rem] border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {saveError}
                </div>
              ) : null}

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
                  {isSaving ? "Saving..." : "Save Location"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
