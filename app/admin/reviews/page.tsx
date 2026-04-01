import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/dashboard/empty-state";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type ReviewRow = {
  id: string;
  rating: number;
  comment?: string | null;
  is_visible: boolean;
  created_at: string;
  customer?: { full_name?: string | null };
  service?: { name?: string | null };
};

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  const res = await fetch(`${apiUrl}/api/auth/me`, {
    method: "GET",
    headers: { Cookie: cookie },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}

async function getReviews(): Promise<ReviewRow[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  // Backend endpoint you should create:
  // GET /api/admin/reviews
  try {
    const res = await fetch(`${apiUrl}/api/admin/reviews`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as ReviewRow[];
  } catch {
    return [];
  }
}

export default async function AdminReviewsPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const reviews = await getReviews();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Reviews & Ratings</h2>
        <p className="text-muted-foreground">
          Moderate and manage customer feedback
        </p>
      </div>

      {reviews.length > 0 ? (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <Card key={review.id} className="">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-semibold">
                        {review.customer?.full_name || "Unknown"}
                      </span>
                      <Badge variant="outline">
                        {review.service?.name || "N/A"}
                      </Badge>
                    </div>

                    <div className="mb-2 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-4 ${
                            i < Number(review.rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">
                        {format(new Date(review.created_at), "MMM d, yyyy")}
                      </span>
                    </div>

                    {review.comment && (
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                  </div>

                  {/* NOTE: This button is UI-only unless you add the backend toggle endpoint.
                      If you want it fully working, I’ll give you the API too. */}
                  <Button size="sm" variant="ghost" asChild>
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      {review.is_visible ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                    </a>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Customer reviews will appear here once they're submitted."
        />
      )}
    </DashboardLayout>
  );
}
