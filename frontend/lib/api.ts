/**
 * CareSync API Client
 * All requests go through Next.js API routes, which proxy to
 * HAPI FHIR, Claude API, etc. — keeping keys server-side.
 */

import type {
  FHIRPatient,
  FHIRCondition,
  FHIRObservation,
  FHIRMedicationRequest,
  FHIREncounter,
  FHIRAllergy,
} from "./fhir-helpers";

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const search = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`/api${url}${search}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// --- FHIR: Patients ---

export interface PatientListResponse {
  patients: FHIRPatient[];
  total: number;
  nextUrl?: string;
}

export const fhirApi = {
  listPatients: (params?: { _count?: string; name?: string; _getpagesoffset?: string }) =>
    get<PatientListResponse>("/fhir/patients", params as Record<string, string>),

  getPatient: (id: string) =>
    get<FHIRPatient>(`/fhir/patients/${id}`),

  getConditions: (id: string) =>
    get<FHIRCondition[]>(`/fhir/patients/${id}/conditions`),

  getObservations: (id: string) =>
    get<FHIRObservation[]>(`/fhir/patients/${id}/observations`),

  getMedications: (id: string) =>
    get<FHIRMedicationRequest[]>(`/fhir/patients/${id}/medications`),

  getEncounters: (id: string) =>
    get<FHIREncounter[]>(`/fhir/patients/${id}/encounters`),

  getAllergies: (id: string) =>
    get<FHIRAllergy[]>(`/fhir/patients/${id}/allergies`),

  getTimeline: (id: string) =>
    get<TimelineEvent[]>(`/fhir/patients/${id}/timeline`),
};

export interface TimelineEvent {
  id: string;
  date: string;
  type: "encounter" | "lab" | "medication" | "condition";
  title: string;
  subtitle?: string;
  detail?: string;
  resource: unknown;
}

// --- HL7 ---

export interface HL7SampleMessage {
  type: string;
  label: string;
  description: string;
  raw: string;
}

export interface HL7ParseResult {
  messageType: string;
  timestamp: string;
  summary: string;
  segments: Record<string, Record<string, string>>;
  segmentList: string[];
}

export interface HL7TransformResult {
  parsed: HL7ParseResult;
  fhirBundle: object;
  explanation?: string;
}

export const hl7Api = {
  getSamples: () => get<HL7SampleMessage[]>("/hl7/samples"),
  parse: (raw: string) => post<HL7ParseResult>("/hl7/parse", { raw }),
  transform: (raw: string) => post<HL7TransformResult>("/hl7/transform", { raw }),
  explain: (raw: string) => post<{ explanation: string }>("/hl7/explain", { raw }),
};

// --- Executive Summary ---

export interface ExecutiveSummary {
  activeConditions: Array<{ name: string; onset: string }>;
  medications: Array<{ name: string; dosage: string }>;
  abnormalLabs: Array<{ name: string; value: string; flag: string; date: string }>;
  allergies: Array<{ substance: string; criticality: string; reaction: string }>;
  lastEncounter: { type: string; provider: string; date: string } | null;
  careGapCount: number;
  careGapHighCount: number;
  alerts: string[];
}

// --- AI ---

export const aiApi = {
  getExecutiveSummary: (patientId: string) =>
    post<ExecutiveSummary>(`/ai/summarize/${patientId}`, {}),

  drugInteractions: (patientId: string) =>
    post<{ interactions: DrugInteraction[] }>(
      `/ai/drug-interactions/${patientId}`,
      {}
    ),
};

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "minor" | "moderate" | "major";
  description: string;
}

// --- Care Gaps ---

export interface CareGap {
  id: string;
  gapType: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high";
  daysOverdue?: number;
  triggeringCondition?: string;
  conditionCode?: string;
}

export interface PopulationCareGaps {
  totalPatients: number;
  totalGaps: number;
  gapsByType: Array<{ type: string; count: number }>;
  gapsBySeverity: { low: number; medium: number; high: number };
  patientsWithMostGaps: Array<{
    patientId: string;
    patientName: string;
    gapCount: number;
    gaps: CareGap[];
  }>;
}

export const careGapsApi = {
  getPatientGaps: (patientId: string) =>
    get<CareGap[]>(`/care-gaps/${patientId}`),

  getPopulationGaps: () =>
    get<PopulationCareGaps>("/care-gaps/population"),
};
