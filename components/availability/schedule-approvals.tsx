"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ScheduleRequest = {
  id: string;
  staff_id: string;
  requested_by: string | null;
  status: "pending" | "approved" | "rejected";
  payload: Record<string, unknown>;
  reason: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export function ScheduleApprovals() {
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/availability/schedule-requests?status=pending`,
      );
      if (res.ok) {
        const data = (await res.json()) as ScheduleRequest[];
        setRequests(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const handleDecision = async (
    requestId: string,
    decision: "approve" | "reject",
  ) => {
    const review_note = reviewNotes[requestId] || null;
    const res = await fetch(
      `/api/availability/schedule-requests/${requestId}/${decision}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_note }),
      },
    );

    if (res.ok) {
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      await fetchRequests();
    }
  };

  return (
    <Card className="">
      <CardHeader>
        <CardTitle>Schedule Approvals</CardTitle>
        <CardDescription>Review pending schedule requests</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      Request {request.id}
                    </div>
                    {request.reason && (
                      <p className="text-xs text-muted-foreground">
                        {request.reason}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{request.status}</Badge>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(request.payload, null, 2)}
                  </pre>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Review note</Label>
                  <Input
                    value={reviewNotes[request.id] ?? ""}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({
                        ...prev,
                        [request.id]: e.target.value,
                      }))
                    }
                    placeholder="Optional note for staff"
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleDecision(request.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecision(request.id, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
