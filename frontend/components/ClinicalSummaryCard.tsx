"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  Pill,
  AlertTriangle,
  Calendar,
  AlertCircle,
  FlaskConical,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { aiApi, type ExecutiveSummary } from "@/lib/api";
import { Spinner } from "./ui/spinner";
import { formatDate, formatRelativeDate } from "@/lib/utils";

function StatTile({
  icon: Icon,
  value,
  label,
  sub,
  accent,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-1 px-5 py-4 border-r last:border-0"
      style={{ borderColor: "var(--cs-border)" }}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color: accent ? "var(--cs-danger)" : "var(--cs-primary)" }} />
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--cs-text-muted)" }}>
          {label}
        </span>
      </div>
      <div
        className="text-2xl font-bold leading-none"
        style={{ color: accent ? "var(--cs-danger)" : "var(--cs-text)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function FlagBadge({ flag }: { flag: string }) {
  const isHigh = flag === "H" || flag === "HH";
  const isLow  = flag === "L" || flag === "LL";
  const color  = isHigh || isLow ? "var(--cs-danger)" : "var(--cs-text-muted)";
  return (
    <span
      className="text-xs font-bold px-1.5 py-0.5 rounded"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {flag}
    </span>
  );
}

function SummaryContent({ data }: { data: ExecutiveSummary }) {
  return (
    <div>
      {/* Stat row */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatTile
          icon={Heart}
          value={data.activeConditions.length}
          label="Active Conditions"
          sub={data.activeConditions[0]?.name ?? "—"}
        />
        <StatTile
          icon={Pill}
          value={data.medications.length}
          label="Medications"
          sub={data.medications.length >= 5 ? "Polypharmacy" : data.medications[0]?.name?.split(" ").slice(0, 2).join(" ") ?? "—"}
          accent={data.medications.length >= 5}
        />
        <StatTile
          icon={AlertTriangle}
          value={data.careGapCount}
          label="Care Gaps"
          sub={data.careGapHighCount > 0 ? `${data.careGapHighCount} high priority` : "None critical"}
          accent={data.careGapHighCount > 0}
        />
        <StatTile
          icon={Calendar}
          value={data.lastEncounter ? formatRelativeDate(data.lastEncounter.date) : "—"}
          label="Last Seen"
          sub={data.lastEncounter ? data.lastEncounter.type : "No encounters"}
        />
      </div>

      {/* Clinical alerts */}
      {data.alerts.length > 0 && (
        <div
          className="px-5 py-3 border-t flex flex-wrap gap-2"
          style={{ borderColor: "var(--cs-border)", backgroundColor: "color-mix(in srgb, var(--cs-danger) 4%, var(--cs-surface))" }}
        >
          <div className="flex items-center gap-1.5 w-full mb-0.5">
            <AlertCircle size={12} style={{ color: "var(--cs-danger)" }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cs-danger)" }}>
              Clinical Flags
            </span>
          </div>
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs w-full"
              style={{ color: "var(--cs-text-secondary)" }}
            >
              <span style={{ color: "var(--cs-danger)", lineHeight: "1.6" }}>•</span>
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Abnormal labs */}
      {data.abnormalLabs.length > 0 && (
        <div className="px-5 py-3 border-t" style={{ borderColor: "var(--cs-border)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <FlaskConical size={12} style={{ color: "var(--cs-text-muted)" }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cs-text-muted)" }}>
              Abnormal Labs
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {data.abnormalLabs.map((lab, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span style={{ color: "var(--cs-text-secondary)" }}>{lab.name.split("[")[0].trim()}</span>
                <span className="font-mono font-medium" style={{ color: "var(--cs-text)" }}>{lab.value}</span>
                <FlagBadge flag={lab.flag} />
                <span style={{ color: "var(--cs-text-muted)" }}>{formatDate(lab.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergies */}
      {data.allergies.length > 0 && (
        <div className="px-5 py-3 border-t flex items-start gap-2" style={{ borderColor: "var(--cs-border)" }}>
          <ShieldAlert size={12} style={{ color: "var(--cs-warning)", marginTop: 2 }} />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {data.allergies.map((a, i) => (
              <span key={i} className="text-xs">
                <span className="font-medium" style={{ color: "var(--cs-text)" }}>{a.substance}</span>
                {a.reaction && (
                  <span style={{ color: "var(--cs-text-muted)" }}> ({a.reaction})</span>
                )}
                {a.criticality === "high" && (
                  <span className="ml-1 text-xs font-bold" style={{ color: "var(--cs-danger)" }}>⚠</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ClinicalSummaryCard({ patientId }: { patientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["executive-summary", patientId],
    queryFn: () => aiApi.getExecutiveSummary(patientId),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div
      className="rounded-(--cs-radius) overflow-hidden border"
      style={{ borderColor: "var(--cs-border)", boxShadow: "var(--cs-shadow-sm)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-2.5 border-b"
        style={{ borderColor: "var(--cs-border)", backgroundColor: "var(--cs-surface-2)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cs-text-secondary)" }}>
          Executive Summary
        </span>
        {isLoading && <Spinner size="sm" />}
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 px-5 py-6">
          <Spinner size="sm" />
          <span className="text-sm" style={{ color: "var(--cs-text-muted)" }}>
            Compiling patient overview…
          </span>
        </div>
      )}

      {data && <SummaryContent data={data} />}
    </div>
  );
}
