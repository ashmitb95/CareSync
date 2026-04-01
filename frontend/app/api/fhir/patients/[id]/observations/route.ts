import { NextRequest } from "next/server";

const HAPI_BASE = "https://hapi.fhir.org/baseR4";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (id.startsWith("seed-")) {
    return Response.json(getSeedObservations(id));
  }

  try {
    const res = await fetch(
      `${HAPI_BASE}/Observation?patient=${id}&category=laboratory&_count=50&_sort=-date`,
      { headers: { Accept: "application/fhir+json" } }
    );
    if (!res.ok) throw new Error(`HAPI ${res.status}`);
    const bundle = await res.json();
    return Response.json((bundle.entry ?? []).map((e: { resource: unknown }) => e.resource));
  } catch {
    return Response.json(getSeedObservations(id));
  }
}

function getSeedObservations(patientId: string) {
  const map: Record<string, object[]> = {
    "seed-001": [
      makeObs("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", 8.2, "%", "H", "2025-11-15"),
      makeObs("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", 7.9, "%", "H", "2025-08-10"),
      makeObs("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", 8.5, "%", "H", "2025-05-03"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 1.8, "mg/dL", "H", "2025-11-15"),
      makeObs("33914-3", "Glomerular filtration rate/1.73 sq M", 42, "mL/min/1.73m2", "L", "2025-11-15"),
      makeObs("2345-7", "Glucose [Mass/volume] in Serum or Plasma", 168, "mg/dL", "H", "2025-11-15"),
      makeObsStr("85354-9", "Blood pressure panel", "130/84 mmHg", "N", "2026-01-20"),
    ],
    "seed-002": [
      makeObs("718-7", "Hemoglobin [Mass/volume] in Blood", 12.8, "g/dL", "N", "2025-10-20"),
      makeObs("777-3", "Platelets [#/volume] in Blood by Automated count", 245, "10*3/uL", "N", "2025-10-20"),
      makeObs("6690-2", "Leukocytes [#/volume] in Blood by Automated count", 5.8, "10*3/uL", "N", "2025-10-20"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 0.8, "mg/dL", "N", "2025-10-20"),
      makeObsStr("85354-9", "Blood pressure panel", "116/72 mmHg", "N", "2026-01-08"),
    ],
    "seed-003": [
      makeObs("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", 7.1, "%", "H", "2025-12-10"),
      makeObs("2093-3", "Cholesterol [Mass/volume] in Serum or Plasma", 156, "mg/dL", "N", "2025-12-10"),
      makeObs("13457-7", "Cholesterol in LDL [Mass/volume] in Serum by calculation", 72, "mg/dL", "N", "2025-12-10"),
      makeObs("2085-9", "Cholesterol in HDL [Mass/volume] in Serum or Plasma", 44, "mg/dL", "N", "2025-12-10"),
      makeObs("2571-8", "Triglycerides [Mass/volume] in Serum or Plasma", 142, "mg/dL", "N", "2025-12-10"),
      makeObsStr("85354-9", "Blood pressure panel", "128/80 mmHg", "N", "2026-01-15"),
    ],
    "seed-004": [
      makeObs("6301-6", "INR in Platelet poor plasma by Coagulation assay", 2.3, "INR", "N", "2026-01-22"),
      makeObs("3016-3", "Thyrotropin [Units/volume] in Serum or Plasma", 2.8, "mIU/L", "N", "2026-01-22"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 1.0, "mg/dL", "N", "2026-01-22"),
      makeObs("2823-3", "Potassium [Moles/volume] in Serum or Plasma", 4.1, "mEq/L", "N", "2026-01-22"),
      makeObsStr("85354-9", "Blood pressure panel", "138/86 mmHg", "H", "2026-01-22"),
    ],
    "seed-005": [
      makeObs("19926-5", "FEV1/FVC [Volume Fraction] Respiratory system by Spirometry", 0.82, "ratio", "N", "2025-09-15"),
      makeObs("20150-9", "FEV1 [Volume] Respiratory system by Spirometry", 3.2, "L", "N", "2025-09-15"),
      makeObs("6690-2", "Leukocytes [#/volume] in Blood by Automated count", 7.2, "10*3/uL", "N", "2025-09-15"),
      makeObs("718-7", "Hemoglobin [Mass/volume] in Blood", 13.8, "g/dL", "N", "2025-09-15"),
      makeObsStr("85354-9", "Blood pressure panel", "112/70 mmHg", "N", "2025-09-15"),
    ],
    "seed-006": [
      makeObs("24467-3", "CD4 cells [#/volume] in Blood", 620, "cells/uL", "N", "2026-01-10"),
      makeObs("24467-3", "CD4 cells [#/volume] in Blood", 588, "cells/uL", "N", "2025-07-10"),
      makeObsStr("20447-9", "HIV-1 RNA [Units/volume] in Serum or Plasma", "Undetectable (<20 copies/mL)", "N", "2026-01-10"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 0.9, "mg/dL", "N", "2026-01-10"),
      makeObsStr("85354-9", "Blood pressure panel", "132/82 mmHg", "H", "2026-01-10"),
    ],
    "seed-007": [
      makeObs("1988-5", "C reactive protein [Mass/volume] in Serum or Plasma", 28.4, "mg/L", "H", "2025-12-05"),
      makeObs("4537-7", "Erythrocyte sedimentation rate by Westergren method", 62, "mm/h", "H", "2025-12-05"),
      makeObs("26828-3", "Anti-cyclic citrullinated peptide IgG Ab [Units/volume] in Serum", 142, "U/mL", "H", "2025-12-05"),
      makeObs("718-7", "Hemoglobin [Mass/volume] in Blood", 10.8, "g/dL", "L", "2025-12-05"),
      makeObs("6690-2", "Leukocytes [#/volume] in Blood by Automated count", 8.1, "10*3/uL", "N", "2025-12-05"),
      makeObsStr("85354-9", "Blood pressure panel", "118/74 mmHg", "N", "2025-12-05"),
    ],
    "seed-008": [
      makeObs("42637-9", "NT-proBNP [Mass/volume] in Serum or Plasma", 1840, "pg/mL", "H", "2025-11-20"),
      makeObs("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", 7.8, "%", "H", "2025-11-20"),
      makeObs("19926-5", "FEV1/FVC [Volume Fraction] Respiratory system by Spirometry", 0.58, "ratio", "L", "2025-11-20"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 1.3, "mg/dL", "H", "2025-11-20"),
      makeObs("2823-3", "Potassium [Moles/volume] in Serum or Plasma", 4.8, "mEq/L", "N", "2025-11-20"),
      makeObsStr("85354-9", "Blood pressure panel", "142/90 mmHg", "H", "2025-11-20"),
    ],
    "seed-009": [
      makeObs("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", 6.8, "%", "N", "2026-01-05"),
      makeObs("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", 7.2, "%", "H", "2025-10-05"),
      makeObs("2345-7", "Glucose [Mass/volume] in Serum or Plasma", 112, "mg/dL", "N", "2026-01-05"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 0.7, "mg/dL", "N", "2026-01-05"),
      makeObs("33914-3", "Glomerular filtration rate/1.73 sq M", 98, "mL/min/1.73m2", "N", "2026-01-05"),
      makeObsStr("85354-9", "Blood pressure panel", "122/76 mmHg", "N", "2026-01-05"),
    ],
    "seed-010": [
      makeObs("2093-3", "Cholesterol [Mass/volume] in Serum or Plasma", 172, "mg/dL", "N", "2025-10-12"),
      makeObs("13457-7", "Cholesterol in LDL [Mass/volume] in Serum by calculation", 88, "mg/dL", "N", "2025-10-12"),
      makeObs("2085-9", "Cholesterol in HDL [Mass/volume] in Serum or Plasma", 52, "mg/dL", "N", "2025-10-12"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 0.9, "mg/dL", "N", "2025-10-12"),
      makeObsStr("85354-9", "Blood pressure panel", "136/84 mmHg", "H", "2026-01-18"),
    ],
    "seed-011": [
      makeObs("24676-9", "Lithium [Moles/volume] in Serum or Plasma", 0.8, "mmol/L", "N", "2025-12-15"),
      makeObs("3016-3", "Thyrotropin [Units/volume] in Serum or Plasma", 3.5, "mIU/L", "N", "2025-12-15"),
      makeObs("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", 6.4, "%", "N", "2025-12-15"),
      makeObs("29463-7", "Body weight", 118, "kg", "H", "2025-12-15"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 1.0, "mg/dL", "N", "2025-12-15"),
      makeObsStr("85354-9", "Blood pressure panel", "126/80 mmHg", "N", "2025-12-15"),
    ],
    "seed-012": [
      makeObs("5048-4", "Anti-dsDNA Ab [Units/volume] in Serum by Immunoassay", 1280, "IU/mL", "H", "2025-11-30"),
      makeObs("4420-8", "Complement C3 [Mass/volume] in Serum or Plasma", 58, "mg/dL", "L", "2025-11-30"),
      makeObs("4407-5", "Complement C4 [Mass/volume] in Serum or Plasma", 8, "mg/dL", "L", "2025-11-30"),
      makeObs("718-7", "Hemoglobin [Mass/volume] in Blood", 9.8, "g/dL", "L", "2025-11-30"),
      makeObs("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", 1.4, "mg/dL", "H", "2025-11-30"),
      makeObs("5804-0", "Protein [Mass/volume] in Urine by Test strip", 2.1, "g/L", "H", "2025-11-30"),
      makeObsStr("85354-9", "Blood pressure panel", "148/94 mmHg", "H", "2026-01-12"),
    ],
  };
  return map[patientId] ?? [];
}

function makeObs(
  code: string,
  display: string,
  value: number,
  unit: string,
  interpretation: string,
  date: string
) {
  return {
    resourceType: "Observation",
    id: `obs-${code}-${date.replace(/-/g, "")}`,
    status: "final",
    category: [{ coding: [{ code: "laboratory" }] }],
    code: { coding: [{ system: "http://loinc.org", code, display }], text: display },
    valueQuantity: { value, unit },
    interpretation: [{ coding: [{ code: interpretation }] }],
    effectiveDateTime: date,
    issued: date,
  };
}

function makeObsStr(
  code: string,
  display: string,
  valueStr: string,
  interpretation: string,
  date: string
) {
  return {
    resourceType: "Observation",
    id: `obs-${code}-${date.replace(/-/g, "")}`,
    status: "final",
    category: [{ coding: [{ code: "vital-signs" }] }],
    code: { coding: [{ system: "http://loinc.org", code, display }], text: display },
    valueString: valueStr,
    interpretation: [{ coding: [{ code: interpretation }] }],
    effectiveDateTime: date,
    issued: date,
  };
}
