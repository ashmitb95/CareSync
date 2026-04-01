"use client";

import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Heart,
  Pill,
  FlaskConical,
  AlertTriangle,
  Shield,
  Calendar,
  MapPin,
  User,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, Divider } from "@/components/ui/card";
import { Badge, SeverityBadge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/spinner";
import { PatientTimeline } from "@/components/PatientTimeline";
import { ClinicalSummaryCard } from "@/components/ClinicalSummaryCard";
import { CareGapCard } from "@/components/CareGapBadge";
import { FHIRJsonViewer } from "@/components/FHIRJsonViewer";
import { fhirApi, careGapsApi, aiApi, type DrugInteraction } from "@/lib/api";
import {
  fhirPatientName,
  fhirPatientInitials,
  fhirGender,
  fhirConditionName,
  fhirConditionCode,
  fhirClinicalStatus,
  fhirObservationName,
  fhirObservationValue,
  fhirObservationInterpretation,
  fhirMedicationName,
  fhirDosageText,
  fhirEncounterType,
  fhirEncounterDate,
  fhirAllergyName,
  type FHIRCondition,
  type FHIRObservation,
  type FHIRMedicationRequest,
  type FHIREncounter,
  type FHIRAllergy,
} from "@/lib/fhir-helpers";
import { formatDate, formatAge, formatRelativeDate } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";

type Tab = "timeline" | "conditions" | "medications" | "labs" | "care-gaps";

const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: "timeline",    label: "Timeline",    icon: Activity },
  { id: "conditions",  label: "Conditions",  icon: Heart },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "labs",        label: "Labs",        icon: FlaskConical },
  { id: "care-gaps",   label: "Care Gaps",   icon: AlertTriangle },
];

function PatientHeader({ patientId }: { patientId: string }) {
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => fhirApi.getPatient(patientId),
  });

  if (isLoading) return <LoadingState message="Loading patient…" />;
  if (!patient) return null;

  const initials = fhirPatientInitials(patient);

  return (
    <Card>
      <div className="flex items-start gap-5">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-xl text-white text-xl font-bold shrink-0"
          style={{ backgroundColor: "var(--cs-primary)" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold" style={{ color: "var(--cs-text)" }}>
                {fhirPatientName(patient)}
              </h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm" style={{ color: "var(--cs-text-secondary)" }}>
                  ID: {patient.id}
                </span>
                <Badge variant="default">{fhirGender(patient.gender)}</Badge>
                {patient.birthDate && (
                  <Badge variant="default">
                    {formatAge(patient.birthDate)} yrs · {formatDate(patient.birthDate)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-3">
            {patient.address?.[0] && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cs-text-muted)" }}>
                <MapPin size={12} />
                {[patient.address[0].city, patient.address[0].state].filter(Boolean).join(", ")}
              </div>
            )}
            {patient.telecom?.find((t) => t.system === "phone") && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cs-text-muted)" }}>
                <User size={12} />
                {patient.telecom.find((t) => t.system === "phone")?.value}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ConditionsTab({ patientId }: { patientId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["conditions", patientId],
    queryFn: () => fhirApi.getConditions(patientId),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;

  const conditions = data ?? [];
  const active = conditions.filter((c) => fhirClinicalStatus(c) === "active");
  const inactive = conditions.filter((c) => fhirClinicalStatus(c) !== "active");

  return (
    <div className="space-y-3">
      {conditions.length === 0 && (
        <EmptyState icon={<Heart size={20} style={{ color: "var(--cs-text-muted)" }} />} title="No conditions on record" />
      )}
      {active.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--cs-text-muted)" }}>
            Active ({active.length})
          </div>
          <Card padding="none">
            <div className="divide-y" style={{ borderColor: "var(--cs-border)" }}>
              {active.map((c: FHIRCondition) => (
                <div key={c.id}>
                  <div
                    className="flex items-center justify-between gap-3 px-5 py-3.5 cursor-pointer hover:bg-cs-surface-2 transition-colors"
                    onClick={() => setExpandedId(expandedId === c.id ? null : (c.id ?? null))}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--cs-text)" }}>
                        {fhirConditionName(c)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
                          SNOMED: {fhirConditionCode(c)}
                        </span>
                        {c.onsetDateTime && (
                          <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
                            · Onset {formatDate(c.onsetDateTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                  {expandedId === c.id && (
                    <div className="px-5 pb-4">
                      <FHIRJsonViewer data={c} title="Condition Resource" maxDepth={4} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {inactive.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--cs-text-muted)" }}>
            Resolved / Inactive ({inactive.length})
          </div>
          <Card padding="none">
            <div className="divide-y" style={{ borderColor: "var(--cs-border)" }}>
              {inactive.map((c: FHIRCondition) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <p className="text-sm" style={{ color: "var(--cs-text-secondary)" }}>
                    {fhirConditionName(c)}
                  </p>
                  <Badge variant="default" size="sm">{fhirClinicalStatus(c)}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function MedicationsTab({ patientId }: { patientId: string }) {
  const { data: meds, isLoading } = useQuery({
    queryKey: ["medications", patientId],
    queryFn: () => fhirApi.getMedications(patientId),
  });
  const { mutate, data: interactions, isPending, isError: intError } = useMutation({
    mutationFn: () => aiApi.drugInteractions(patientId),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {(meds?.length ?? 0) > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => mutate()}
            disabled={isPending}
            className="cs-btn-secondary flex items-center gap-1.5 text-sm"
          >
            {isPending ? <Spinner size="sm" /> : null}
            Check Drug Interactions
          </button>
        </div>
      )}

      {(interactions?.interactions?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cs-text-muted)" }}>
            Interactions Detected ({interactions?.interactions?.length ?? 0})
          </div>
          {interactions?.interactions?.map((ix: DrugInteraction, i: number) => (
            <div
              key={i}
              className="cs-card p-4"
              style={{
                borderLeft: `3px solid ${ix.severity === "major" ? "var(--cs-danger)" : ix.severity === "moderate" ? "var(--cs-warning)" : "var(--cs-info)"}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--cs-text)" }}>
                    {ix.drug1} + {ix.drug2}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--cs-text-secondary)" }}>
                    {ix.description}
                  </p>
                </div>
                <SeverityBadge severity={ix.severity === "major" ? "high" : ix.severity === "moderate" ? "medium" : "low"} />
              </div>
            </div>
          ))}
        </div>
      )}

      {intError && (
        <div className="text-sm" style={{ color: "var(--cs-danger)" }}>Failed to check interactions.</div>
      )}

      <Card padding="none">
        {!meds?.length ? (
          <EmptyState
            icon={<Pill size={20} style={{ color: "var(--cs-text-muted)" }} />}
            title="No active medications"
          />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--cs-border)" }}>
            {meds.map((m: FHIRMedicationRequest) => (
              <div key={m.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--cs-text)" }}>
                    {fhirMedicationName(m)}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: "var(--cs-text-secondary)" }}>
                      {fhirDosageText(m)}
                    </span>
                    {m.requester?.display && (
                      <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
                        Rx: {m.requester.display}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="success" size="sm">Active</Badge>
                  {m.authoredOn && (
                    <p className="text-xs mt-1" style={{ color: "var(--cs-text-muted)" }}>
                      Since {formatDate(m.authoredOn)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function LabsTab({ patientId }: { patientId: string }) {
  const { data: obs, isLoading } = useQuery({
    queryKey: ["observations", patientId],
    queryFn: () => fhirApi.getObservations(patientId),
  });

  if (isLoading) return <LoadingState />;

  const labs = obs ?? [];
  const interpretationStyle = (interp: ReturnType<typeof fhirObservationInterpretation>) =>
    interp === "abnormal" || interp === "critical"
      ? { color: "var(--cs-danger)", fontWeight: 600 }
      : { color: "var(--cs-text)" };

  return (
    <Card padding="none">
      {!labs.length ? (
        <EmptyState
          icon={<FlaskConical size={20} style={{ color: "var(--cs-text-muted)" }} />}
          title="No lab results"
        />
      ) : (
        <>
          <div
            className="grid gap-4 px-5 py-3 border-b text-xs font-semibold uppercase tracking-wide"
            style={{
              gridTemplateColumns: "2fr 1.5fr 1fr 1fr",
              borderColor: "var(--cs-border)",
              color: "var(--cs-text-muted)",
              backgroundColor: "var(--cs-surface-2)",
            }}
          >
            <div>Test</div>
            <div>Value</div>
            <div>Interpretation</div>
            <div>Date</div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--cs-border)" }}>
            {labs.map((o: FHIRObservation) => {
              const interp = fhirObservationInterpretation(o);
              const interpCode = o.interpretation?.[0]?.coding?.[0]?.code;
              return (
                <div
                  key={o.id}
                  className="grid gap-4 px-5 py-3.5 items-center"
                  style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--cs-text)" }}>
                      {fhirObservationName(o)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
                      {o.code?.coding?.[0]?.code}
                    </p>
                  </div>
                  <div className="text-sm font-medium" style={interpretationStyle(interp)}>
                    {fhirObservationValue(o)}
                  </div>
                  <div>
                    {interpCode ? (
                      <Badge
                        variant={
                          interpCode === "H" || interpCode === "L" ? "danger"
                          : interpCode === "N" ? "success"
                          : "warning"
                        }
                        size="sm"
                      >
                        {interpCode === "H" ? "High" : interpCode === "L" ? "Low" : interpCode === "N" ? "Normal" : interpCode}
                      </Badge>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>—</span>
                    )}
                  </div>
                  <div className="text-sm" style={{ color: "var(--cs-text-secondary)" }}>
                    {formatDate(o.effectiveDateTime ?? o.issued)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

function CareGapsTab({ patientId }: { patientId: string }) {
  const { data: gaps, isLoading, refetch } = useQuery({
    queryKey: ["care-gaps", patientId],
    queryFn: () => careGapsApi.getPatientGaps(patientId),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--cs-text-secondary)" }}>
          {gaps?.length ?? 0} gap{(gaps?.length ?? 0) !== 1 ? "s" : ""} identified
        </p>
        <button className="cs-btn-secondary text-xs" onClick={() => refetch()}>
          Re-evaluate
        </button>
      </div>
      {!gaps?.length ? (
        <EmptyState
          icon={<Shield size={20} style={{ color: "var(--cs-success)" }} />}
          title="No care gaps"
          description="This patient has no outstanding care gaps at this time."
        />
      ) : (
        gaps.map((gap) => <CareGapCard key={gap.id} gap={gap} />)
      )}
    </div>
  );
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("timeline");
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        title="Patient Detail"
        subtitle="FHIR R4 record"
        actions={
          <button className="cs-btn-secondary text-xs" onClick={() => router.back()}>
            <ArrowLeft size={12} />
            Back
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-4 overflow-auto">
        {/* Patient header card */}
        <PatientHeader patientId={id} />

        {/* Executive summary */}
        <ClinicalSummaryCard patientId={id} />

        {/* Tab navigation */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ backgroundColor: "var(--cs-surface-2)", border: "1px solid var(--cs-border)" }}
        >
          {TABS.map(({ id: tabId, label, icon: Icon }) => {
            const isActive = tab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center"
                style={{
                  backgroundColor: isActive ? "var(--cs-surface)" : "transparent",
                  color: isActive ? "var(--cs-text)" : "var(--cs-text-muted)",
                  boxShadow: isActive ? "var(--cs-shadow-xs)" : "none",
                  border: isActive ? "1px solid var(--cs-border)" : "1px solid transparent",
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {tab === "timeline"    && <PatientTimeline patientId={id} />}
          {tab === "conditions"  && <ConditionsTab patientId={id} />}
          {tab === "medications" && <MedicationsTab patientId={id} />}
          {tab === "labs"        && <LabsTab patientId={id} />}
          {tab === "care-gaps"   && <CareGapsTab patientId={id} />}
        </div>
      </div>
    </div>
  );
}
