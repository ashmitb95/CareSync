"use client";

import { useState, useCallback, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Users,
  ChevronRight,
  RefreshCw,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CareGapCount } from "@/components/CareGapBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/spinner";
import { fhirApi, type PatientListResponse } from "@/lib/api";
import {
  fhirPatientName,
  fhirPatientInitials,
  fhirGender,
  type FHIRPatient,
} from "@/lib/fhir-helpers";
import { formatDate, formatAge } from "@/lib/utils";

type SeedPatient = FHIRPatient & {
  _conditions?: string[];
  _careGaps?: number;
};

function PatientAvatar({ patient }: { patient: FHIRPatient }) {
  const initials = fhirPatientInitials(patient);
  const colors = [
    "var(--cs-primary)",
    "var(--cs-info)",
    "var(--cs-success)",
    "#7c3aed",
    "#db2777",
  ];
  const color = colors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length];

  return (
    <div
      className="flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-semibold shrink-0 select-none"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function ConditionBadges({ patient }: { patient: SeedPatient }) {
  const seed = patient as SeedPatient;
  if (seed._conditions?.length) {
    return (
      <div className="flex flex-wrap gap-1">
        {seed._conditions.slice(0, 3).map((c) => (
          <Badge key={c} variant="default" size="sm">{c}</Badge>
        ))}
        {seed._conditions.length > 3 && (
          <Badge variant="outline" size="sm">+{seed._conditions.length - 3}</Badge>
        )}
      </div>
    );
  }
  return <span style={{ color: "var(--cs-text-muted)", fontSize: "0.8125rem" }}>—</span>;
}

function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(0);
  const COUNT = 20;

  const debounce = useCallback((val: string) => {
    setSearch(val);
    const t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<PatientListResponse>({
    queryKey: ["patients", debouncedSearch, page],
    queryFn: () =>
      fhirApi.listPatients({
        _count: String(COUNT),
        ...(debouncedSearch ? { name: debouncedSearch } : {}),
        _getpagesoffset: String(page * COUNT),
      }),
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        title="Patient Roster"
        subtitle={total ? `${total.toLocaleString()} patients` : undefined}
        actions={
          <button
            className="cs-btn-secondary flex items-center gap-1.5 text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-4 overflow-auto">
        {/* Search + filter bar */}
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--cs-text-muted)" }}
              />
              <input
                className="cs-input pl-9"
                placeholder="Search by name, ID, or condition…"
                value={search}
                onChange={(e) => debounce(e.target.value)}
              />
            </div>
            <button className="cs-btn-secondary flex items-center gap-1.5 text-xs">
              <Filter size={12} />
              Filters
            </button>
            {(data as PatientListResponse & { _source?: string })?._source === "seed" && (
              <Badge variant="warning" size="sm">Using seed data — HAPI FHIR unreachable</Badge>
            )}
          </div>
        </Card>

        {/* Patient table */}
        <Card padding="none">
          {/* Table header */}
          <div
            className="grid gap-4 px-5 py-3 border-b text-xs font-semibold uppercase tracking-wide"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 2fr 80px",
              borderColor: "var(--cs-border)",
              color: "var(--cs-text-muted)",
              backgroundColor: "var(--cs-surface-2)",
            }}
          >
            <div className="flex items-center gap-1 cursor-pointer hover:opacity-70">
              Patient <ArrowUpDown size={10} />
            </div>
            <div>DOB / Age</div>
            <div>Gender</div>
            <div>Active Conditions</div>
            <div className="text-center">Gaps</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="p-6"><LoadingState message="Loading patients from HAPI FHIR…" /></div>
          ) : isError ? (
            <ErrorState message="Failed to load patients" onRetry={() => refetch()} />
          ) : patients.length === 0 ? (
            <EmptyState
              icon={<Users size={20} style={{ color: "var(--cs-text-muted)" }} />}
              title="No patients found"
              description={debouncedSearch ? `No results for "${debouncedSearch}"` : "No patients available"}
            />
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--cs-border)" }}>
              {patients.map((patient: SeedPatient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="grid gap-4 px-5 py-3.5 transition-colors group cursor-pointer"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 2fr 80px",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--cs-surface-2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {/* Patient name + avatar */}
                  <div className="flex items-center gap-3 min-w-0">
                    <PatientAvatar patient={patient} />
                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--cs-text)" }}
                      >
                        {fhirPatientName(patient)}
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--cs-text-muted)" }}>
                        ID: {patient.id}
                      </div>
                    </div>
                  </div>

                  {/* DOB / Age */}
                  <div className="flex flex-col justify-center">
                    <div className="text-sm" style={{ color: "var(--cs-text)" }}>
                      {formatDate(patient.birthDate)}
                    </div>
                    <div className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
                      {patient.birthDate ? `${formatAge(patient.birthDate)} yrs` : "—"}
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="flex items-center">
                    <span className="text-sm" style={{ color: "var(--cs-text)" }}>
                      {fhirGender(patient.gender)}
                    </span>
                  </div>

                  {/* Conditions */}
                  <div className="flex items-center">
                    <ConditionBadges patient={patient} />
                  </div>

                  {/* Care gaps */}
                  <div className="flex items-center justify-center gap-2">
                    {(patient as SeedPatient)._careGaps != null ? (
                      <CareGapCount count={(patient as SeedPatient)._careGaps ?? 0} />
                    ) : (
                      <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>—</span>
                    )}
                    <ChevronRight
                      size={14}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--cs-text-muted)" }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > COUNT && (
            <div
              className="flex items-center justify-between px-5 py-3 border-t"
              style={{ borderColor: "var(--cs-border)", backgroundColor: "var(--cs-surface-2)" }}
            >
              <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
                Showing {page * COUNT + 1}–{Math.min((page + 1) * COUNT, total)} of {total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  className="cs-btn-secondary text-xs py-1.5"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="cs-btn-secondary text-xs py-1.5"
                  disabled={(page + 1) * COUNT >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* FHIR data source note */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
            Live data from HAPI FHIR R4 · hapi.fhir.org/baseR4 · Seed fallback enabled
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PatientsPageWrapper() {
  return (
    <Suspense fallback={null}>
      <PatientsPage />
    </Suspense>
  );
}
