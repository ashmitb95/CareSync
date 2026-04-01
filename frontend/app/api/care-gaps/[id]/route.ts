import { NextRequest } from "next/server";
import type { CareGap } from "@/lib/api";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // For population endpoint
  if (id === "population") {
    return getPopulation(req);
  }

  const base = new URL(req.url).origin;
  const [conditions, observations, medications, encounters] = await Promise.allSettled([
    fetch(`${base}/api/fhir/patients/${id}/conditions`).then((r) => r.json()),
    fetch(`${base}/api/fhir/patients/${id}/observations`).then((r) => r.json()),
    fetch(`${base}/api/fhir/patients/${id}/medications`).then((r) => r.json()),
    fetch(`${base}/api/fhir/patients/${id}/encounters`).then((r) => r.json()),
  ]);

  const gaps: CareGap[] = [];
  const today = new Date();

  const conds = conditions.status === "fulfilled" ? conditions.value : [];
  const obs = observations.status === "fulfilled" ? observations.value : [];
  const meds = medications.status === "fulfilled" ? medications.value : [];
  const encs = encounters.status === "fulfilled" ? encounters.value : [];

  // Rule: HbA1c for diabetics (every 180 days)
  const hasDiabetes = conds.some((c: { code?: { coding?: Array<{ code?: string }> } }) =>
    c.code?.coding?.some((co: { code?: string }) => co.code === "44054006" || co.code === "46635009")
  );
  if (hasDiabetes) {
    const hba1cObs = obs.filter((o: { code?: { coding?: Array<{ code?: string }> } }) =>
      o.code?.coding?.some((co: { code?: string }) => co.code === "4548-4")
    );
    const lastHba1c = hba1cObs.sort((a: { effectiveDateTime?: string }, b: { effectiveDateTime?: string }) =>
      new Date(b.effectiveDateTime ?? "").getTime() - new Date(a.effectiveDateTime ?? "").getTime()
    )[0];
    const daysSince = lastHba1c
      ? Math.floor((today.getTime() - new Date(lastHba1c.effectiveDateTime).getTime()) / 86400000)
      : 999;
    if (daysSince > 180) {
      gaps.push({
        id: "hba1c_monitoring",
        gapType: "hba1c_monitoring",
        name: "HbA1c Monitoring",
        description: "Diabetic patients require HbA1c monitoring every 3-6 months.",
        severity: "high",
        daysOverdue: daysSince - 180,
        triggeringCondition: "Type 2 Diabetes Mellitus",
        conditionCode: "44054006",
      });
    }
  }

  // Rule: BP for hypertensives (every 90 days)
  const hasHTN = conds.some((c: { code?: { coding?: Array<{ code?: string }> } }) =>
    c.code?.coding?.some((co: { code?: string }) => co.code === "38341003")
  );
  if (hasHTN) {
    const bpObs = obs.filter((o: { code?: { coding?: Array<{ code?: string }> } }) =>
      o.code?.coding?.some((co: { code?: string }) => co.code === "85354-9")
    );
    const lastBP = bpObs[0];
    const daysSince = lastBP
      ? Math.floor((today.getTime() - new Date(lastBP.effectiveDateTime).getTime()) / 86400000)
      : 999;
    if (daysSince > 90) {
      gaps.push({
        id: "bp_monitoring",
        gapType: "bp_monitoring",
        name: "Blood Pressure Monitoring",
        description: "Hypertensive patients require BP monitoring every 90 days.",
        severity: "high",
        daysOverdue: daysSince - 90,
        triggeringCondition: "Hypertensive Disorder",
        conditionCode: "38341003",
      });
    }
  }

  // Rule: Annual wellness visit
  const lastEnc = encs.sort((a: { period?: { start?: string } }, b: { period?: { start?: string } }) =>
    new Date(b.period?.start ?? "").getTime() - new Date(a.period?.start ?? "").getTime()
  )[0];
  const daysSinceEnc = lastEnc
    ? Math.floor((today.getTime() - new Date(lastEnc.period?.start).getTime()) / 86400000)
    : 999;
  if (daysSinceEnc > 365) {
    gaps.push({
      id: "annual_wellness",
      gapType: "annual_wellness",
      name: "Annual Wellness Visit",
      description: "All patients should have at least one encounter per year.",
      severity: "low",
      daysOverdue: daysSinceEnc - 365,
    });
  }

  // Rule: Medication review (5+ active meds)
  if (meds.length >= 5) {
    gaps.push({
      id: "medication_review",
      gapType: "medication_review",
      name: "Medication Review",
      description: `Patient is on ${meds.length} active medications. A comprehensive medication review is recommended every 6 months.`,
      severity: "medium",
    });
  }

  return Response.json(gaps);
}

async function getPopulation(req: NextRequest) {
  // Aggregate care gaps across all seed patients + some simulated data
  const base = new URL(req.url).origin;
  const seedIds = [
    "seed-001", "seed-002", "seed-003", "seed-004", "seed-005",
    "seed-006", "seed-007", "seed-008", "seed-009", "seed-010",
    "seed-011", "seed-012",
  ];

  const results = await Promise.allSettled(
    seedIds.map((id) => fetch(`${base}/api/care-gaps/${id}`).then((r) => r.json()))
  );

  const allGaps = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r, i) => {
      const gaps = (r as PromiseFulfilledResult<CareGap[]>).value;
      return gaps.map((g) => ({ ...g, _patientId: seedIds[i] }));
    });

  const gapsByType: Record<string, number> = {};
  const gapsBySeverity = { low: 0, medium: 0, high: 0 };

  for (const gap of allGaps) {
    gapsByType[gap.name] = (gapsByType[gap.name] ?? 0) + 1;
    gapsBySeverity[gap.severity]++;
  }

  return Response.json({
    totalPatients: seedIds.length,
    totalGaps: allGaps.length,
    gapsByType: Object.entries(gapsByType).map(([type, count]) => ({ type, count })),
    gapsBySeverity,
    patientsWithMostGaps: [],
  });
}
