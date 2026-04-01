import { NextRequest } from "next/server";

const HAPI_BASE = "https://hapi.fhir.org/baseR4";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (id.startsWith("seed-")) {
    return Response.json(getSeedMedications(id));
  }

  try {
    const res = await fetch(
      `${HAPI_BASE}/MedicationRequest?patient=${id}&status=active&_count=30`,
      { headers: { Accept: "application/fhir+json" } }
    );
    if (!res.ok) throw new Error(`HAPI ${res.status}`);
    const bundle = await res.json();
    return Response.json((bundle.entry ?? []).map((e: { resource: unknown }) => e.resource));
  } catch {
    return Response.json(getSeedMedications(id));
  }
}

function getSeedMedications(patientId: string) {
  const map: Record<string, object[]> = {
    "seed-001": [
      makeMed("314076", "Lisinopril 10 MG Oral Tablet", "10 mg daily", "2020-03-01", "Dr. Sarah Johnson, MD"),
      makeMed("860975", "Metformin 1000 MG Oral Tablet", "1000 mg twice daily", "2018-06-15", "Dr. Sarah Johnson, MD"),
      makeMed("860999", "Insulin glargine 100 UNT/ML Injectable Solution", "20 units at bedtime", "2021-09-10", "Dr. Sarah Johnson, MD"),
      makeMed("213374", "Atorvastatin 40 MG Oral Tablet", "40 mg at bedtime", "2020-03-01", "Dr. Sarah Johnson, MD"),
      makeMed("308964", "Amlodipine 5 MG Oral Tablet", "5 mg daily", "2022-01-15", "Dr. Sarah Johnson, MD"),
      makeMed("310798", "Aspirin 81 MG Oral Tablet", "81 mg daily", "2020-03-01", "Dr. Sarah Johnson, MD"),
    ],
    "seed-002": [
      makeMed("200064", "Tamoxifen 20 MG Oral Tablet", "20 mg daily", "2020-08-01", "Dr. Patricia Osei, MD"),
      makeMed("309309", "Sertraline 100 MG Oral Tablet", "100 mg daily", "2020-01-15", "Dr. Patricia Osei, MD"),
      makeMed("213407", "Calcium carbonate 500 MG Oral Tablet", "500 mg twice daily", "2020-08-01", "Dr. Patricia Osei, MD"),
      makeMed("316289", "Vitamin D3 2000 UNT Oral Capsule", "2000 units daily", "2020-08-01", "Dr. Patricia Osei, MD"),
    ],
    "seed-003": [
      makeMed("308964", "Amlodipine 10 MG Oral Tablet", "10 mg daily", "2019-05-20", "Dr. James Rivera, MD"),
      makeMed("213374", "Atorvastatin 80 MG Oral Tablet", "80 mg at bedtime", "2018-04-10", "Dr. James Rivera, MD"),
      makeMed("310798", "Aspirin 81 MG Oral Tablet", "81 mg daily", "2018-04-10", "Dr. James Rivera, MD"),
      makeMed("854830", "Metoprolol Succinate 25 MG Extended Release Oral Tablet", "25 mg daily", "2021-07-15", "Dr. James Rivera, MD"),
      makeMed("860975", "Metformin 500 MG Oral Tablet", "500 mg twice daily", "2022-03-01", "Dr. James Rivera, MD"),
    ],
    "seed-004": [
      makeMed("1364435", "Apixaban 5 MG Oral Tablet", "5 mg twice daily", "2020-09-10", "Dr. Linda Cho, MD"),
      makeMed("308964", "Amlodipine 5 MG Oral Tablet", "5 mg daily", "2018-06-01", "Dr. Linda Cho, MD"),
      makeMed("1148585", "Alendronate 70 MG Oral Tablet", "70 mg weekly", "2016-05-15", "Dr. Linda Cho, MD"),
      makeMed("310130", "Lisinopril 5 MG Oral Tablet", "5 mg daily", "2018-06-01", "Dr. Linda Cho, MD"),
      makeMed("966224", "Levothyroxine 75 MCG Oral Tablet", "75 mcg daily before breakfast", "2012-07-01", "Dr. Linda Cho, MD"),
    ],
    "seed-005": [
      makeMed("745752", "Albuterol 90 MCG/ACTUAT Metered Dose Inhaler", "2 puffs every 4-6 hours as needed", "2021-03-15", "Dr. Amy Nguyen, MD"),
      makeMed("896188", "Fluticasone propionate 110 MCG/ACTUAT Metered Dose Inhaler", "2 puffs twice daily", "2021-03-15", "Dr. Amy Nguyen, MD"),
      makeMed("309309", "Sertraline 50 MG Oral Tablet", "50 mg daily", "2021-04-01", "Dr. Amy Nguyen, MD"),
    ],
    "seed-006": [
      makeMed("2200518", "Biktarvy Oral Tablet", "1 tablet daily with food", "2019-06-15", "Dr. Marcus Webb, MD"),
      makeMed("314076", "Lisinopril 10 MG Oral Tablet", "10 mg daily", "2018-04-20", "Dr. Marcus Webb, MD"),
      makeMed("209459", "Sulfamethoxazole 800 MG / Trimethoprim 160 MG Oral Tablet", "1 tablet daily (PCP prophylaxis)", "2019-06-15", "Dr. Marcus Webb, MD"),
    ],
    "seed-007": [
      makeMed("105586", "Methotrexate 2.5 MG Oral Tablet", "15 mg once weekly", "2016-03-10", "Dr. Helen Park, MD"),
      makeMed("202554", "Hydroxychloroquine 200 MG Oral Tablet", "200 mg twice daily", "2014-02-20", "Dr. Helen Park, MD"),
      makeMed("197901", "Prednisone 5 MG Oral Tablet", "5 mg daily", "2022-11-01", "Dr. Helen Park, MD"),
      makeMed("314422", "Folic acid 1 MG Oral Tablet", "1 mg daily", "2016-03-10", "Dr. Helen Park, MD"),
    ],
    "seed-008": [
      makeMed("896434", "Tiotropium Bromide 18 MCG Inhalation Powder", "1 capsule inhaled daily", "2016-07-01", "Dr. Robert Gomez, MD"),
      makeMed("745752", "Albuterol 90 MCG/ACTUAT Metered Dose Inhaler", "2 puffs every 4-6 hours as needed", "2016-07-01", "Dr. Robert Gomez, MD"),
      makeMed("860975", "Metformin 500 MG Oral Tablet", "500 mg twice daily", "2020-09-15", "Dr. Robert Gomez, MD"),
      makeMed("202991", "Furosemide 40 MG Oral Tablet", "40 mg daily", "2021-04-22", "Dr. Robert Gomez, MD"),
      makeMed("310130", "Lisinopril 5 MG Oral Tablet", "5 mg daily", "2021-04-22", "Dr. Robert Gomez, MD"),
      makeMed("200031", "Carvedilol 12.5 MG Oral Tablet", "12.5 mg twice daily", "2021-04-22", "Dr. Robert Gomez, MD"),
    ],
    "seed-009": [
      makeMed("1369603", "Insulin aspart 100 UNT/ML Injectable Solution", "Via insulin pump per protocol", "2020-01-10", "Dr. Erica Tanaka, MD"),
      makeMed("860999", "Insulin glargine 100 UNT/ML Injectable Solution", "18 units at bedtime", "2020-01-10", "Dr. Erica Tanaka, MD"),
      makeMed("310798", "Aspirin 81 MG Oral Tablet", "81 mg daily", "2023-02-15", "Dr. Erica Tanaka, MD"),
    ],
    "seed-010": [
      makeMed("309952", "Clopidogrel 75 MG Oral Tablet", "75 mg daily", "2019-11-25", "Dr. George Williams, MD"),
      makeMed("310130", "Lisinopril 10 MG Oral Tablet", "10 mg daily", "2012-06-01", "Dr. George Williams, MD"),
      makeMed("213374", "Atorvastatin 40 MG Oral Tablet", "40 mg at bedtime", "2012-09-15", "Dr. George Williams, MD"),
      makeMed("596926", "Escitalopram 10 MG Oral Tablet", "10 mg daily", "2020-03-01", "Dr. George Williams, MD"),
      makeMed("310798", "Aspirin 81 MG Oral Tablet", "81 mg daily", "2019-11-25", "Dr. George Williams, MD"),
    ],
    "seed-011": [
      makeMed("857004", "Lithium Carbonate 300 MG Oral Capsule", "300 mg three times daily", "2010-03-15", "Dr. Susan Hartley, MD"),
      makeMed("200243", "Quetiapine Fumarate 200 MG Oral Tablet", "200 mg at bedtime", "2015-07-20", "Dr. Susan Hartley, MD"),
      makeMed("884173", "Lamotrigine 100 MG Oral Tablet", "100 mg twice daily", "2018-09-05", "Dr. Susan Hartley, MD"),
      makeMed("860975", "Metformin 500 MG Oral Tablet", "500 mg twice daily", "2022-06-10", "Dr. Susan Hartley, MD"),
    ],
    "seed-012": [
      makeMed("202554", "Hydroxychloroquine 200 MG Oral Tablet", "200 mg twice daily", "2012-01-20", "Dr. Lisa Fernandez, MD"),
      makeMed("197901", "Prednisone 10 MG Oral Tablet", "10 mg daily", "2022-08-15", "Dr. Lisa Fernandez, MD"),
      makeMed("314076", "Lisinopril 10 MG Oral Tablet", "10 mg daily", "2018-03-10", "Dr. Lisa Fernandez, MD"),
      makeMed("904422", "Belimumab 200 MG/ML Subcutaneous Solution", "200 mg subcutaneously weekly", "2021-06-01", "Dr. Lisa Fernandez, MD"),
    ],
  };
  return map[patientId] ?? [];
}

function makeMed(rxnorm: string, name: string, dosage: string, start: string, requester: string) {
  return {
    resourceType: "MedicationRequest",
    id: `med-${rxnorm}-${start.replace(/-/g, "")}`,
    status: "active",
    medicationCodeableConcept: {
      coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: rxnorm, display: name }],
      text: name,
    },
    dosageInstruction: [{ text: dosage }],
    authoredOn: start,
    requester: { display: requester },
  };
}
