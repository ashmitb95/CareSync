import { NextRequest } from "next/server";

const HAPI_BASE = "https://hapi.fhir.org/baseR4";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (id.startsWith("seed-")) {
    return Response.json(getSeedAllergies(id));
  }

  try {
    const res = await fetch(
      `${HAPI_BASE}/AllergyIntolerance?patient=${id}&_count=20`,
      { headers: { Accept: "application/fhir+json" } }
    );
    if (!res.ok) throw new Error(`HAPI ${res.status}`);
    const bundle = await res.json();
    return Response.json((bundle.entry ?? []).map((e: { resource: unknown }) => e.resource));
  } catch {
    return Response.json(getSeedAllergies(id));
  }
}

function getSeedAllergies(patientId: string) {
  const map: Record<string, object[]> = {
    "seed-001": [
      makeAllergy("372687004", "Penicillin", "high", "severe", "Anaphylaxis", "2010-05-01"),
      makeAllergy("387534000", "Sulfonamide", "low", "moderate", "Skin rash", "2018-03-15"),
    ],
    "seed-002": [
      makeAllergy("372687004", "Penicillin", "low", "moderate", "Hives", "2005-08-10"),
    ],
    "seed-003": [
      makeAllergy("387458008", "Aspirin", "unable-to-assess", "mild", "GI upset", "2015-06-20"),
      makeAllergy("372529008", "Codeine", "high", "severe", "Respiratory depression", "2008-11-05"),
    ],
    "seed-004": [
      makeAllergy("387207008", "Ibuprofen", "low", "moderate", "GI bleeding", "2016-02-28"),
      makeAllergy("764146007", "Latex", "high", "severe", "Anaphylaxis", "2000-01-01"),
    ],
    "seed-005": [
      makeAllergy("410942007", "Aspergillus fumigatus", "low", "moderate", "Asthma exacerbation", "2010-03-15"),
    ],
    "seed-006": [
      makeAllergy("372687004", "Penicillin", "high", "severe", "Anaphylaxis", "1995-04-10"),
      makeAllergy("387497003", "Abacavir", "high", "severe", "Hypersensitivity syndrome", "2012-08-20"),
    ],
    "seed-007": [
      makeAllergy("387458008", "Aspirin", "low", "moderate", "GI upset", "2015-07-10"),
    ],
    "seed-008": [
      makeAllergy("372687004", "Penicillin", "low", "mild", "Rash", "1985-01-01"),
      makeAllergy("387228000", "Morphine", "high", "severe", "Respiratory depression, nausea", "2021-04-25"),
    ],
    "seed-009": [
      makeAllergy("387458008", "Aspirin", "unable-to-assess", "mild", "Minor GI irritation", "2022-05-30"),
    ],
    "seed-010": [
      makeAllergy("372687004", "Penicillin", "low", "moderate", "Hives", "2000-06-15"),
      makeAllergy("387207008", "Ibuprofen", "low", "moderate", "Increases blood pressure", "2015-09-20"),
    ],
    "seed-011": [
      makeAllergy("387548001", "Olanzapine", "high", "severe", "Metabolic syndrome, severe weight gain", "2008-02-14"),
    ],
    "seed-012": [
      makeAllergy("387458008", "Sulfonamide", "high", "severe", "Stevens-Johnson syndrome", "2013-11-15"),
      makeAllergy("372687004", "Penicillin", "low", "moderate", "Rash", "2005-03-10"),
    ],
  };
  return map[patientId] ?? [];
}

function makeAllergy(code: string, substance: string, criticality: string, severity: string, reaction: string, date: string) {
  return {
    resourceType: "AllergyIntolerance",
    id: `allergy-${code}-${date.replace(/-/g, "")}`,
    clinicalStatus: { coding: [{ code: "active" }] },
    criticality,
    code: { coding: [{ system: "http://snomed.info/sct", code, display: substance }], text: substance },
    reaction: [{ manifestation: [{ text: reaction }], severity }],
    recordedDate: date,
  };
}
