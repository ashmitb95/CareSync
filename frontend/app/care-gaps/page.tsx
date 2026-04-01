"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, TrendingUp, Users, ShieldCheck, ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/ui/spinner";
import { careGapsApi } from "@/lib/api";

const SEVERITY_COLORS = {
  high:   "var(--cs-danger)",
  medium: "var(--cs-warning)",
  low:    "var(--cs-info)",
};

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: React.FC<{ size?: number; style?: React.CSSProperties }>;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--cs-text-muted)" }}>
            {label}
          </p>
          <p className="text-3xl font-bold mt-1" style={{ color: color ?? "var(--cs-text)" }}>
            {value}
          </p>
          {sub && (
            <p className="text-xs mt-0.5" style={{ color: "var(--cs-text-muted)" }}>
              {sub}
            </p>
          )}
        </div>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ backgroundColor: color ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--cs-surface-2)" }}
        >
          <Icon size={18} style={{ color: color ?? "var(--cs-text-secondary)" }} />
        </div>
      </div>
    </Card>
  );
}

export default function CareGapsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["care-gaps-population"],
    queryFn: careGapsApi.getPopulationGaps,
  });

  if (isLoading) return (
    <div className="flex flex-col flex-1">
      <TopBar title="Care Gaps" subtitle="Population-level analysis" />
      <LoadingState message="Evaluating population care gaps…" />
    </div>
  );

  if (isError) return (
    <div className="flex flex-col flex-1">
      <TopBar title="Care Gaps" subtitle="Population-level analysis" />
      <ErrorState onRetry={() => refetch()} />
    </div>
  );

  const pieData = [
    { name: "High",   value: data?.gapsBySeverity.high   ?? 0, color: "var(--cs-danger)" },
    { name: "Medium", value: data?.gapsBySeverity.medium ?? 0, color: "var(--cs-warning)" },
    { name: "Low",    value: data?.gapsBySeverity.low    ?? 0, color: "var(--cs-info)" },
  ].filter((d) => d.value > 0);

  const gapsPerPatient = data
    ? Math.round((data.totalGaps / Math.max(data.totalPatients, 1)) * 10) / 10
    : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        title="Care Gaps"
        subtitle="Population-level analysis"
        actions={
          <button className="cs-btn-secondary text-xs" onClick={() => refetch()}>
            Re-evaluate
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-5 overflow-auto">
        {/* Summary stats */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <StatCard
            label="Patients Evaluated"
            value={data?.totalPatients ?? 0}
            icon={Users}
          />
          <StatCard
            label="Total Gaps"
            value={data?.totalGaps ?? 0}
            color="var(--cs-danger)"
            sub={`${gapsPerPatient} avg per patient`}
            icon={AlertTriangle}
          />
          <StatCard
            label="High Severity"
            value={data?.gapsBySeverity.high ?? 0}
            color="var(--cs-danger)"
            icon={AlertTriangle}
          />
          <StatCard
            label="Compliance Rate"
            value={data ? `${Math.round(100 - (data.totalGaps / Math.max(data.totalPatients, 1)) * 20)}%` : "—"}
            color="var(--cs-success)"
            sub="estimated"
            icon={ShieldCheck}
          />
        </div>

        {/* Charts row */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "2fr 1fr" }}>
          {/* Gaps by type bar chart */}
          <Card>
            <CardHeader>
              <CardTitle>Gaps by Type</CardTitle>
            </CardHeader>
            {data?.gapsByType && data.gapsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.gapsByType}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  barSize={28}
                >
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 11, fill: "var(--cs-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--cs-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--cs-surface)",
                      border: "1px solid var(--cs-border)",
                      borderRadius: "var(--cs-radius-sm)",
                      fontSize: "0.75rem",
                      boxShadow: "var(--cs-shadow-sm)",
                    }}
                    cursor={{ fill: "var(--cs-surface-2)" }}
                  />
                  <Bar dataKey="count" fill="var(--cs-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm" style={{ color: "var(--cs-text-muted)" }}>
                No gap data
              </div>
            )}
          </Card>

          {/* Severity donut */}
          <Card>
            <CardHeader>
              <CardTitle>By Severity</CardTitle>
            </CardHeader>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--cs-surface)",
                        border: "1px solid var(--cs-border)",
                        borderRadius: "var(--cs-radius-sm)",
                        fontSize: "0.75rem",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-xs" style={{ color: "var(--cs-text-secondary)" }}>
                        {d.name} ({d.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm" style={{ color: "var(--cs-text-muted)" }}>
                No data
              </div>
            )}
          </Card>
        </div>

        {/* Seed patient gap summary */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Patients with Active Gaps</CardTitle>
          </CardHeader>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {[
              { id: "seed-001", name: "Minh Nguyen", gaps: 3, severity: "high" as const },
              { id: "seed-003", name: "Carlos Martinez", gaps: 2, severity: "medium" as const },
              { id: "seed-004", name: "Eleanor Thompson", gaps: 4, severity: "high" as const },
              { id: "seed-008", name: "Miguel Reyes", gaps: 5, severity: "high" as const },
              { id: "seed-010", name: "Dorothy Williams", gaps: 3, severity: "high" as const },
            ].map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="flex items-center justify-between p-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: "var(--cs-surface-2)",
                  border: "1px solid var(--cs-border)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--cs-primary-muted)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--cs-surface-2)")
                }
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--cs-text)" }}>
                    {p.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--cs-text-muted)" }}>
                    {p.gaps} gap{p.gaps !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={p.severity} />
                  <ArrowRight size={13} style={{ color: "var(--cs-text-muted)" }} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
