import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const base = new URL(req.url).origin;

  const [patient, conditions, observations, medications, encounters, allergies] =
    await Promise.allSettled([
      fetch(`${base}/api/fhir/patients/${id}`).then((r) => r.json()),
      fetch(`${base}/api/fhir/patients/${id}/conditions`).then((r) => r.json()),
      fetch(`${base}/api/fhir/patients/${id}/observations`).then((r) => r.json()),
      fetch(`${base}/api/fhir/patients/${id}/medications`).then((r) => r.json()),
      fetch(`${base}/api/fhir/patients/${id}/encounters`).then((r) => r.json()),
      fetch(`${base}/api/fhir/patients/${id}/allergies`).then((r) => r.json()),
    ]);

  const conds  = conditions.status  === "fulfilled" ? conditions.value  : [];
  const obs    = observations.status === "fulfilled" ? observations.value : [];
  const meds   = medications.status  === "fulfilled" ? medications.value  : [];
  const encs   = encounters.status   === "fulfilled" ? encounters.value   : [];
  const allrgs = allergies.status    === "fulfilled" ? allergies.value    : [];

  // --- Active conditions ---
  const activeConditions = conds
    .filter((c: Condition) => c.clinicalStatus?.coding?.[0]?.code === "active")
    .map((c: Condition) => ({
      name: c.code?.text ?? c.code?.coding?.[0]?.display ?? "Unknown",
      onset: c.onsetDateTime ?? c.recordedDate ?? "",
    }));

  // --- Medications ---
  const medicationList = meds.map((m: Medication) => ({
    name: m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display ?? "Unknown",
    dosage: m.dosageInstruction?.[0]?.text ?? "",
  }));

  // --- Abnormal labs (most recent, flag != N) ---
  const abnormalLabs = obs
    .filter((o: Observation) => {
      const flag = o.interpretation?.[0]?.coding?.[0]?.code;
      return flag && flag !== "N";
    })
    .sort((a: Observation, b: Observation) =>
      new Date(b.effectiveDateTime ?? b.issued ?? "").getTime() -
      new Date(a.effectiveDateTime ?? a.issued ?? "").getTime()
    )
    .slice(0, 6)
    .map((o: Observation) => ({
      name: o.code?.text ?? o.code?.coding?.[0]?.display ?? "Unknown",
      value: o.valueQuantity
        ? `${o.valueQuantity.value} ${o.valueQuantity.unit}`.trim()
        : o.valueString ?? "—",
      flag: o.interpretation?.[0]?.coding?.[0]?.code ?? "N",
      date: o.effectiveDateTime ?? o.issued ?? "",
    }));

  // --- Allergies ---
  const allergyList = allrgs.map((a: Allergy) => ({
    substance: a.code?.text ?? a.code?.coding?.[0]?.display ?? "Unknown",
    criticality: a.criticality ?? "",
    reaction: a.reaction?.[0]?.manifestation?.[0]?.text ?? "",
  }));

  // --- Last encounter ---
  const sortedEncs = [...encs].sort(
    (a: Encounter, b: Encounter) =>
      new Date(b.period?.start ?? "").getTime() - new Date(a.period?.start ?? "").getTime()
  );
  const lastEncounter = sortedEncs[0]
    ? {
        type: sortedEncs[0].type?.[0]?.text ?? sortedEncs[0].class?.display ?? "Encounter",
        provider: sortedEncs[0].serviceProvider?.display ?? "",
        date: sortedEncs[0].period?.start ?? "",
      }
    : null;

  // --- Care gap count (inline, same rules as /api/care-gaps/[id]) ---
  const today = Date.now();
  let careGapCount = 0;
  let careGapHighCount = 0;

  const hasDiabetes = conds.some((c: Condition) =>
    c.code?.coding?.some((co: Coding) => co.code === "44054006" || co.code === "46635009")
  );
  if (hasDiabetes) {
    const lastHba1c = obs
      .filter((o: Observation) => o.code?.coding?.some((co: Coding) => co.code === "4548-4"))
      .sort((a: Observation, b: Observation) =>
        new Date(b.effectiveDateTime ?? "").getTime() - new Date(a.effectiveDateTime ?? "").getTime()
      )[0];
    const days = lastHba1c ? Math.floor((today - new Date(lastHba1c.effectiveDateTime).getTime()) / 86400000) : 999;
    if (days > 180) { careGapCount++; careGapHighCount++; }
  }

  const hasHTN = conds.some((c: Condition) =>
    c.code?.coding?.some((co: Coding) => co.code === "38341003")
  );
  if (hasHTN) {
    const lastBP = obs
      .filter((o: Observation) => o.code?.coding?.some((co: Coding) => co.code === "85354-9"))
      .sort((a: Observation, b: Observation) =>
        new Date(b.effectiveDateTime ?? "").getTime() - new Date(a.effectiveDateTime ?? "").getTime()
      )[0];
    const days = lastBP ? Math.floor((today - new Date(lastBP.effectiveDateTime).getTime()) / 86400000) : 999;
    if (days > 90) { careGapCount++; careGapHighCount++; }
  }

  const daysSinceEnc = sortedEncs[0]
    ? Math.floor((today - new Date(sortedEncs[0].period?.start ?? "").getTime()) / 86400000)
    : 999;
  if (daysSinceEnc > 365) careGapCount++;

  if (meds.length >= 5) careGapCount++;

  // --- Clinical alerts ---
  const alerts: string[] = [];

  const hba1c = obs.find((o: Observation) => o.code?.coding?.some((co: Coding) => co.code === "4548-4"));
  if (hba1c?.valueQuantity?.value > 7) {
    alerts.push(`HbA1c elevated at ${hba1c.valueQuantity.value}% — target <7%`);
  }

  const gfr = obs.find((o: Observation) => o.code?.coding?.some((co: Coding) => co.code === "33914-3"));
  if (gfr?.valueQuantity?.value < 60) {
    alerts.push(`GFR ${gfr.valueQuantity.value} mL/min/1.73m² — consistent with CKD`);
  }

  const bnp = obs.find((o: Observation) => o.code?.coding?.some((co: Coding) => co.code === "42637-9"));
  if (bnp?.valueQuantity?.value > 400) {
    alerts.push(`NT-proBNP ${bnp.valueQuantity.value} pg/mL — elevated (heart failure marker)`);
  }

  const crp = obs.find((o: Observation) => o.code?.coding?.some((co: Coding) => co.code === "1988-5"));
  if (crp?.valueQuantity?.value > 10) {
    alerts.push(`CRP ${crp.valueQuantity.value} mg/L — active systemic inflammation`);
  }

  const cd4 = obs
    .filter((o: Observation) => o.code?.coding?.some((co: Coding) => co.code === "24467-3"))
    .sort((a: Observation, b: Observation) =>
      new Date(b.effectiveDateTime ?? "").getTime() - new Date(a.effectiveDateTime ?? "").getTime()
    )[0];
  if (cd4?.valueQuantity?.value < 200) {
    alerts.push(`CD4 count low at ${cd4.valueQuantity.value} cells/µL — immunocompromised`);
  }

  const highAllergy = allrgs.find((a: Allergy) => a.criticality === "high");
  if (highAllergy) {
    const name = highAllergy.code?.text ?? highAllergy.code?.coding?.[0]?.display ?? "Unknown";
    alerts.push(`High-criticality allergy: ${name}`);
  }

  if (meds.length >= 5) {
    alerts.push(`Polypharmacy — ${meds.length} concurrent medications`);
  }

  return Response.json({
    activeConditions,
    medications: medicationList,
    abnormalLabs,
    allergies: allergyList,
    lastEncounter,
    careGapCount,
    careGapHighCount,
    alerts,
  });
}

// Minimal local types to avoid importing from client modules
interface Coding { code?: string; display?: string }
interface Condition {
  code?: { text?: string; coding?: Coding[] };
  clinicalStatus?: { coding?: Coding[] };
  onsetDateTime?: string;
  recordedDate?: string;
}
interface Observation {
  code?: { text?: string; coding?: Coding[] };
  valueQuantity?: { value: number; unit?: string };
  valueString?: string;
  interpretation?: Array<{ coding?: Coding[] }>;
  effectiveDateTime?: string;
  issued?: string;
}
interface Medication {
  medicationCodeableConcept?: { text?: string; coding?: Array<{ display?: string }> };
  dosageInstruction?: Array<{ text?: string }>;
}
interface Encounter {
  type?: Array<{ text?: string }>;
  class?: { display?: string };
  serviceProvider?: { display?: string };
  period?: { start?: string };
}
interface Allergy {
  code?: { text?: string; coding?: Array<{ display?: string }> };
  criticality?: string;
  reaction?: Array<{ manifestation?: Array<{ text?: string }> }>;
}
