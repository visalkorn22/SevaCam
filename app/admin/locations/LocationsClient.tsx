"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, MapPin, X } from "lucide-react";

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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSearchQuery("");
    setSearchResults([]);
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setDraft({
      name: loc.name,
      address: loc.address ?? "",
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
    });
    setSearchQuery(loc.address ?? "");
    setSearchResults([]);
    setModalOpen(true);
  };

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

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = editingId
        ? `${apiUrl}/api/admin/locations/${editingId}`
        : `${apiUrl}/api/admin/locations`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved: Location = await res.json();
      setLocations((prev) =>
        editingId
          ? prev.map((l) => (l.id === editingId ? saved : l))
          : [saved, ...prev]
      );
      setModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this location? Services using it will lose their location.")) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    await fetch(`${apiUrl}/api/admin/locations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const fieldLabel = "mb-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";
  const fieldInput = "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:ring-1 focus-visible:ring-(--accent-primary)";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-(--text-primary)">Locations</h1>
          <p className="text-sm text-(--text-disabled)">Manage physical branch locations</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[0.85rem] border border-dashed border-(--border-subtle) py-16 text-center">
          <MapPin className="h-8 w-8 text-(--text-disabled)" />
          <p className="text-sm text-(--text-disabled)">No locations yet. Add your first branch.</p>
        </div>
      ) : (
        <div className="rounded-[0.85rem] border border-(--border-subtle) overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border-subtle) bg-(--bg-inset)">
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">Name</th>
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">Address</th>
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">Coordinates</th>
                <th className="px-4 py-2.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, i) => (
                <tr key={loc.id} className={i > 0 ? "border-t border-(--border-subtle)" : ""}>
                  <td className="px-4 py-3 font-medium text-(--text-primary)">{loc.name}</td>
                  <td className="px-4 py-3 text-(--text-secondary)">{loc.address ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-(--text-disabled)">
                    {loc.latitude != null ? `${loc.latitude.toFixed(4)}, ${loc.longitude?.toFixed(4)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(loc.id)}>
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

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-(--border-subtle) bg-(--bg-elevated) p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-(--text-primary)">
                {editingId ? "Edit Location" : "New Location"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
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
                  placeholder="Type to search address..."
                  className={fieldInput}
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) shadow-xl">
                    {searchResults.slice(0, 5).map((r, i) => (
                      <button
                        key={i}
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
                height={260}
              />
              {draft.latitude !== null && (
                <p className="text-[0.68rem] text-(--text-disabled)">
                  Pin: {draft.latitude.toFixed(6)}, {draft.longitude?.toFixed(6)}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving || !draft.name.trim()}>
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
