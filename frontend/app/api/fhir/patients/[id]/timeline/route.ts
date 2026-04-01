import { NextRequest } from "next/server";
import type { TimelineEvent } from "@/lib/api";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const base = new URL(req.url).origin;

  const [conditions, observations, medications, encounters] = await Promise.allSettled([
    fetch(`${base}/api/fhir/patients/${id}/conditions`).then((r) => r.json()),
    fetch(`${base}/api/fhir/patients/${id}/observations`).then((r) => r.json()),
    fetch(`${base}/api/fhir/patients/${id}/medications`).then((r) => r.json()),
    fetch(`${base}/api/fhir/patients/${id}/encounters`).then((r) => r.json()),
  ]);

  const events: TimelineEvent[] = [];

  if (conditions.status === "fulfilled") {
    for (const c of conditions.value) {
      const date = c.onsetDateTime ?? c.recordedDate;
      if (!date) continue;
      events.push({
        id: c.id ?? `cond-${date}`,
        date,
        type: "condition",
        title: c.code?.text ?? c.code?.coding?.[0]?.display ?? "Condition",
        subtitle: c.clinicalStatus?.coding?.[0]?.code ?? "",
        resource: c,
      });
    }
  }

  if (observations.status === "fulfilled") {
    for (const o of observations.value) {
      const date = o.effectiveDateTime ?? o.issued;
      if (!date) continue;
      const value = o.valueQuantity
        ? `${o.valueQuantity.value} ${o.valueQuantity.unit}`
        : o.valueString ?? "";
      events.push({
        id: o.id ?? `obs-${date}`,
        date,
        type: "lab",
        title: o.code?.text ?? o.code?.coding?.[0]?.display ?? "Lab Result",
        subtitle: value,
        detail: o.interpretation?.[0]?.coding?.[0]?.code,
        resource: o,
      });
    }
  }

  if (medications.status === "fulfilled") {
    for (const m of medications.value) {
      const date = m.authoredOn;
      if (!date) continue;
      events.push({
        id: m.id ?? `med-${date}`,
        date,
        type: "medication",
        title: m.medicationCodeableConcept?.text ?? "Medication",
        subtitle: m.dosageInstruction?.[0]?.text ?? "",
        resource: m,
      });
    }
  }

  if (encounters.status === "fulfilled") {
    for (const e of encounters.value) {
      const date = e.period?.start;
      if (!date) continue;
      events.push({
        id: e.id ?? `enc-${date}`,
        date,
        type: "encounter",
        title: e.type?.[0]?.text ?? e.class?.display ?? "Encounter",
        subtitle: e.serviceProvider?.display ?? "",
        resource: e,
      });
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return Response.json(events);
}
