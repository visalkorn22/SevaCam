import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: number
  changeLabel?: string
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0

  return (
    <Card className={cn("p-0", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-(--accent-subtle) text-(--accent-primary)">
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-sm text-(--text-secondary)">{title}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            {change !== undefined && (
              <p className="mt-1 text-xs text-(--text-secondary)">
                {changeLabel || "from last month"}
              </p>
            )}
          </div>
        </div>
        {change !== undefined && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              isPositive
                ? "bg-(--state-success-subtle) text-(--state-success)"
                : "bg-(--state-error-subtle) text-(--state-error)",
            )}
          >
            {isPositive ? "+" : ""}
            {change}%
          </span>
        )}
      </CardContent>
    </Card>
  )
}
