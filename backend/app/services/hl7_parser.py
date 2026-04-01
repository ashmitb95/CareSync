import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class HL7Parser:
    """Parses HL7v2 messages into structured Python dicts."""

    # Segment field definitions for human-friendly labels
    _SEGMENT_FIELD_NAMES: dict[str, list[str]] = {
        "MSH": [
            # MSH-1 (field separator '|') is the split delimiter — not present in fields list.
            # These names map to MSH-2 through MSH-13.
            "encoding_characters", "sending_application",
            "sending_facility", "receiving_application", "receiving_facility",
            "datetime", "security", "message_type", "message_control_id",
            "processing_id", "version_id",
        ],
        "EVN": ["event_type_code", "recorded_datetime", "datetime_planned_event",
                "event_reason_code", "operator_id", "event_occurred"],
        "PID": [
            "set_id", "patient_id", "patient_identifier_list", "alternate_patient_id",
            "patient_name", "mothers_maiden_name", "datetime_of_birth", "sex",
            "patient_alias", "race", "patient_address", "county_code",
            "phone_number_home", "phone_number_business", "primary_language",
            "marital_status", "religion", "patient_account_number",
        ],
        "PV1": [
            "set_id", "patient_class", "assigned_patient_location", "admission_type",
            "preadmit_number", "prior_patient_location", "attending_doctor",
            "referring_doctor", "consulting_doctor", "hospital_service",
            "temporary_location", "preadmit_test_indicator", "readmission_indicator",
            "admit_source", "ambulatory_status", "vip_indicator", "admitting_doctor",
            "patient_type", "visit_number", "financial_class", "charge_price_indicator",
        ],
        "OBX": [
            "set_id", "value_type", "observation_identifier", "observation_sub_id",
            "observation_value", "units", "references_range", "abnormal_flags",
            "probability", "nature_of_abnormal_test", "observation_result_status",
            "effective_date", "user_defined_access_checks", "datetime_of_observation",
        ],
        "ORC": [
            "order_control", "placer_order_number", "filler_order_number",
            "placer_group_number", "order_status", "response_flag",
            "quantity_timing", "parent", "datetime_of_transaction", "entered_by",
            "verified_by", "ordering_provider",
        ],
        "NK1": [
            "set_id", "name", "relationship", "address", "phone_number",
            "business_phone_number", "contact_role",
        ],
        "AL1": [
            "set_id", "allergen_type_code", "allergen_code", "allergy_severity_code",
            "allergy_reaction_code", "identification_date",
        ],
        "DG1": [
            "set_id", "diagnosis_coding_method", "diagnosis_code",
            "diagnosis_description", "diagnosis_datetime", "diagnosis_type",
        ],
        "IN1": [
            "set_id", "insurance_plan_id", "insurance_company_id",
            "insurance_company_name", "insurance_company_address",
            "insurance_co_contact_person", "insurance_co_phone_number",
            "group_number", "group_name", "insureds_group_emp_id",
        ],
        "OBR": [
            "set_id", "placer_order_number", "filler_order_number",
            "universal_service_identifier", "priority", "requested_datetime",
            "observation_datetime", "observation_end_datetime",
            "collection_volume", "collector_identifier",
        ],
        "SCH": [
            "placer_appointment_id", "filler_appointment_id", "occurrence_number",
            "placer_group_number", "schedule_id", "event_reason", "appointment_reason",
            "appointment_type", "appointment_duration", "appointment_duration_units",
            "appointment_timing_quantity", "placer_contact_person",
            "placer_contact_phone_number", "placer_contact_address",
        ],
    }

    def parse_message(self, raw: str) -> dict[str, Any]:
        """
        Parse a raw HL7v2 message string.

        Returns a dict with:
          - message_type (str)
          - timestamp (str | None)
          - segments (dict: segment_name → first occurrence parsed dict)
          - segment_list (list of {segment_name, index, fields, parsed})
          - summary (str)
        """
        # Normalise line endings
        raw = raw.strip().replace("\r\n", "\r").replace("\n", "\r")
        lines = [line for line in raw.split("\r") if line.strip()]

        segment_list: list[dict[str, Any]] = []
        segments: dict[str, Any] = {}

        for idx, line in enumerate(lines):
            seg_name = line[:3]
            fields = line.split("|")

            # Parse component-level splitting for each field
            parsed_fields: dict[str, Any] = {}
            field_names = self._SEGMENT_FIELD_NAMES.get(seg_name, [])

            for i, field in enumerate(fields[1:], start=1):
                name = field_names[i - 1] if i - 1 < len(field_names) else f"field_{i}"
                if "^" in field:
                    components = field.split("^")
                    parsed_fields[name] = components
                elif "~" in field:
                    parsed_fields[name] = field.split("~")
                else:
                    parsed_fields[name] = field

            entry: dict[str, Any] = {
                "segment_name": seg_name,
                "index": idx,
                "fields": fields,
                "parsed": parsed_fields,
            }
            segment_list.append(entry)
            # Keep first occurrence of each segment type
            if seg_name not in segments:
                segments[seg_name] = parsed_fields

        # Extract message type from MSH-9
        message_type = self._extract_message_type(segments)
        timestamp = self._extract_timestamp(segments)
        summary = self._get_message_summary(message_type, segments)

        return {
            "message_type": message_type,
            "timestamp": timestamp,
            "segments": segments,
            "segment_list": segment_list,
            "summary": summary,
        }

    def _extract_message_type(self, segments: dict[str, Any]) -> str:
        msh = segments.get("MSH", {})
        msg_type = msh.get("message_type", "")
        if isinstance(msg_type, list):
            return "^".join(msg_type)
        return str(msg_type) if msg_type else "UNKNOWN"

    def _extract_timestamp(self, segments: dict[str, Any]) -> Optional[str]:
        msh = segments.get("MSH", {})
        ts = msh.get("datetime", "")
        if isinstance(ts, list):
            ts = ts[0]
        return str(ts) if ts else None

    def get_patient_name(self, segments: dict[str, Any]) -> str:
        """Extract patient name from PID-5 as 'Given Family'."""
        pid = segments.get("PID", {})
        name = pid.get("patient_name", "")
        if isinstance(name, list):
            # HL7 name: family^given^middle
            family = name[0] if len(name) > 0 else ""
            given = name[1] if len(name) > 1 else ""
            return f"{given} {family}".strip()
        return str(name) if name else "Unknown Patient"

    def get_patient_dob(self, segments: dict[str, Any]) -> Optional[str]:
        pid = segments.get("PID", {})
        dob = pid.get("datetime_of_birth", "")
        return str(dob) if dob else None

    def get_patient_sex(self, segments: dict[str, Any]) -> Optional[str]:
        pid = segments.get("PID", {})
        sex = pid.get("sex", "")
        return str(sex) if sex else None

    def _get_message_summary(self, message_type: str, segments: dict[str, Any]) -> str:
        """Build a one-liner summary of the message."""
        patient_name = self.get_patient_name(segments)
        timestamp = self._extract_timestamp(segments) or ""

        # Format timestamp nicely if possible
        if len(timestamp) >= 8:
            ts_fmt = f"{timestamp[0:4]}-{timestamp[4:6]}-{timestamp[6:8]}"
        else:
            ts_fmt = timestamp

        type_upper = message_type.upper()

        if "ADT^A01" in type_upper:
            return f"ADT^A01: {patient_name} admitted {ts_fmt}"
        elif "ADT^A03" in type_upper:
            return f"ADT^A03: {patient_name} discharged {ts_fmt}"
        elif "ORM^O01" in type_upper:
            return f"ORM^O01: Lab order for {patient_name} on {ts_fmt}"
        elif "ORU^R01" in type_upper:
            obx = segments.get("OBX", {})
            obs_id = obx.get("observation_identifier", "")
            if isinstance(obs_id, list):
                obs_id = obs_id[1] if len(obs_id) > 1 else obs_id[0]
            return f"ORU^R01: Lab result ({obs_id}) for {patient_name} on {ts_fmt}"
        elif "SIU^S12" in type_upper:
            return f"SIU^S12: Appointment scheduled for {patient_name} on {ts_fmt}"
        else:
            return f"{message_type}: Message for {patient_name} on {ts_fmt}"


# Singleton
hl7_parser = HL7Parser()
