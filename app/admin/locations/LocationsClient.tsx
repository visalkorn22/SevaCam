"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  reverseGeocodeCandidate,
  searchLocationCandidates,
  suggestLocationName,
  type GeocodeResult,
} from "@/lib/location-search";

const LocationPickerMap = dynamic(
  () => import("@/components/admin/LocationPickerMap"),
  { ssr: false }
);

type Location = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  is_active: boolean;
};

type LocationDraft = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
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

export default function LocationsClient({
  initialLocations,
}: {
  initialLocations: Location[];
}) {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
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

  const openEdit = (location: Location) => {
    setEditingId(location.id);
    setDraft({
      name: location.name,
      address: location.address ?? "",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    });
    setSearchQuery(location.address || location.name);
    resetSearchState();
    setSaveError(null);
    setModalOpen(true);
  };

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
        : `/api/admin/locations`;
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

      const saved: Location = await res.json();
      setLocations((current) =>
        editingId
          ? current.map((location) =>
              location.id === editingId ? saved : location
            )
          : [saved, ...current]
      );
      setModalOpen(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save location."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Delete this location? Services using it will lose their location."
      )
    ) {
      return;
    }

    await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });
    setLocations((current) => current.filter((location) => location.id !== id));
  };

  const closeModal = () => {
    setModalOpen(false);
    resetSearchState();
    setSaveError(null);
    setIsResolvingPin(false);
  };

  const fieldLabel =
    "mb-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";
  const fieldInput =
    "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:ring-1 focus-visible:ring-(--accent-primary)";
  const showSearchDropdown =
    modalOpen &&
    (isSearching || !!searchError || searchResults.length > 0 || hasSearched);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-(--text-primary)">
            Locations
          </h1>
          <p className="text-sm text-(--text-disabled)">
            Manage physical branch locations
          </p>
        </div>
        <Button type="button" onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[0.85rem] border border-dashed border-(--border-subtle) py-16 text-center">
          <MapPin className="h-8 w-8 text-(--text-disabled)" />
          <p className="text-sm text-(--text-disabled)">
            No locations yet. Add your first branch.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[0.85rem] border border-(--border-subtle)">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border-subtle) bg-(--bg-inset)">
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">
                  Address
                </th>
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">
                  Coordinates
                </th>
                <th className="px-4 py-2.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location, index) => (
                <tr
                  key={location.id}
                  className={index > 0 ? "border-t border-(--border-subtle)" : ""}
                >
                  <td className="px-4 py-3 font-medium text-(--text-primary)">
                    {location.name}
                  </td>
                  <td className="px-4 py-3 text-(--text-secondary)">
                    {location.address ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-(--text-disabled)">
                    {location.latitude != null
                      ? `${location.latitude.toFixed(4)}, ${location.longitude?.toFixed(4)}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(location)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(location.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-(--border-subtle) bg-(--bg-elevated) p-6 shadow-2xl">
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
              {saveError ? (
                <div className="rounded-[0.7rem] border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {saveError}
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeModal}
                >
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
