import { NextRequest } from "next/server";

const HAPI_BASE = "https://hapi.fhir.org/baseR4";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (id.startsWith("seed-")) {
    return Response.json(getSeedEncounters(id));
  }

  try {
    const res = await fetch(
      `${HAPI_BASE}/Encounter?patient=${id}&_count=20&_sort=-date`,
      { headers: { Accept: "application/fhir+json" } }
    );
    if (!res.ok) throw new Error(`HAPI ${res.status}`);
    const bundle = await res.json();
    return Response.json((bundle.entry ?? []).map((e: { resource: unknown }) => e.resource));
  } catch {
    return Response.json(getSeedEncounters(id));
  }
}

function getSeedEncounters(patientId: string) {
  const map: Record<string, object[]> = {
    "seed-001": [
      makeEnc("AMB", "Office Visit", "2026-01-20T09:30:00", "2026-01-20T10:15:00", "Columbus Nephrology Associates"),
      makeEnc("AMB", "Diabetes Follow-up", "2025-11-15T14:00:00", "2025-11-15T15:00:00", "Ohio State Primary Care"),
      makeEnc("IMP", "Acute Care Hospitalization", "2025-07-03T08:00:00", "2025-07-06T16:00:00", "Ohio State Medical Center"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-03-22T10:00:00", "2025-03-22T11:00:00", "Ohio State Primary Care"),
      makeEnc("AMB", "Nephrology Consultation", "2024-10-05T13:00:00", "2024-10-05T14:00:00", "Columbus Nephrology Associates"),
    ],
    "seed-002": [
      makeEnc("AMB", "Oncology Follow-up", "2026-01-08T10:00:00", "2026-01-08T10:45:00", "Emory Winship Cancer Institute"),
      makeEnc("AMB", "Primary Care Visit", "2025-10-20T09:00:00", "2025-10-20T09:50:00", "Piedmont Primary Care"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-04-15T10:00:00", "2025-04-15T11:00:00", "Piedmont Primary Care"),
      makeEnc("AMB", "Psychiatry Follow-up", "2025-09-05T14:00:00", "2025-09-05T14:45:00", "Emory Behavioral Health"),
    ],
    "seed-003": [
      makeEnc("AMB", "Cardiology Follow-up", "2026-01-15T11:00:00", "2026-01-15T11:50:00", "Texas Heart Institute"),
      makeEnc("AMB", "Diabetes Management", "2025-12-10T09:00:00", "2025-12-10T09:45:00", "Houston Methodist Primary Care"),
      makeEnc("IMP", "Chest Pain Evaluation", "2025-06-20T06:00:00", "2025-06-22T14:00:00", "Houston Methodist Hospital"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-02-18T10:00:00", "2025-02-18T11:00:00", "Houston Methodist Primary Care"),
    ],
    "seed-004": [
      makeEnc("AMB", "Cardiology Follow-up", "2026-01-22T10:00:00", "2026-01-22T11:00:00", "Banner Heart Hospital"),
      makeEnc("AMB", "Primary Care Visit", "2025-11-08T09:30:00", "2025-11-08T10:15:00", "Banner Primary Care"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-04-20T10:00:00", "2025-04-20T11:00:00", "Banner Primary Care"),
      makeEnc("IMP", "Atrial Fibrillation Episode", "2024-12-05T14:00:00", "2024-12-07T10:00:00", "Banner University Medical Center"),
    ],
    "seed-005": [
      makeEnc("AMB", "Pulmonology Visit", "2025-09-15T09:00:00", "2025-09-15T09:50:00", "Northwestern Medicine Pulmonology"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-05-10T10:00:00", "2025-05-10T11:00:00", "Rush University Primary Care"),
      makeEnc("AMB", "Psychiatry Follow-up", "2025-11-20T14:00:00", "2025-11-20T14:45:00", "Northwestern Medicine Behavioral Health"),
      makeEnc("AMB", "Urgent Care - Asthma Exacerbation", "2025-08-03T16:00:00", "2025-08-03T18:00:00", "Rush Urgent Care"),
    ],
    "seed-006": [
      makeEnc("AMB", "HIV/Infectious Disease Follow-up", "2026-01-10T10:00:00", "2026-01-10T10:50:00", "University of Maryland Infectious Disease"),
      makeEnc("AMB", "Primary Care Visit", "2025-07-15T09:00:00", "2025-07-15T09:45:00", "Baltimore City Health Center"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-03-08T10:00:00", "2025-03-08T11:00:00", "Baltimore City Health Center"),
    ],
    "seed-007": [
      makeEnc("AMB", "Rheumatology Follow-up", "2025-12-05T10:00:00", "2025-12-05T10:50:00", "UW Medicine Rheumatology"),
      makeEnc("AMB", "Primary Care Visit", "2025-09-22T09:00:00", "2025-09-22T09:45:00", "Swedish Medical Group"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-05-18T10:00:00", "2025-05-18T11:00:00", "Swedish Medical Group"),
      makeEnc("AMB", "Rheumatology Infusion - Tocilizumab", "2026-01-08T08:00:00", "2026-01-08T10:30:00", "UW Medicine Infusion Center"),
    ],
    "seed-008": [
      makeEnc("AMB", "Cardiology Follow-up", "2025-11-20T10:00:00", "2025-11-20T10:50:00", "Methodist Cardiology"),
      makeEnc("AMB", "Pulmonology Visit", "2025-10-08T09:00:00", "2025-10-08T09:50:00", "Methodist Pulmonology"),
      makeEnc("IMP", "COPD Exacerbation", "2025-04-12T08:00:00", "2025-04-16T14:00:00", "University Health System San Antonio"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-02-05T10:00:00", "2025-02-05T11:00:00", "University Health Primary Care"),
    ],
    "seed-009": [
      makeEnc("AMB", "Endocrinology Follow-up", "2026-01-05T10:00:00", "2026-01-05T10:45:00", "UCSF Diabetes Center"),
      makeEnc("AMB", "Ophthalmology - Diabetic Eye Exam", "2025-11-18T09:00:00", "2025-11-18T10:00:00", "UCSF Ophthalmology"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-06-20T10:00:00", "2025-06-20T11:00:00", "UCSF Primary Care"),
    ],
    "seed-010": [
      makeEnc("AMB", "Neurology Follow-up", "2026-01-18T10:00:00", "2026-01-18T10:50:00", "Henry Ford Neurology"),
      makeEnc("AMB", "Primary Care Visit", "2025-10-12T09:00:00", "2025-10-12T09:45:00", "Henry Ford Primary Care"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-04-02T10:00:00", "2025-04-02T11:00:00", "Henry Ford Primary Care"),
      makeEnc("AMB", "Psychiatry Follow-up", "2025-08-15T14:00:00", "2025-08-15T14:45:00", "Henry Ford Behavioral Health"),
    ],
    "seed-011": [
      makeEnc("AMB", "Psychiatry Follow-up", "2025-12-15T10:00:00", "2025-12-15T10:50:00", "Hennepin Healthcare Behavioral Health"),
      makeEnc("AMB", "Primary Care Visit", "2025-09-10T09:00:00", "2025-09-10T09:45:00", "HCMC Primary Care"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-04-25T10:00:00", "2025-04-25T11:00:00", "HCMC Primary Care"),
      makeEnc("IMP", "Psychiatric Hospitalization", "2024-11-03T12:00:00", "2024-11-08T10:00:00", "Hennepin Healthcare Inpatient Psychiatry"),
    ],
    "seed-012": [
      makeEnc("AMB", "Rheumatology Follow-up", "2025-11-30T10:00:00", "2025-11-30T10:50:00", "UCLA Rheumatology"),
      makeEnc("AMB", "Nephrology Consultation", "2025-09-15T09:00:00", "2025-09-15T09:50:00", "UCLA Nephrology"),
      makeEnc("AMB", "Annual Wellness Visit", "2025-03-12T10:00:00", "2025-03-12T11:00:00", "UCLA Primary Care"),
      makeEnc("AMB", "Belimumab Infusion", "2026-01-12T08:00:00", "2026-01-12T10:30:00", "UCLA Infusion Center"),
    ],
  };
  return map[patientId] ?? [];
}

let encCounter = 0;
function makeEnc(cls: string, type: string, start: string, end: string, provider: string) {
  return {
    resourceType: "Encounter",
    id: `enc-${++encCounter}-${start.slice(0, 10).replace(/-/g, "")}`,
    status: "finished",
    class: { code: cls, display: cls === "AMB" ? "Ambulatory" : cls === "IMP" ? "Inpatient" : cls },
    type: [{ text: type, coding: [{ display: type }] }],
    period: { start, end },
    serviceProvider: { display: provider },
  };
}
