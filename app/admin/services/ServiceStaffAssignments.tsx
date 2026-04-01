"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

type StaffOption = {
  id: string;
  full_name: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role: "staff" | "admin" | "superadmin" | "customer";
  is_active: boolean;
};

type AssignedStaff = {
  id: string;
  full_name: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
  assignment_id: string;
};

type Props = {
  serviceId: string;
  staffOptions: StaffOption[];
  assignedStaff: AssignedStaff[];
};

export default function ServiceStaffAssignments({
  serviceId,
  staffOptions,
  assignedStaff,
}: Props) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [currentAssignments, setCurrentAssignments] =
    useState<AssignedStaff[]>(assignedStaff);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const availableStaff = useMemo(() => {
    const assignedIds = new Set(currentAssignments.map((item) => item.id));
    return staffOptions.filter(
      (staff) => staff.is_active && !assignedIds.has(staff.id),
    );
  }, [currentAssignments, staffOptions]);

  const assignStaff = async () => {
    setError(null);
    if (!selectedStaffId) return;
    setIsSaving(true);

    try {
      const res = await fetch("/api/staff/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          staff_id: selectedStaffId,
          service_id: serviceId,
          is_bookable: true,
          is_temporarily_unavailable: false,
          admin_only: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || "Assign failed");
      }

      const created = await res.json();
      const assigned = staffOptions.find(
        (staff) => staff.id === selectedStaffId,
      );

      if (assigned) {
        setCurrentAssignments((prev) => [
          {
            id: assigned.id,
            full_name: assigned.full_name,
            phone: assigned.phone ?? null,
            avatar_url: assigned.avatar_url ?? null,
            role: assigned.role,
            assignment_id: created.id,
          },
          ...prev,
        ]);
      }
      setSelectedStaffId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign staff");
    } finally {
      setIsSaving(false);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/staff/services/${assignmentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || "Remove failed");
      }

      setCurrentAssignments((prev) =>
        prev.filter((item) => item.assignment_id !== assignmentId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove staff");
    }
  };

  return (
    <Card className="">
      <CardHeader>
        <CardTitle>Assign Staff</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {availableStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name || "Staff Member"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={assignStaff}
            disabled={!selectedStaffId || isSaving}
          >
            {isSaving ? "Assigning..." : "Assign"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {currentAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No staff assigned yet.
            </p>
          ) : (
            currentAssignments.map((staff) => (
              <div
                key={staff.assignment_id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {staff.full_name || "Staff Member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {staff.phone || "No phone on file"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{staff.role}</Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Remove staff"
                    onClick={() => removeAssignment(staff.assignment_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
