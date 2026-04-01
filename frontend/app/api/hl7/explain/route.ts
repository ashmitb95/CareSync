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

  return Response.json({ explanation: buildExplanation(raw, parsed) });
}

// ── Segment-type descriptions ──────────────────────────────────────────────────

const MESSAGE_TYPE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  "ADT^A01": {
    title: "Patient Admission",
    description:
      "Signals that a patient has been admitted to a facility. Sent to downstream systems (EHR, lab, pharmacy, bed management) to open a new visit and begin order routing.",
  },
  "ADT^A03": {
    title: "Patient Discharge",
    description:
      "Signals a patient has been discharged. Downstream systems use this to close open orders, release the bed, and trigger billing and claims workflows.",
  },
  "ADT^A08": {
    title: "Patient Information Update",
    description:
      "Notifies downstream systems that patient demographics or visit information has changed (address, insurance, attending physician, etc.).",
  },
  "ORM^O01": {
    title: "General Order",
    description:
      "Carries a clinical order — most commonly a laboratory or radiology order — from the ordering system to the fulfilling department. Triggers work queues in the lab or imaging system.",
  },
  "ORU^R01": {
    title: "Observation Result",
    description:
      "Delivers diagnostic results (lab values, vitals, pathology) from the producing system (LIS, analyzer) back to the EHR. May contain multiple OBX observations in a single message.",
  },
  "SIU^S12": {
    title: "New Appointment Scheduled",
    description:
      "Notifies scheduling-aware systems that a new appointment has been booked. Used to synchronize calendars across registration, reminders, and resource management.",
  },
  "SIU^S14": {
    title: "Appointment Modified",
    description: "Signals that an existing appointment has been rescheduled or updated.",
  },
  "SIU^S15": {
    title: "Appointment Cancelled",
    description: "Signals that a previously scheduled appointment has been cancelled.",
  },
  "RDE^O11": {
    title: "Pharmacy/Treatment Encoded Order",
    description:
      "Carries a pharmacy medication order from the prescribing system to the pharmacy system for dispensing.",
  },
};

const PATIENT_CLASS_LABELS: Record<string, string> = {
  I: "Inpatient",
  O: "Outpatient",
  E: "Emergency",
  P: "Preadmit",
  R: "Recurring patient",
  B: "Obstetrics",
};

const GENDER_LABELS: Record<string, string> = {
  M: "Male",
  F: "Female",
  O: "Other",
  U: "Unknown",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHl7Date(s: string): string {
  if (!s || s.length < 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function bullet(label: string, value: string | undefined): string | null {
  return value ? `• ${label}: ${value}` : null;
}

function section(title: string, lines: (string | null)[]): string {
  const items = lines.filter(Boolean) as string[];
  if (!items.length) return "";
  return `**${title}**\n${items.join("\n")}`;
}

// Extract ALL occurrences of a segment type from raw HL7 (handles duplicates like OBX)
function allSegments(raw: string, segName: string): Record<string, string | undefined>[] {
  return raw
    .split(/\r\n|\r|\n/)
    .filter((l) => l.startsWith(segName + "|"))
    .map((line) => {
      const f = line.split("|");
      if (segName === "OBX") {
        return {
          set_id: f[1] ?? "",
          identifier: (f[3] ?? "").split("^")[1] ?? (f[3] ?? ""),
          value: f[5] ?? "",
          units: f[6] ?? "",
          reference_range: f[7] ?? "",
          abnormal_flag: f[8] ?? "",
        };
      }
      if (segName === "DG1") {
        const parts = (f[3] ?? "").split("^");
        return {
          code: parts[0] ?? "",
          description: parts[1] ?? "",
          coding_method: parts[2] ?? "",
          type: f[6] ?? "",
        };
      }
      return {};
    });
}

// ── Main builder ──────────────────────────────────────────────────────────────

function buildExplanation(
  raw: string,
  parsed: {
    messageType: string;
    timestamp: string;
    segments: Record<string, Record<string, string>>;
  }
): string {
  const { messageType, segments } = parsed;
  const parts: string[] = [];

  // 1 — Message type
  const typeMeta = MESSAGE_TYPE_DESCRIPTIONS[messageType];
  parts.push(
    `**Message Type: ${messageType}${typeMeta ? ` — ${typeMeta.title}` : ""}**\n` +
      (typeMeta?.description ?? `HL7v2 message of type ${messageType}.`)
  );

  // 2 — Sending/receiving system (MSH)
  const msh = segments["MSH"] ?? {};
  const mshLines = [
    bullet("Sent by", [msh.sending_application, msh.sending_facility].filter(Boolean).join(" @ ")),
    bullet("Received by", [msh.receiving_application, msh.receiving_facility].filter(Boolean).join(" @ ")),
    bullet("Timestamp", msh.datetime ? formatHl7Date(msh.datetime) : undefined),
    bullet("HL7 version", msh.version),
    bullet("Message control ID", msh.message_control_id),
  ];
  const mshSection = section("Message Header (MSH)", mshLines);
  if (mshSection) parts.push(mshSection);

  // 3 — Patient (PID)
  const pid = segments["PID"] ?? {};
  const patientName = [pid.given_name, pid.family_name].filter(Boolean).join(" ") || pid.patient_name_raw;
  const pidLines = [
    bullet("Name", patientName || undefined),
    bullet("MRN", pid.mrn),
    bullet("Date of birth", pid.dob ? formatHl7Date(pid.dob) : undefined),
    bullet("Gender", pid.gender ? (GENDER_LABELS[pid.gender] ?? pid.gender) : undefined),
    bullet("Address", pid.address || undefined),
    bullet("Phone", pid.phone || undefined),
  ];
  const pidSection = section("Patient (PID)", pidLines);
  if (pidSection) parts.push(pidSection);

  // 4 — Visit (PV1)
  const pv1 = segments["PV1"] ?? {};
  const pv1Lines = [
    bullet("Patient class", pv1.patient_class ? (PATIENT_CLASS_LABELS[pv1.patient_class] ?? pv1.patient_class) : undefined),
    bullet("Location", pv1.assigned_location || undefined),
    bullet("Attending physician", pv1.attending_doctor || undefined),
    bullet("Consulting physician", pv1.consulting_doctor || undefined),
    bullet("Hospital service", pv1.hospital_service || undefined),
    bullet("Admit source", pv1.admit_source || undefined),
  ];
  const pv1Section = section("Visit (PV1)", pv1Lines);
  if (pv1Section) parts.push(pv1Section);

  // 5 — Order (OBR)
  const obr = segments["OBR"] ?? {};
  const obrLines = [
    bullet("Test ordered", obr.test_identifier || undefined),
    bullet("Order number", obr.order_number || undefined),
    bullet("Observation datetime", obr.observation_datetime ? formatHl7Date(obr.observation_datetime) : undefined),
  ];
  const obrSection = section("Order (OBR)", obrLines);
  if (obrSection) parts.push(obrSection);

  // 6 — Observations / results (OBX — all occurrences)
  const obxRows = allSegments(raw, "OBX");
  if (obxRows.length) {
    const obxLines = obxRows.map((o) => {
      const flag = o.abnormal_flag ? ` [${o.abnormal_flag}]` : "";
      const ref = o.reference_range ? ` (ref: ${o.reference_range})` : "";
      return `• ${o.identifier || "Result"}: ${o.value} ${o.units}${flag}${ref}`.trim();
    });
    parts.push(`**Observations (OBX)**\n${obxLines.join("\n")}`);
  }

  // 7 — Diagnoses (DG1 — all occurrences)
  const dg1Rows = allSegments(raw, "DG1");
  if (dg1Rows.length) {
    const dg1Lines = dg1Rows.map((d) => {
      const system = d.coding_method ? ` (${d.coding_method})` : "";
      return `• ${d.description || d.code}${d.code ? ` — ${d.code}` : ""}${system}`;
    });
    parts.push(`**Diagnoses (DG1)**\n${dg1Lines.join("\n")}`);
  }

  // 8 — Appointment (SCH)
  const sch = segments["SCH"] ?? {};
  const schLines = [
    bullet("Appointment ID", sch.appointment_id || undefined),
    bullet("Type", sch.appointment_type || undefined),
    bullet("Duration", sch.appointment_duration ? `${sch.appointment_duration} min` : undefined),
    bullet("Timing", sch.appointment_timing || undefined),
  ];
  const schSection = section("Appointment (SCH)", schLines);
  if (schSection) parts.push(schSection);

  // 9 — Next of kin (NK1)
  const nk1 = segments["NK1"] ?? {};
  const nk1Lines = [
    bullet("Name", nk1.name || undefined),
    bullet("Relationship", nk1.relationship || undefined),
    bullet("Phone", nk1.phone || undefined),
  ];
  const nk1Section = section("Next of Kin (NK1)", nk1Lines);
  if (nk1Section) parts.push(nk1Section);

  return parts.join("\n\n");
}
