/**
 * FHIR R4 display utilities
 * Converts FHIR resource structures into human-readable strings.
 */

// --- Patient ---

function fixEncoding(str: string): string {
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

export function fhirPatientName(patient: FHIRPatient): string {
  const name = patient.name?.[0];
  if (!name) return patient.id ?? "Unknown";
  if (name.text) return fixEncoding(name.text);
  const given = name.given?.map(fixEncoding).join(" ") ?? "";
  const family = fixEncoding(name.family ?? "");
  return [given, family].filter(Boolean).join(" ") || "Unknown";
}

export function fhirPatientInitials(patient: FHIRPatient): string {
  const name = patient.name?.[0];
  const given = name?.given?.[0]?.[0] ?? "";
  const family = name?.family?.[0] ?? "";
  return (given + family).toUpperCase() || "?";
}

export function fhirGender(gender: string | undefined): string {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

// --- Condition ---

export function fhirConditionName(condition: FHIRCondition): string {
  return (
    condition.code?.text ??
    condition.code?.coding?.[0]?.display ??
    "Unknown Condition"
  );
}

export function fhirConditionCode(condition: FHIRCondition): string {
  return (
    condition.code?.coding?.[0]?.code ??
    condition.code?.coding?.[0]?.system?.split("/").pop() ??
    "—"
  );
}

export function fhirClinicalStatus(condition: FHIRCondition): string {
  return condition.clinicalStatus?.coding?.[0]?.code ?? "—";
}

// --- Observation (Labs / Vitals) ---

export function fhirObservationName(obs: FHIRObservation): string {
  return obs.code?.text ?? obs.code?.coding?.[0]?.display ?? "Unknown";
}

export function fhirObservationValue(obs: FHIRObservation): string {
  if (obs.valueQuantity) {
    const { value, unit } = obs.valueQuantity;
    return `${value ?? "?"} ${unit ?? ""}`.trim();
  }
  if (obs.valueString) return obs.valueString;
  if (obs.valueCodeableConcept) {
    return (
      obs.valueCodeableConcept.text ??
      obs.valueCodeableConcept.coding?.[0]?.display ??
      "—"
    );
  }
  return "—";
}

export function fhirObservationInterpretation(obs: FHIRObservation): "normal" | "abnormal" | "critical" | "unknown" {
  const code = obs.interpretation?.[0]?.coding?.[0]?.code?.toUpperCase();
  if (!code) return "unknown";
  if (code === "N" || code === "NORM") return "normal";
  if (code === "H" || code === "L" || code === "A") return "abnormal";
  if (code === "HH" || code === "LL" || code === "AA") return "critical";
  return "unknown";
}

// --- Medication ---

export function fhirMedicationName(med: FHIRMedicationRequest): string {
  return (
    med.medicationCodeableConcept?.text ??
    med.medicationCodeableConcept?.coding?.[0]?.display ??
    med.medicationReference?.display ??
    "Unknown Medication"
  );
}

export function fhirDosageText(med: FHIRMedicationRequest): string {
  const dosage = med.dosageInstruction?.[0];
  if (!dosage) return "—";
  if (dosage.text) return dosage.text;
  const qty = dosage.doseAndRate?.[0]?.doseQuantity;
  if (qty) return `${qty.value ?? ""} ${qty.unit ?? ""}`.trim();
  return "—";
}

// --- Encounter ---

export function fhirEncounterType(encounter: FHIREncounter): string {
  return (
    encounter.type?.[0]?.text ??
    encounter.type?.[0]?.coding?.[0]?.display ??
    encounter.class?.display ??
    encounter.class?.code ??
    "Encounter"
  );
}

export function fhirEncounterDate(encounter: FHIREncounter): string {
  return encounter.period?.start ?? encounter.period?.end ?? "";
}

// --- AllergyIntolerance ---

export function fhirAllergyName(allergy: FHIRAllergy): string {
  return (
    allergy.code?.text ??
    allergy.code?.coding?.[0]?.display ??
    "Unknown Allergen"
  );
}

// --- FHIR Type Definitions ---

export interface FHIRPatient {
  resourceType: "Patient";
  id?: string;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    text?: string;
  }>;
  gender?: string;
  birthDate?: string;
  address?: Array<{
    city?: string;
    state?: string;
    postalCode?: string;
    line?: string[];
  }>;
  telecom?: Array<{ system?: string; value?: string; use?: string }>;
  identifier?: Array<{ system?: string; value?: string }>;
  communication?: Array<{ language?: { text?: string } }>;
  extension?: Array<{ url?: string; valueCode?: string; valueString?: string }>;
}

export interface FHIRCondition {
  resourceType: "Condition";
  id?: string;
  code?: {
    text?: string;
    coding?: Array<{ system?: string; code?: string; display?: string }>;
  };
  clinicalStatus?: {
    coding?: Array<{ code?: string }>;
  };
  verificationStatus?: {
    coding?: Array<{ code?: string }>;
  };
  onsetDateTime?: string;
  recordedDate?: string;
  subject?: { reference?: string };
}

export interface FHIRObservation {
  resourceType: "Observation";
  id?: string;
  code?: {
    text?: string;
    coding?: Array<{ system?: string; code?: string; display?: string }>;
  };
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string };
  valueString?: string;
  valueCodeableConcept?: {
    text?: string;
    coding?: Array<{ display?: string }>;
  };
  interpretation?: Array<{
    coding?: Array<{ code?: string }>;
  }>;
  referenceRange?: Array<{
    low?: { value?: number; unit?: string };
    high?: { value?: number; unit?: string };
    text?: string;
  }>;
  effectiveDateTime?: string;
  issued?: string;
  status?: string;
  category?: Array<{
    coding?: Array<{ code?: string }>;
  }>;
}

export interface FHIRMedicationRequest {
  resourceType: "MedicationRequest";
  id?: string;
  medicationCodeableConcept?: {
    text?: string;
    coding?: Array<{ display?: string; code?: string }>;
  };
  medicationReference?: { display?: string };
  status?: string;
  authoredOn?: string;
  dosageInstruction?: Array<{
    text?: string;
    doseAndRate?: Array<{
      doseQuantity?: { value?: number; unit?: string };
    }>;
  }>;
  requester?: { display?: string; reference?: string };
}

export interface FHIREncounter {
  resourceType: "Encounter";
  id?: string;
  status?: string;
  class?: { code?: string; display?: string };
  type?: Array<{
    text?: string;
    coding?: Array<{ display?: string; code?: string }>;
  }>;
  period?: { start?: string; end?: string };
  serviceProvider?: { display?: string };
  participant?: Array<{
    individual?: { display?: string };
  }>;
  reasonCode?: Array<{
    text?: string;
    coding?: Array<{ display?: string }>;
  }>;
}

export interface FHIRAllergy {
  resourceType: "AllergyIntolerance";
  id?: string;
  code?: {
    text?: string;
    coding?: Array<{ display?: string; code?: string }>;
  };
  clinicalStatus?: { coding?: Array<{ code?: string }> };
  criticality?: string;
  reaction?: Array<{
    manifestation?: Array<{ text?: string; coding?: Array<{ display?: string }> }>;
    severity?: string;
  }>;
  recordedDate?: string;
}

export interface FHIRBundle<T = unknown> {
  resourceType: "Bundle";
  type: string;
  total?: number;
  link?: Array<{ relation: string; url: string }>;
  entry?: Array<{ resource: T }>;
}
