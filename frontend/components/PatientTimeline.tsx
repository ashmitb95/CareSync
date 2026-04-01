"use client";

import { useState } from "react";
import { Activity, FlaskConical, Pill, Heart, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fhirApi, type TimelineEvent } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "./ui/spinner";
import { FHIRJsonViewer } from "./FHIRJsonViewer";
import { formatDate, formatRelativeDate } from "@/lib/utils";

const TYPE_CONFIG = {
  encounter: {
    icon: Activity,
    color: "var(--cs-encounter)",
    bg: "var(--cs-info-bg)",
    label: "Encounter",
  },
  lab: {
    icon: FlaskConical,
    color: "var(--cs-lab)",
    bg: "var(--cs-success-bg)",
    label: "Lab Result",
  },
  medication: {
    icon: Pill,
    color: "var(--cs-medication)",
    bg: "var(--cs-warning-bg)",
    label: "Medication",
  },
  condition: {
    icon: Heart,
    color: "var(--cs-condition)",
    bg: "var(--cs-danger-bg)",
    label: "Condition",
  },
};

function TimelineItem({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[event.type];
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4">
      {/* Timeline spine + icon */}
      <div className="flex flex-col items-center">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ backgroundColor: cfg.bg, border: `1.5px solid ${cfg.color}` }}
        >
          <Icon size={14} style={{ color: cfg.color }} strokeWidth={2} />
        </div>
        <div className="flex-1 w-px mt-1" style={{ backgroundColor: "var(--cs-border)" }} />
      </div>

      {/* Content */}
      <div className="pb-5 flex-1 min-w-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left group"
        >
          <div
            className="cs-card p-4 hover:shadow transition-shadow cursor-pointer"
            style={{ boxShadow: expanded ? "var(--cs-shadow)" : undefined }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
                    {formatRelativeDate(event.date)}
                  </span>
                  {event.detail === "H" || event.detail === "L" ? (
                    <span
                      className="text-xs font-bold"
                      style={{ color: "var(--cs-danger)" }}
                    >
                      {event.detail === "H" ? "HIGH" : "LOW"}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-medium mt-0.5 truncate" style={{ color: "var(--cs-text)" }}>
                  {event.title}
                </p>
                {event.subtitle && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--cs-text-secondary)" }}>
                    {event.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
                  {formatDate(event.date)}
                </span>
                {expanded ? (
                  <ChevronDown size={14} style={{ color: "var(--cs-text-muted)" }} />
                ) : (
                  <ChevronRight size={14} style={{ color: "var(--cs-text-muted)" }} />
                )}
              </div>
            </div>

            {expanded && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--cs-border)" }}>
                <FHIRJsonViewer data={event.resource} title="FHIR Resource" maxDepth={4} />
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

export function PatientTimeline({ patientId }: { patientId: string }) {
  const [filter, setFilter] = useState<TimelineEvent["type"] | "all">("all");

  const { data, isLoading, isError, refetch } = useQuery<TimelineEvent[]>({
    queryKey: ["timeline", patientId],
    queryFn: () => fhirApi.getTimeline(patientId),
  });

  const events = (data ?? []).filter((e) => filter === "all" || e.type === filter);

  const typeCounts = (data ?? []).reduce(
    (acc, e) => ({ ...acc, [e.type]: (acc[e.type] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(["all", "encounter", "lab", "medication", "condition"] as const).map((type) => {
          const count = type === "all" ? (data?.length ?? 0) : (typeCounts[type] ?? 0);
          const cfg = type !== "all" ? TYPE_CONFIG[type] : null;
          const isActive = filter === type;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive
                  ? cfg?.color ?? "var(--cs-primary)"
                  : "var(--cs-surface-2)",
                color: isActive ? "#fff" : "var(--cs-text-secondary)",
                border: `1px solid ${isActive ? "transparent" : "var(--cs-border)"}`,
              }}
            >
              {type === "all" ? "All" : TYPE_CONFIG[type].label}
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "var(--cs-border)",
                  color: isActive ? "#fff" : "var(--cs-text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingState message="Building timeline…" />
      ) : isError ? (
        <ErrorState message="Could not load timeline" onRetry={() => refetch()} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Activity size={20} style={{ color: "var(--cs-text-muted)" }} />}
          title="No events"
          description="No timeline events found for this patient"
        />
      ) : (
        <div>
          {events.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
