import { NextRequest } from "next/server";

const HAPI_BASE = "https://hapi.fhir.org/baseR4";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (id.startsWith("seed-")) {
    return Response.json(getSeedConditions(id));
  }

  try {
    const res = await fetch(`${HAPI_BASE}/Condition?patient=${id}&_count=50`, {
      headers: { Accept: "application/fhir+json" },
    });
    if (!res.ok) throw new Error(`HAPI ${res.status}`);
    const bundle = await res.json();
    return Response.json((bundle.entry ?? []).map((e: { resource: unknown }) => e.resource));
  } catch {
    return Response.json(getSeedConditions(id));
  }
}

function getSeedConditions(patientId: string) {
  const map: Record<string, object[]> = {
    "seed-001": [
      makeCondition("44054006", "Type 2 diabetes mellitus", "active", "2015-03-10"),
      makeCondition("38341003", "Hypertensive disorder", "active", "2017-08-22"),
      makeCondition("709044004", "Chronic kidney disease stage 3", "active", "2020-01-15"),
    ],
    "seed-002": [
      makeCondition("254837009", "Malignant neoplasm of breast", "remission", "2018-05-14"),
      makeCondition("35489007", "Depressive disorder", "active", "2019-11-03"),
    ],
    "seed-003": [
      makeCondition("53741008", "Coronary arteriosclerosis", "active", "2018-04-05"),
      makeCondition("55822004", "Hyperlipidemia", "active", "2016-11-30"),
      makeCondition("44054006", "Type 2 diabetes mellitus", "active", "2019-02-14"),
    ],
    "seed-004": [
      makeCondition("64859006", "Osteoporosis", "active", "2016-03-22"),
      makeCondition("38341003", "Hypertensive disorder", "active", "2014-07-10"),
      makeCondition("49436004", "Atrial fibrillation", "active", "2020-09-05"),
      makeCondition("40930008", "Hypothyroidism", "active", "2012-06-18"),
    ],
    "seed-005": [
      makeCondition("195967001", "Asthma", "active", "2005-04-18"),
      makeCondition("197480006", "Anxiety disorder", "active", "2021-02-28"),
    ],
    "seed-006": [
      makeCondition("86406008", "Human immunodeficiency virus infection", "active", "2008-09-12"),
      makeCondition("38341003", "Hypertensive disorder", "active", "2015-03-20"),
    ],
    "seed-007": [
      makeCondition("69896004", "Rheumatoid arthritis", "active", "2014-01-08"),
      makeCondition("77386006", "Anemia", "active", "2022-04-15"),
    ],
    "seed-008": [
      makeCondition("13645005", "Chronic obstructive pulmonary disease", "active", "2012-06-15"),
      makeCondition("44054006", "Type 2 diabetes mellitus", "active", "2016-08-20"),
      makeCondition("38341003", "Hypertensive disorder", "active", "2014-11-05"),
      makeCondition("84114007", "Heart failure", "active", "2021-03-18"),
    ],
    "seed-009": [
      makeCondition("46635009", "Type 1 diabetes mellitus", "active", "2006-08-30"),
      makeCondition("73211009", "Diabetic retinopathy", "active", "2023-01-15"),
    ],
    "seed-010": [
      makeCondition("230690007", "Cerebrovascular accident", "resolved", "2019-11-22"),
      makeCondition("38341003", "Hypertensive disorder", "active", "2010-04-15"),
      makeCondition("55822004", "Hyperlipidemia", "active", "2012-09-08"),
      makeCondition("35489007", "Depressive disorder", "active", "2020-02-10"),
    ],
    "seed-011": [
      makeCondition("13746004", "Bipolar disorder", "active", "2003-07-14"),
      makeCondition("414916001", "Obesity", "active", "2010-01-25"),
      makeCondition("44054006", "Type 2 diabetes mellitus", "active", "2020-06-10"),
    ],
    "seed-012": [
      makeCondition("55464009", "Systemic lupus erythematosus", "active", "2011-09-30"),
      makeCondition("38341003", "Hypertensive disorder", "active", "2018-02-14"),
      makeCondition("36083008", "Lupus nephritis", "active", "2022-01-08"),
    ],
  };
  return map[patientId] ?? [];
}

function makeCondition(code: string, display: string, status: string, onset: string) {
  return {
    resourceType: "Condition",
    id: `cond-${code}-${onset.replace(/-/g, "")}`,
    code: { coding: [{ system: "http://snomed.info/sct", code, display }], text: display },
    clinicalStatus: { coding: [{ code: status }] },
    verificationStatus: { coding: [{ code: "confirmed" }] },
    onsetDateTime: onset,
    recordedDate: onset,
  };
}
