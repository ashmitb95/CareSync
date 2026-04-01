import asyncio
import logging
from fastapi import APIRouter, HTTPException
from app.services.fhir_client import fhir_client
from app.services.care_gap_engine import care_gap_engine
from app.models.schemas import CareGap, CareGapListResponse, PopulationGapStats

logger = logging.getLogger(__name__)
router = APIRouter()


async def _fetch_patient_data(patient_id: str) -> tuple[list, list, list, list]:
    """Fetch conditions, observations, encounters, and medications concurrently."""
    results = await asyncio.gather(
        fhir_client.get_conditions(patient_id),
        fhir_client.get_observations(patient_id),
        fhir_client.get_encounters(patient_id),
        fhir_client.get_medications(patient_id),
        return_exceptions=True,
    )

    def _safe(val) -> list:
        return val if isinstance(val, list) else []

    return _safe(results[0]), _safe(results[1]), _safe(results[2]), _safe(results[3])


# NOTE: /population/summary must be declared BEFORE /{patient_id} to avoid
# FastAPI matching "population" as a patient_id path parameter.
@router.get("/population/summary", response_model=PopulationGapStats)
async def get_population_gap_stats() -> PopulationGapStats:
    """
    Compute population-level care gap statistics across a sample of patients.
    Fetches the first page of patients from the FHIR server and evaluates each.
    """
    try:
        patients, total, _ = await fhir_client.search_patients(count=20)
    except Exception as exc:
        logger.error("Error fetching patient list for population stats: %s", exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")

    if not patients:
        return PopulationGapStats(
            totalPatients=0,
            totalGaps=0,
            gapsByType={},
            gapsBySeverity={},
            patientsWithMostGaps=[],
        )

    gaps_by_type: dict[str, int] = {}
    gaps_by_severity: dict[str, int] = {}
    patient_gap_counts: list[dict] = []
    all_gaps_count = 0

    # Evaluate up to 10 patients with a concurrency limit of 5
    sem = asyncio.Semaphore(5)

    async def evaluate_one(patient: dict) -> tuple[str, list[CareGap]]:
        patient_id = patient.get("id", "")
        async with sem:
            try:
                conditions, observations, encounters, medications = await _fetch_patient_data(
                    patient_id
                )
            except Exception:
                return patient_id, []
            gaps = care_gap_engine.evaluate_patient(
                patient_id=patient_id,
                conditions=conditions,
                observations=observations,
                encounters=encounters,
                medications=medications,
            )
            return patient_id, gaps

    tasks = [evaluate_one(p) for p in patients[:10]]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for item in results:
        if isinstance(item, Exception):
            continue
        patient_id, gaps = item
        all_gaps_count += len(gaps)

        for gap in gaps:
            gaps_by_type[gap.gap_type] = gaps_by_type.get(gap.gap_type, 0) + 1
            gaps_by_severity[gap.severity] = gaps_by_severity.get(gap.severity, 0) + 1

        if gaps:
            patient_name = "Unknown"
            for p in patients:
                if p.get("id") == patient_id:
                    name_list = p.get("name", [{}])
                    if name_list:
                        n = name_list[0]
                        given = " ".join(n.get("given", []))
                        family = n.get("family", "")
                        patient_name = f"{given} {family}".strip()
                    break
            patient_gap_counts.append({
                "patientId": patient_id,
                "name": patient_name,
                "gapCount": len(gaps),
            })

    # Sort by gap count descending, take top 5
    patient_gap_counts.sort(key=lambda x: x["gapCount"], reverse=True)
    top_patients = patient_gap_counts[:5]

    return PopulationGapStats(
        totalPatients=len(patients),
        totalGaps=all_gaps_count,
        gapsByType=gaps_by_type,
        gapsBySeverity=gaps_by_severity,
        patientsWithMostGaps=top_patients,
    )


@router.get("/{patient_id}", response_model=CareGapListResponse)
async def get_patient_care_gaps(patient_id: str) -> CareGapListResponse:
    """
    Evaluate care gaps for a single patient by fetching their FHIR data
    and running the clinical rule engine.
    """
    try:
        conditions, observations, encounters, medications = await _fetch_patient_data(patient_id)
    except Exception as exc:
        logger.error("Error fetching FHIR data for care gap analysis (%s): %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")

    gaps = care_gap_engine.evaluate_patient(
        patient_id=patient_id,
        conditions=conditions,
        observations=observations,
        encounters=encounters,
        medications=medications,
    )

    return CareGapListResponse(gaps=gaps, total=len(gaps))
