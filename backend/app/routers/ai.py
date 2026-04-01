import logging
import asyncio
from fastapi import APIRouter, HTTPException
from app.services.fhir_client import fhir_client
from app.services.ai_service import ai_service
from app.models.schemas import (
    SummaryResponse,
    NLQueryRequest,
    NLQueryResponse,
    DrugInteractionResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/summarize/{patient_id}", response_model=SummaryResponse)
async def summarize_patient(patient_id: str) -> SummaryResponse:
    """
    Fetch a patient's FHIR $everything bundle and generate a clinical handoff summary
    using Claude.
    """
    try:
        bundle = await fhir_client.get_patient_everything(patient_id)
    except Exception as exc:
        logger.error("Failed to fetch FHIR data for patient %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")

    try:
        summary = await ai_service.summarize_patient(bundle)
        return SummaryResponse(summary=summary)
    except Exception as exc:
        logger.error("AI summarize error for patient %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")


@router.post("/query", response_model=NLQueryResponse)
async def natural_language_query(request: NLQueryRequest) -> NLQueryResponse:
    """
    Convert a natural language clinical query into a FHIR search URL,
    execute it against the HAPI server, and return matched patients.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        result = await ai_service.natural_language_to_fhir(request.query)
    except Exception as exc:
        logger.error("AI NL query error: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")

    fhir_url = result.get("fhir_url", "")
    explanation = result.get("explanation", "")
    patients: list[dict] = []

    # Attempt to execute the FHIR URL and pull patients from the result
    if fhir_url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    fhir_url,
                    headers={"Accept": "application/fhir+json"},
                )
                resp.raise_for_status()
                bundle = resp.json()
                for entry in bundle.get("entry", []):
                    resource = entry.get("resource", {})
                    if resource.get("resourceType") == "Patient":
                        patients.append(resource)
        except Exception as exc:
            logger.warning("Could not execute FHIR URL %s: %s", fhir_url, exc)
            # Non-fatal: return URL + explanation even if execution fails

    return NLQueryResponse(
        fhirUrl=fhir_url,
        explanation=explanation,
        patients=patients,
    )


@router.post("/drug-interactions/{patient_id}", response_model=DrugInteractionResponse)
async def check_drug_interactions(patient_id: str) -> DrugInteractionResponse:
    """
    Fetch a patient's active medications and use Claude to identify
    potential drug-drug interactions.
    """
    try:
        medications = await fhir_client.get_medications(patient_id)
    except Exception as exc:
        logger.error("Failed to fetch medications for patient %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"FHIR server error: {exc}")

    if not medications:
        return DrugInteractionResponse(interactions=[])

    try:
        interactions = await ai_service.check_drug_interactions(medications)
        return DrugInteractionResponse(interactions=interactions)
    except Exception as exc:
        logger.error("AI drug interaction check error for patient %s: %s", patient_id, exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")
