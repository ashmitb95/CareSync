import uuid
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _coerce_str(val: Any) -> str:
    if isinstance(val, list):
        return val[0] if val else ""
    return str(val) if val else ""


def _format_date(raw: str) -> Optional[str]:
    """Convert HL7 date/time (YYYYMMDDHHMMSS) to ISO format."""
    raw = raw.strip()
    if len(raw) >= 8:
        return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw or None


class HL7ToFHIRTransformer:
    """Transforms a parsed HL7v2 dict into a FHIR R4 transaction Bundle."""

    def transform(self, parsed_hl7: dict[str, Any]) -> dict[str, Any]:
        segments = parsed_hl7.get("segments", {})
        entries: list[dict[str, Any]] = []

        patient_resource, patient_fullurl = self._map_patient(segments)
        if patient_resource:
            entries.append({
                "fullUrl": patient_fullurl,
                "resource": patient_resource,
                "request": {"method": "PUT", "url": f"Patient/{patient_resource['id']}"},
            })

        encounter_resource = self._map_encounter(segments, patient_fullurl)
        if encounter_resource:
            enc_id = encounter_resource["id"]
            entries.append({
                "fullUrl": f"urn:uuid:{enc_id}",
                "resource": encounter_resource,
                "request": {"method": "POST", "url": "Encounter"},
            })

        observations = self._map_observations(segments, patient_fullurl)
        for obs in observations:
            obs_id = obs["id"]
            entries.append({
                "fullUrl": f"urn:uuid:{obs_id}",
                "resource": obs,
                "request": {"method": "POST", "url": "Observation"},
            })

        conditions = self._map_conditions(segments, patient_fullurl)
        for cond in conditions:
            cond_id = cond["id"]
            entries.append({
                "fullUrl": f"urn:uuid:{cond_id}",
                "resource": cond,
                "request": {"method": "POST", "url": "Condition"},
            })

        allergies = self._map_allergies(segments, patient_fullurl)
        for allergy in allergies:
            allergy_id = allergy["id"]
            entries.append({
                "fullUrl": f"urn:uuid:{allergy_id}",
                "resource": allergy,
                "request": {"method": "POST", "url": "AllergyIntolerance"},
            })

        return {
            "resourceType": "Bundle",
            "id": str(uuid.uuid4()),
            "type": "transaction",
            "entry": entries,
        }

    def _map_patient(self, segments: dict[str, Any]) -> tuple[Optional[dict], str]:
        pid = segments.get("PID")
        if not pid:
            return None, ""

        # Patient ID from PID-3 (patient_identifier_list)
        pid3 = pid.get("patient_identifier_list", "")
        if isinstance(pid3, list):
            patient_id = pid3[0].replace("^^^", "").replace("^", "-") if pid3 else str(uuid.uuid4())
        else:
            patient_id = _coerce_str(pid3) or str(uuid.uuid4())

        # Name from PID-5
        name_raw = pid.get("patient_name", [])
        if isinstance(name_raw, list):
            family = name_raw[0] if len(name_raw) > 0 else "Unknown"
            given = name_raw[1] if len(name_raw) > 1 else ""
            middle = name_raw[2] if len(name_raw) > 2 else ""
            given_names = [n for n in [given, middle] if n]
        else:
            family = _coerce_str(name_raw)
            given_names = []

        dob_raw = _coerce_str(pid.get("datetime_of_birth", ""))
        gender_map = {"M": "male", "F": "female", "O": "other", "U": "unknown"}
        gender = gender_map.get(_coerce_str(pid.get("sex", "")).upper(), "unknown")

        address_raw = pid.get("patient_address", [])
        address: dict[str, Any] = {}
        if isinstance(address_raw, list):
            address = {
                "line": [address_raw[0]] if len(address_raw) > 0 and address_raw[0] else [],
                "city": address_raw[2] if len(address_raw) > 2 else "",
                "state": address_raw[3] if len(address_raw) > 3 else "",
                "postalCode": address_raw[4] if len(address_raw) > 4 else "",
                "country": "US",
            }

        phone_raw = _coerce_str(pid.get("phone_number_home", ""))

        resource: dict[str, Any] = {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [{"system": "urn:oid:2.16.840.1.113883.3.1", "value": patient_id}],
            "name": [{"use": "official", "family": family, "given": given_names}],
            "gender": gender,
        }
        if dob_raw:
            formatted = _format_date(dob_raw)
            if formatted:
                resource["birthDate"] = formatted
        if address:
            resource["address"] = [address]
        if phone_raw:
            resource["telecom"] = [{"system": "phone", "value": phone_raw, "use": "home"}]

        fullurl = f"urn:uuid:{patient_id}"
        return resource, fullurl

    def _map_encounter(
        self, segments: dict[str, Any], patient_ref: str
    ) -> Optional[dict[str, Any]]:
        pv1 = segments.get("PV1")
        if not pv1:
            return None

        patient_class_map = {
            "I": "IMP",   # Inpatient
            "O": "AMB",   # Outpatient/Ambulatory
            "E": "EMER",  # Emergency
            "R": "OBS",   # Recurring Patient
        }
        patient_class = _coerce_str(pv1.get("patient_class", "O"))
        class_code = patient_class_map.get(patient_class.upper(), "AMB")

        enc_id = str(uuid.uuid4())

        attending = pv1.get("attending_doctor", [])
        participant: list[dict] = []
        if isinstance(attending, list) and attending:
            provider_id = attending[0]
            family = attending[1] if len(attending) > 1 else ""
            given = attending[2] if len(attending) > 2 else ""
            participant.append({
                "type": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", "code": "ATND"}]}],
                "individual": {
                    "display": f"{given} {family}".strip(),
                    "identifier": {"value": provider_id},
                },
            })

        evn = segments.get("EVN", {})
        event_ts = _coerce_str(evn.get("recorded_datetime", ""))
        start_date = _format_date(event_ts) if event_ts else None

        resource: dict[str, Any] = {
            "resourceType": "Encounter",
            "id": enc_id,
            "status": "finished",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": class_code,
            },
            "subject": {"reference": patient_ref},
        }
        if participant:
            resource["participant"] = participant
        if start_date:
            resource["period"] = {"start": start_date}

        return resource

    def _map_observations(
        self, segments: dict[str, Any], patient_ref: str
    ) -> list[dict[str, Any]]:
        """Map OBX segments to FHIR Observations."""
        # We only have one OBX in segments (first occurrence). For full support we'd
        # need to iterate segment_list, but parsed segments dict holds the first.
        obx = segments.get("OBX")
        if not obx:
            return []

        obs_id_raw = obx.get("observation_identifier", [])
        if isinstance(obs_id_raw, list):
            loinc_code = obs_id_raw[0] if obs_id_raw else ""
            display = obs_id_raw[1] if len(obs_id_raw) > 1 else ""
        else:
            loinc_code = _coerce_str(obs_id_raw)
            display = ""

        value_raw = _coerce_str(obx.get("observation_value", ""))
        units_raw = obx.get("units", [])
        units_text = units_raw[1] if isinstance(units_raw, list) and len(units_raw) > 1 else _coerce_str(units_raw)
        units_code = units_raw[0] if isinstance(units_raw, list) and units_raw else units_text
        ref_range = _coerce_str(obx.get("references_range", ""))
        obs_ts = _coerce_str(obx.get("datetime_of_observation", ""))
        status_map = {"F": "final", "P": "preliminary", "C": "corrected"}
        status = status_map.get(
            _coerce_str(obx.get("observation_result_status", "F")).upper(), "final"
        )

        obs: dict[str, Any] = {
            "resourceType": "Observation",
            "id": str(uuid.uuid4()),
            "status": status,
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": loinc_code,
                        "display": display,
                    }
                ],
                "text": display or loinc_code,
            },
            "subject": {"reference": patient_ref},
        }

        if obs_ts:
            formatted = _format_date(obs_ts)
            if formatted:
                obs["effectiveDateTime"] = formatted

        # Try to parse numeric value
        try:
            numeric = float(value_raw)
            obs["valueQuantity"] = {
                "value": numeric,
                "unit": units_text,
                "system": "http://unitsofmeasure.org",
                "code": units_code,
            }
        except (ValueError, TypeError):
            obs["valueString"] = value_raw

        if ref_range:
            obs["referenceRange"] = [{"text": ref_range}]

        return [obs]

    def _map_conditions(
        self, segments: dict[str, Any], patient_ref: str
    ) -> list[dict[str, Any]]:
        dg1 = segments.get("DG1")
        if not dg1:
            return []

        code_raw = dg1.get("diagnosis_code", [])
        if isinstance(code_raw, list):
            icd_code = code_raw[0] if code_raw else ""
            display = code_raw[1] if len(code_raw) > 1 else ""
        else:
            icd_code = _coerce_str(code_raw)
            display = _coerce_str(dg1.get("diagnosis_description", ""))

        onset_raw = _coerce_str(dg1.get("diagnosis_datetime", ""))

        cond: dict[str, Any] = {
            "resourceType": "Condition",
            "id": str(uuid.uuid4()),
            "clinicalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active",
                    }
                ]
            },
            "verificationStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": "confirmed",
                    }
                ]
            },
            "code": {
                "coding": [
                    {
                        "system": "http://hl7.org/fhir/sid/icd-10",
                        "code": icd_code,
                        "display": display,
                    }
                ],
                "text": display or icd_code,
            },
            "subject": {"reference": patient_ref},
        }
        if onset_raw:
            formatted = _format_date(onset_raw)
            if formatted:
                cond["onsetDateTime"] = formatted

        return [cond]

    def _map_allergies(
        self, segments: dict[str, Any], patient_ref: str
    ) -> list[dict[str, Any]]:
        al1 = segments.get("AL1")
        if not al1:
            return []

        allergen_raw = al1.get("allergen_code", [])
        if isinstance(allergen_raw, list):
            allergen_code = allergen_raw[0] if allergen_raw else ""
            allergen_display = allergen_raw[1] if len(allergen_raw) > 1 else ""
        else:
            allergen_code = _coerce_str(allergen_raw)
            allergen_display = allergen_code

        severity_map = {
            "SV": "severe",
            "MO": "moderate",
            "MI": "mild",
            "U": "unable-to-assess",
        }
        severity_raw = _coerce_str(al1.get("allergy_severity_code", "U")).upper()
        severity = severity_map.get(severity_raw, "unable-to-assess")

        reaction_raw = al1.get("allergy_reaction_code", "")
        reaction_text = _coerce_str(reaction_raw[0] if isinstance(reaction_raw, list) else reaction_raw)

        allergy: dict[str, Any] = {
            "resourceType": "AllergyIntolerance",
            "id": str(uuid.uuid4()),
            "clinicalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        "code": "active",
                    }
                ]
            },
            "verificationStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
                        "code": "confirmed",
                    }
                ]
            },
            "code": {
                "coding": [{"code": allergen_code, "display": allergen_display}],
                "text": allergen_display or allergen_code,
            },
            "patient": {"reference": patient_ref},
        }
        if reaction_text:
            allergy["reaction"] = [
                {
                    "manifestation": [{"text": reaction_text}],
                    "severity": severity,
                }
            ]

        return [allergy]


# Singleton
hl7_to_fhir_transformer = HL7ToFHIRTransformer()
