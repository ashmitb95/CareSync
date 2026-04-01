import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CareGap } from "@/lib/api";
import { SeverityBadge } from "./ui/badge";

interface CareGapCardProps {
  gap: CareGap;
  compact?: boolean;
}

export function CareGapCard({ gap, compact }: CareGapCardProps) {
  const severityIcon = {
    high:   <AlertTriangle size={14} style={{ color: "var(--cs-danger)" }} />,
    medium: <AlertCircle size={14} style={{ color: "var(--cs-warning)" }} />,
    low:    <Info size={14} style={{ color: "var(--cs-info)" }} />,
  }[gap.severity];

  const severityBorder = {
    high:   "var(--cs-danger)",
    medium: "var(--cs-warning)",
    low:    "var(--cs-info)",
  }[gap.severity];

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          backgroundColor: "var(--cs-surface-2)",
          borderLeft: `3px solid ${severityBorder}`,
        }}
      >
        {severityIcon}
        <span className="text-xs font-medium truncate" style={{ color: "var(--cs-text)" }}>
          {gap.name}
        </span>
        {gap.daysOverdue != null && (
          <span className="text-xs ml-auto shrink-0" style={{ color: "var(--cs-text-muted)" }}>
            {gap.daysOverdue}d overdue
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="cs-card p-4"
      style={{ borderLeft: `3px solid ${severityBorder}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5">{severityIcon}</div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--cs-text)" }}>
              {gap.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cs-text-secondary)" }}>
              {gap.description}
            </p>
            {gap.triggeringCondition && (
              <p className="text-xs mt-1" style={{ color: "var(--cs-text-muted)" }}>
                Triggered by: {gap.triggeringCondition}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <SeverityBadge severity={gap.severity} />
          {gap.daysOverdue != null && (
            <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
              {gap.daysOverdue}d overdue
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CareGapCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
      style={{ backgroundColor: count >= 3 ? "var(--cs-danger)" : "var(--cs-warning)" }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
