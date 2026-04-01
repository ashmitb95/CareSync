import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { raw } = await req.json();
  if (!raw) return Response.json({ error: "raw message required" }, { status: 400 });

  const base = new URL(req.url).origin;
  const parseRes = await fetch(`${base}/api/hl7/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const parsed = await parseRes.json();

  const fhirBundle = transformToFHIR(parsed);
  return Response.json({ parsed, fhirBundle });
}

function transformToFHIR(parsed: {
  segments: Record<string, Record<string, string>>;
  messageType: string;
}) {
  const entries: object[] = [];
  const pid = parsed.segments["PID"];
  const pv1 = parsed.segments["PV1"];
  const obx = parsed.segments["OBX"];
  const dg1 = parsed.segments["DG1"];

  if (pid) {
    entries.push({
      resource: {
        resourceType: "Patient",
        id: `hl7-patient-${pid.patient_id}`,
        identifier: [{ system: "urn:mrn", value: pid.mrn || pid.patient_id }],
        name: [{ use: "official", family: pid.family_name, given: [pid.given_name, pid.middle_name].filter(Boolean) }],
        gender: pid.gender === "M" ? "male" : pid.gender === "F" ? "female" : "unknown",
        birthDate: pid.dob
          ? `${pid.dob.slice(0, 4)}-${pid.dob.slice(4, 6)}-${pid.dob.slice(6, 8)}`
          : undefined,
        address: pid.address ? [{ text: pid.address }] : undefined,
        telecom: pid.phone ? [{ system: "phone", value: pid.phone }] : undefined,
      },
      request: { method: "PUT", url: `Patient/hl7-patient-${pid.patient_id}` },
    });
  }

  if (pv1 && pid) {
    entries.push({
      resource: {
        resourceType: "Encounter",
        id: `hl7-encounter-${Date.now()}`,
        status: "finished",
        class: { code: pv1.patient_class === "I" ? "IMP" : "AMB" },
        subject: { reference: `Patient/hl7-patient-${pid.patient_id}` },
        participant: pv1.attending_doctor
          ? [{ individual: { display: `Dr. ${pv1.attending_doctor}` } }]
          : undefined,
        serviceProvider: pv1.hospital_service ? { display: pv1.hospital_service } : undefined,
      },
      request: { method: "POST", url: "Encounter" },
    });
  }

  if (obx && pid) {
    entries.push({
      resource: {
        resourceType: "Observation",
        id: `hl7-obs-${obx.set_id ?? "1"}`,
        status: "final",
        code: { text: obx.identifier },
        subject: { reference: `Patient/hl7-patient-${pid.patient_id}` },
        valueString: `${obx.value} ${obx.units}`.trim() || obx.value,
        interpretation: obx.abnormal_flag
          ? [{ coding: [{ code: obx.abnormal_flag }] }]
          : undefined,
        referenceRange: obx.reference_range
          ? [{ text: obx.reference_range }]
          : undefined,
        effectiveDateTime: obx.datetime
          ? `${obx.datetime.slice(0, 4)}-${obx.datetime.slice(4, 6)}-${obx.datetime.slice(6, 8)}`
          : undefined,
      },
      request: { method: "POST", url: "Observation" },
    });
  }

  if (dg1 && pid) {
    entries.push({
      resource: {
        resourceType: "Condition",
        id: `hl7-cond-${dg1.diagnosis_code}`,
        code: {
          coding: [{ code: dg1.diagnosis_code, display: dg1.diagnosis_description }],
          text: dg1.diagnosis_description,
        },
        subject: { reference: `Patient/hl7-patient-${pid.patient_id}` },
        clinicalStatus: { coding: [{ code: dg1.diagnosis_type === "A" ? "active" : "inactive" }] },
      },
      request: { method: "POST", url: "Condition" },
    });
  }

  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries,
  };
}
