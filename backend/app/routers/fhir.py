import logging
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.fhir_client import fhir_client
from app.models.schemas import PatientListResponse, TimelineEvent, TimelineResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def _safe_date(resource: dict[str, Any]) -> Optional[str]:
    """Extract the best available date from a FHIR resource for timeline sorting."""
    rtype = resource.get("resourceType", "")
    if rtype == "Condition":
        return resource.get("onsetDateTime") or resource.get("recordedDate")
    elif rtype == "Observation":
        return resource.get("effectiveDateTime") or resource.get("issued")
    elif rtype == "Encounter":
        period = resource.get("period", {})
        return period.get("start") or period.get("end")
    elif rtype == "MedicationRequest":
        return resource.get("authoredOn")
    elif rtype == "AllergyIntolerance":
        return resource.get("recordedDate") or resource.get("onsetDateTime")
    return None


def _resource_summary(resource: dict[str, Any]) -> str:
    """Build a one-line summary for a FHIR resource."""
    rtype = resource.get("resourceType", "Unknown")
    if rtype == "Condition":
        return resource.get("code", {}).get("text") or "Condition"
    elif rtype == "Observation":
        code_text = resource.get("code", {}).get("text", "Observation")
        val = resource.get("valueQuantity")
        if val:
            return f"{code_text}: {val.get('value')} {val.get('unit', '')}"
        return code_text
    elif rtype == "Encounter":
        status = resource.get("status", "")
        enc_class = resource.get("class", {}).get("code", "")
        return f"Encounter ({enc_class}) — {status}"
    elif rtype == "MedicationRequest":
        cc = resource.get("medicationCodeableConcept", {})
        name = cc.get("text") or (cc.get("coding", [{}])[0].get("display", "Medication"))
        return f"Medication: {name}"
    elif rtype == "AllergyIntolerance":
        code_text = resource.get("code", {}).get("text", "Allergy")
        return f"Allergy: {code_text}"
    return rtype


@router.get("/patients", response_model=PatientListResponse)
async def list_patients(
    _count: int = Query(20, alias="_count", ge=1, le=100),
    name: Optional[str] = Query(None),
    _getpagesoffset: int = Query(0, alias="_getpagesoffset", ge=0),
) -> PatientListResponse:
    try:
        patients, total, next_url = await fhir_client.search_patients(
            count=_count, name=name, offset=_getpagesoffset
        )
        return PatientListResponse(patients=patients, total=total, nextUrl=next_url)
    except Exception as exc:
        logger.error("Error fetching patients: %s", exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")


@router.get("/patients/{patient_id}")
async def get_patient(patient_id: str) -> dict[str, Any]:
    try:
        return await fhir_client.get_patient(patient_id)
    except Exception as exc:
        logger.error("Error fetching patient %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")


@router.get("/patients/{patient_id}/conditions")
async def get_conditions(patient_id: str) -> list[dict[str, Any]]:
    try:
        return await fhir_client.get_conditions(patient_id)
    except Exception as exc:
        logger.error("Error fetching conditions for %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")


@router.get("/patients/{patient_id}/observations")
async def get_observations(patient_id: str) -> list[dict[str, Any]]:
    try:
        return await fhir_client.get_observations(patient_id)
    except Exception as exc:
        logger.error("Error fetching observations for %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")


@router.get("/patients/{patient_id}/medications")
async def get_medications(patient_id: str) -> list[dict[str, Any]]:
    try:
        return await fhir_client.get_medications(patient_id)
    except Exception as exc:
        logger.error("Error fetching medications for %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")


@router.get("/patients/{patient_id}/encounters")
async def get_encounters(patient_id: str) -> list[dict[str, Any]]:
    try:
        return await fhir_client.get_encounters(patient_id)
    except Exception as exc:
        logger.error("Error fetching encounters for %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")


@router.get("/patients/{patient_id}/allergies")
async def get_allergies(patient_id: str) -> list[dict[str, Any]]:
    try:
        return await fhir_client.get_allergies(patient_id)
    except Exception as exc:
        logger.error("Error fetching allergies for %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")


@router.get("/patients/{patient_id}/timeline", response_model=TimelineResponse)
async def get_patient_timeline(patient_id: str) -> TimelineResponse:
    """
    Aggregate conditions, observations, encounters, medications, and allergies
    into a unified timeline sorted by date descending.
    """
    try:
        conditions, observations, encounters, medications, allergies = await _gather_all(patient_id)
    except Exception as exc:
        logger.error("Error building timeline for %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")

    all_resources = conditions + observations + encounters + medications + allergies
    events: list[TimelineEvent] = []

    for resource in all_resources:
        rid = resource.get("id", "unknown")
        rtype = resource.get("resourceType", "Unknown")
        date = _safe_date(resource)
        summary = _resource_summary(resource)
        events.append(TimelineEvent(
            id=rid,
            date=date,
            type=rtype,
            summary=summary,
            resource=resource,
        ))

    # Sort: resources with dates first (descending), then those without
    events.sort(
        key=lambda e: (e.date is None, e.date if e.date else ""),
        reverse=False,
    )
    events.reverse()

    return TimelineResponse(events=events)


async def _gather_all(
    patient_id: str,
) -> tuple[list, list, list, list, list]:
    """Fetch all resource types in parallel."""
    import asyncio
    conditions, observations, encounters, medications, allergies = await asyncio.gather(
        fhir_client.get_conditions(patient_id),
        fhir_client.get_observations(patient_id),
        fhir_client.get_encounters(patient_id),
        fhir_client.get_medications(patient_id),
        fhir_client.get_allergies(patient_id),
        return_exceptions=True,
    )

    def _safe(val: Any) -> list:
        return val if isinstance(val, list) else []

    return _safe(conditions), _safe(observations), _safe(encounters), _safe(medications), _safe(allergies)
