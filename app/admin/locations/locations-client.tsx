"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
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
  { ssr: false },
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

  const summary = useMemo(() => {
    const mapped = locations.filter(
      (location) =>
        typeof location.latitude === "number" &&
        Number.isFinite(location.latitude) &&
        typeof location.longitude === "number" &&
        Number.isFinite(location.longitude),
    ).length;

    const pendingPin = Math.max(locations.length - mapped, 0);
    const active = locations.filter((location) => location.is_active).length;
    const timezoneSet = locations.filter((location) => location.timezone.trim()).length;

    return {
      total: locations.length,
      mapped,
      pendingPin,
      active,
      timezoneSet,
    };
  }, [locations]);

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
        error instanceof Error ? error.message : "Failed to search locations.",
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

  const handlePinMove = useCallback(
    async (latitude: number, longitude: number) => {
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
            error instanceof Error ? error.message : "Failed to resolve location.",
          );
        }
      } finally {
        if (pinLookupRequestRef.current === requestId) {
          setIsResolvingPin(false);
        }
      }
    },
    [resetSearchState],
  );

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
        setSaveError(await getResponseMessage(res, `Save failed (${res.status}).`));
        return;
      }

      const saved: Location = await res.json();
      setLocations((current) =>
        editingId
          ? current.map((location) =>
              location.id === editingId ? saved : location,
            )
          : [saved, ...current],
      );
      setModalOpen(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save location.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Delete this location? Services using it will lose their location.",
      )
    ) {
      return;
    }

    const res = await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const message = await getResponseMessage(
        res,
        "Failed to delete location.",
      );
      setSaveError(message);
      return;
    }

    setLocations((current) => current.filter((location) => location.id !== id));
  };

  const closeModal = () => {
    setModalOpen(false);
    resetSearchState();
    setSaveError(null);
    setIsResolvingPin(false);
  };

  const showSearchDropdown =
    modalOpen &&
    (isSearching || !!searchError || searchResults.length > 0 || hasSearched);

  return (
    <div className="mx-auto max-w-280 space-y-6 text-(--seva-text)">
      <section className="relative overflow-hidden rounded-[1.1rem] border border-(--seva-border-subtle) bg-(--seva-surface) px-6 py-7 lg:px-9 lg:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,213,221,0.09),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,183,133,0.08),transparent_34%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--seva-accent)">
              Admin / Locations
            </p>
            <h1 className="sevacam-display mt-3 text-[clamp(2rem,4.2vw,3.2rem)] leading-[0.92] text-(--seva-text)">
              Location Control Deck
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-(--seva-text-soft)">
              Curate branch addresses, map coordinates, and timezone coverage so
              bookings are routed to the right place with clean geo context.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            className="sevacam-primary-button inline-flex min-h-10 items-center gap-2 rounded-[0.2rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Location
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sevacam-rail p-4">
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-accent)">
            Total Locations
          </p>
          <p className="mt-3 text-[1.85rem] leading-none tracking-[-0.04em] text-(--seva-text)">
            {summary.total}
          </p>
        </div>
        <div className="sevacam-rail p-4">
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-warm)">
            Mapped Pins
          </p>
          <p className="mt-3 text-[1.85rem] leading-none tracking-[-0.04em] text-(--seva-text)">
            {summary.mapped}
          </p>
        </div>
        <div className="sevacam-rail p-4">
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-violet)">
            Pending Coordinates
          </p>
          <p className="mt-3 text-[1.85rem] leading-none tracking-[-0.04em] text-(--seva-text)">
            {summary.pendingPin}
          </p>
        </div>
        <div className="sevacam-rail p-4">
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-rose)">
            Active Branches
          </p>
          <p className="mt-3 text-[1.85rem] leading-none tracking-[-0.04em] text-(--seva-text)">
            {summary.active}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="sevacam-rail overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-(--seva-border-subtle) px-5 py-4">
            <div>
              <p className="sevacam-eyebrow">Branch Directory</p>
              <p className="mt-1 text-[0.76rem] text-(--seva-text-soft)">
                All branch endpoints with geocoding and timezone metadata.
              </p>
            </div>
            <Button
              type="button"
              onClick={openCreate}
              className="sevacam-secondary-button inline-flex min-h-9 items-center gap-1.5 rounded-[0.2rem] px-4 text-[0.58rem] font-semibold uppercase tracking-[0.16em]"
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>

          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <MapPin className="h-8 w-8 text-(--seva-text-muted)" />
              <p className="text-sm text-(--seva-text-soft)">
                No locations yet. Create your first branch to begin routing.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-176 text-sm">
                <thead>
                  <tr className="border-b border-(--seva-border-subtle) bg-[rgba(255,255,255,0.01)]">
                    <th className="px-4 py-3 text-left text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-muted)">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-muted)">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-muted)">
                      Coordinates
                    </th>
                    <th className="px-4 py-3 text-left text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-muted)">
                      Timezone
                    </th>
                    <th className="px-4 py-3 text-right text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-muted)">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr
                      key={location.id}
                      className="border-b border-(--seva-border-subtle) last:border-b-0 hover:bg-[rgba(255,255,255,0.015)]"
                    >
                      <td className="px-4 py-3.5 align-top">
                        <p className="font-medium text-(--seva-text)">{location.name}</p>
                        <p className="mt-1 text-[0.68rem] text-(--seva-text-muted)">
                          {location.is_active ? "Active" : "Inactive"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top text-(--seva-text-soft)">
                        {location.address || "-"}
                      </td>
                      <td className="px-4 py-3.5 align-top font-mono text-[0.74rem] text-(--seva-text-muted)">
                        {location.latitude != null && location.longitude != null
                          ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                          : "Not pinned"}
                      </td>
                      <td className="px-4 py-3.5 align-top text-(--seva-text-soft)">
                        {location.timezone}
                      </td>
                      <td className="px-4 py-3.5 text-right align-top">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(location)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[0.45rem] border border-(--seva-border-subtle) bg-[rgba(255,255,255,0.02)] text-(--seva-text-soft) transition-colors hover:border-[rgba(122,213,221,0.24)] hover:text-(--seva-accent)"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(location.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[0.45rem] border border-(--seva-border-subtle) bg-[rgba(255,255,255,0.02)] text-[rgba(229,115,115,0.94)] transition-colors hover:border-[rgba(229,115,115,0.34)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="sevacam-rail p-4">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-(--seva-accent)" />
              <p className="sevacam-eyebrow">Coverage Pulse</p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="sevacam-side-stat">
                <span>Timezone registered</span>
                <span>{summary.timezoneSet}</span>
              </div>
              <div className="sevacam-side-stat">
                <span>Map-ready branches</span>
                <span>{summary.mapped}</span>
              </div>
              <div className="sevacam-side-stat">
                <span>Needs pin placement</span>
                <span>{summary.pendingPin}</span>
              </div>
            </div>
          </div>

          <div className="sevacam-rail p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-(--seva-warm)" />
              <p className="sevacam-eyebrow text-(--seva-warm)">Map Ops Notes</p>
            </div>
            <ul className="mt-3 space-y-2 text-[0.76rem] text-(--seva-text-soft)">
              <li className="rounded-xl border border-(--seva-border-subtle) bg-[rgba(255,255,255,0.015)] px-3 py-2">
                Search first, then refine with map pin placement.
              </li>
              <li className="rounded-xl border border-(--seva-border-subtle) bg-[rgba(255,255,255,0.015)] px-3 py-2">
                Double-click map to place a fresh marker instantly.
              </li>
              <li className="rounded-xl border border-(--seva-border-subtle) bg-[rgba(255,255,255,0.015)] px-3 py-2">
                Keep timezone accurate for booking and reminders.
              </li>
            </ul>
          </div>
        </aside>
      </section>

      {saveError && !modalOpen ? (
        <div className="rounded-[0.65rem] border border-[rgba(229,115,115,0.34)] bg-[rgba(42,21,21,0.8)] px-4 py-3 text-sm text-(--seva-text)">
          {saveError}
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="relative w-[min(95vw,72rem)] overflow-hidden rounded-2xl border border-(--seva-border-subtle) bg-(--seva-surface) shadow-[0_34px_70px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-(--seva-border-subtle) px-5 py-4 sm:px-6">
              <div>
                <p className="sevacam-eyebrow">Location Editor</p>
                <h2 className="mt-2 sevacam-display text-[1.35rem] leading-none text-(--seva-text)">
                  {editingId ? "Refine Branch Coordinates" : "Create New Branch"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-(--seva-border-subtle) bg-[rgba(255,255,255,0.02)] text-(--seva-text-soft) transition-colors hover:text-(--seva-text)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid max-h-[calc(100vh-8rem)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="sevacam-scroll-panel overflow-y-auto border-b border-(--seva-border-subtle) p-5 sm:p-6 lg:max-h-[calc(100vh-8rem)] lg:border-b-0 lg:border-r">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text-muted)">
                      Location Name
                    </label>
                    <Input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Main Branch"
                      className="sevacam-service-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="mb-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text-muted)">
                      Search Place Or Address
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={searchQuery}
                        onChange={(event) => handleSearchChange(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search by place name or address..."
                        className="sevacam-service-input"
                      />
                      <Button
                        type="button"
                        onClick={handleSearchSubmit}
                        disabled={isSearching || searchQuery.trim().length < 2}
                        className="sevacam-secondary-button h-10 shrink-0 rounded-[0.22rem] px-4 text-[0.56rem] font-semibold uppercase tracking-[0.14em]"
                      >
                        {isSearching ? "Searching..." : "Search"}
                      </Button>
                    </div>

                    {showSearchDropdown ? (
                      <div className="rounded-[0.7rem] border border-(--seva-border-subtle) bg-(--seva-elevated) shadow-xl">
                        {isSearching ? (
                          <div className="px-3 py-2 text-xs text-(--seva-text-muted)">
                            Searching locations...
                          </div>
                        ) : searchError ? (
                          <div className="px-3 py-2 text-xs text-[rgba(229,115,115,0.96)]">
                            {searchError}
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((result) => (
                            <button
                              key={`${result.lat}:${result.lon}:${result.display_name}`}
                              type="button"
                              onClick={() => selectResult(result)}
                              className="block w-full border-b border-(--seva-border-subtle) px-3 py-2 text-left text-xs text-(--seva-text-soft) last:border-b-0 hover:bg-[rgba(255,255,255,0.03)]"
                            >
                              {result.display_name}
                            </button>
                          ))
                        ) : hasSearched ? (
                          <div className="px-3 py-2 text-xs text-(--seva-text-muted)">
                            No matches found. Try a broader place name.
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text-muted)">
                      Resolved Address
                    </label>
                    <Input
                      value={draft.address}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      placeholder="Address appears after search or pin move"
                      className="sevacam-service-input"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text-muted)">
                      Timezone
                    </label>
                    <Input
                      value={draft.timezone}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          timezone: event.target.value,
                        }))
                      }
                      placeholder="Asia/Phnom_Penh"
                      className="sevacam-service-input"
                    />
                  </div>

                  {saveError ? (
                    <div className="rounded-[0.65rem] border border-[rgba(229,115,115,0.34)] bg-[rgba(42,21,21,0.8)] px-3 py-2 text-xs text-(--seva-text)">
                      {saveError}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={closeModal}
                      className="sevacam-secondary-button min-h-10 rounded-[0.22rem] px-4 text-[0.58rem] font-semibold uppercase tracking-[0.16em]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving || !draft.name.trim()}
                      className="sevacam-primary-button min-h-10 rounded-[0.22rem] px-4 text-[0.58rem] font-semibold uppercase tracking-[0.16em] disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save Location"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="sevacam-scroll-panel overflow-y-auto p-5 sm:p-6 lg:max-h-[calc(100vh-8rem)]">
                <p className="sevacam-eyebrow">Pin Placement</p>
                <p className="mt-2 text-[0.76rem] text-(--seva-text-soft)">
                  Click and drag the map, then double-click to drop a marker.
                  Drag an existing marker to fine tune branch coordinates.
                </p>

                <div className="mt-4 overflow-hidden rounded-[0.75rem] border border-(--seva-border-subtle)">
                  <LocationPickerMap
                    latitude={draft.latitude}
                    longitude={draft.longitude}
                    onPinMove={handlePinMove}
                    height={320}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {isResolvingPin ? (
                    <p className="text-[0.72rem] text-(--seva-text-muted)">
                      Looking up nearby address...
                    </p>
                  ) : null}
                  {draft.latitude !== null && draft.longitude !== null ? (
                    <p className="rounded-xl border border-(--seva-border-subtle) bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[0.72rem] text-(--seva-text-soft)">
                      Pin: {draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}
                    </p>
                  ) : (
                    <p className="rounded-xl border border-(--seva-border-subtle) bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[0.72rem] text-(--seva-text-muted)">
                      No pin yet. Double-click the map to place one.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
