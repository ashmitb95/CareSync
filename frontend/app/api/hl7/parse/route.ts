import { NextRequest } from "next/server";
import { logHl7Message } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { raw } = await req.json();
  if (!raw) return Response.json({ error: "raw message required" }, { status: 400 });
  const result = parseHL7(raw);
  logHl7Message(raw, result.messageType, result.segments);
  return Response.json(result);
}

function parseHL7(raw: string) {
  const lines = raw.split(/\r\n|\r|\n/).filter((l: string) => l.trim());
  const segments: Record<string, Record<string, string>> = {};
  const segmentList: string[] = [];

  for (const line of lines) {
    const fields = line.split("|");
    const segName = fields[0];
    if (!segName) continue;
    segmentList.push(segName);
    const seg: Record<string, string> = {};

    if (segName === "MSH") {
      // MSH.1 is the field separator character (|) itself — not a split field.
      // After splitting on |: fields[1]=MSH.2 (encoding chars), fields[2]=MSH.3, etc.
      seg["encoding_characters"]  = fields[1] ?? "";
      seg["sending_application"]  = fields[2] ?? "";
      seg["sending_facility"]     = fields[3] ?? "";
      seg["receiving_application"]= fields[4] ?? "";
      seg["receiving_facility"]   = fields[5] ?? "";
      seg["datetime"]             = fields[6] ?? "";
      seg["message_type"]         = fields[8] ?? "";
      seg["message_control_id"]   = fields[9] ?? "";
      seg["processing_id"]        = fields[10] ?? "";
      seg["version"]              = fields[11] ?? "";
    } else if (segName === "PID") {
      const nameParts = (fields[5] ?? "").split("^");
      seg["set_id"] = fields[1] ?? "";
      seg["patient_id"] = (fields[3] ?? "").split("^")[0];
      seg["patient_name_raw"] = fields[5] ?? "";
      seg["family_name"] = nameParts[0] ?? "";
      seg["given_name"] = nameParts[1] ?? "";
      seg["middle_name"] = nameParts[2] ?? "";
      seg["dob"] = fields[7] ?? "";
      seg["gender"] = fields[8] ?? "";
      seg["address"] = (fields[11] ?? "").split("^").filter(Boolean).join(", ");
      seg["phone"] = fields[13] ?? "";
      seg["mrn"] = (fields[3] ?? "").split("^")[0];
    } else if (segName === "PV1") {
      seg["patient_class"] = fields[2] ?? "";
      seg["assigned_location"] = fields[3] ?? "";
      seg["attending_doctor"] = (fields[7] ?? "").split("^").slice(0, 2).reverse().join(" ").trim();
      seg["consulting_doctor"] = (fields[9] ?? "").split("^").slice(0, 2).reverse().join(" ").trim();
      seg["hospital_service"] = fields[10] ?? "";
      seg["admit_source"] = fields[14] ?? "";
    } else if (segName === "OBX") {
      seg["set_id"] = fields[1] ?? "";
      seg["value_type"] = fields[2] ?? "";
      seg["identifier"] = (fields[3] ?? "").split("^")[1] ?? fields[3] ?? "";
      seg["value"] = fields[5] ?? "";
      seg["units"] = fields[6] ?? "";
      seg["reference_range"] = fields[7] ?? "";
      seg["abnormal_flag"] = fields[8] ?? "";
      seg["observation_status"] = fields[11] ?? "";
      seg["datetime"] = fields[14] ?? "";
    } else if (segName === "OBR") {
      seg["set_id"] = fields[1] ?? "";
      seg["order_number"] = fields[2] ?? "";
      seg["test_identifier"] = (fields[4] ?? "").split("^")[1] ?? fields[4] ?? "";
      seg["observation_datetime"] = fields[7] ?? "";
      seg["report_datetime"] = fields[22] ?? "";
    } else if (segName === "ORC") {
      seg["order_control"] = fields[1] ?? "";
      seg["placer_order_number"] = fields[2] ?? "";
      seg["filler_order_number"] = fields[3] ?? "";
    } else if (segName === "DG1") {
      const codeParts = (fields[3] ?? "").split("^");
      seg["diagnosis_code"] = codeParts[0] ?? "";
      seg["diagnosis_description"] = codeParts[1] ?? "";
      seg["diagnosis_coding_method"] = codeParts[2] ?? "";
      seg["diagnosis_type"] = fields[6] ?? "";
    } else if (segName === "NK1") {
      seg["name"] = (fields[2] ?? "").split("^").slice(0, 2).reverse().join(" ").trim();
      seg["relationship"] = fields[3] ?? "";
      seg["phone"] = fields[5] ?? "";
    } else if (segName === "EVN") {
      seg["event_type"] = fields[1] ?? "";
      seg["datetime"] = fields[2] ?? "";
    } else if (segName === "SCH") {
      seg["appointment_id"] = fields[1] ?? "";
      seg["appointment_type"] = fields[7] ?? "";
      seg["appointment_duration"] = fields[9] ?? "";
      seg["appointment_timing"] = fields[11] ?? "";
    } else {
      fields.slice(1).forEach((f, i) => {
        if (f) seg[`field_${i + 1}`] = f;
      });
    }

    segments[segName] = seg;
  }

  const msh = segments["MSH"] ?? {};
  const pid = segments["PID"] ?? {};
  const messageType = msh.message_type ?? "UNKNOWN";
  const patientName = pid.given_name && pid.family_name
    ? `${pid.given_name} ${pid.family_name}`
    : pid.patient_name_raw ?? "Unknown";
  const timestamp = msh.datetime ? formatHL7Date(msh.datetime) : "";

  const summaryMap: Record<string, string> = {
    "ADT^A01": `Patient admission: ${patientName} admitted${timestamp ? ` on ${timestamp}` : ""}`,
    "ADT^A03": `Patient discharge: ${patientName} discharged${timestamp ? ` on ${timestamp}` : ""}`,
    "ORM^O01": `Lab order for ${patientName}`,
    "ORU^R01": `Lab result for ${patientName}`,
    "SIU^S12": `Appointment scheduled for ${patientName}`,
  };
  const summary = summaryMap[messageType] ?? `${messageType} message for ${patientName}`;

  return { messageType, timestamp, summary, segments, segmentList };
}

function formatHL7Date(hl7Date: string): string {
  if (hl7Date.length < 8) return hl7Date;
  const y = hl7Date.slice(0, 4);
  const m = hl7Date.slice(4, 6);
  const d = hl7Date.slice(6, 8);
  return `${y}-${m}-${d}`;
}
