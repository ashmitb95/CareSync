import os
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.services.hl7_parser import hl7_parser
from app.services.hl7_to_fhir import hl7_to_fhir_transformer
from app.services.ai_service import ai_service
from app.models.schemas import (
    HL7ParseRequest,
    HL7ParseResponse,
    HL7TransformRequest,
    HL7TransformResponse,
    HL7ExplainRequest,
    HL7ExplainResponse,
    SampleMessageMeta,
)

logger = logging.getLogger(__name__)
router = APIRouter()

SAMPLE_DIR = Path(__file__).parent.parent / "data" / "sample_hl7"

# Metadata for each bundled sample file
_SAMPLE_METADATA: dict[str, dict] = {
    "adt_a01.hl7": {
        "id": "adt_a01",
        "message_type": "ADT^A01",
        "description": "Patient Admission — Minh Nguyen admitted to Medical Unit 305",
    },
    "adt_a03.hl7": {
        "id": "adt_a03",
        "message_type": "ADT^A03",
        "description": "Patient Discharge — Minh Nguyen discharged from Medical Unit 305",
    },
    "orm_o01.hl7": {
        "id": "orm_o01",
        "message_type": "ORM^O01",
        "description": "Lab Order — HbA1c and CBC ordered for Emily Chen",
    },
    "oru_r01.hl7": {
        "id": "oru_r01",
        "message_type": "ORU^R01",
        "description": "Lab Result — HbA1c result 8.2% for Emily Chen (elevated)",
    },
    "siu_s12.hl7": {
        "id": "siu_s12",
        "message_type": "SIU^S12",
        "description": "Appointment Scheduled — Follow-up with Dr. Rodriguez for Robert Johnson",
    },
}


@router.get("/samples", response_model=list[SampleMessageMeta])
async def list_samples() -> list[SampleMessageMeta]:
    """Return metadata for all bundled HL7v2 sample messages."""
    results: list[SampleMessageMeta] = []
    for filename, meta in _SAMPLE_METADATA.items():
        file_path = SAMPLE_DIR / filename
        summary = ""
        if file_path.exists():
            try:
                raw = file_path.read_text(encoding="utf-8")
                parsed = hl7_parser.parse_message(raw)
                summary = parsed.get("summary", "")
            except Exception as exc:
                logger.warning("Could not parse sample %s: %s", filename, exc)
                summary = meta["description"]
        results.append(
            SampleMessageMeta(
                id=meta["id"],
                filename=filename,
                message_type=meta["message_type"],
                description=meta["description"],
                summary=summary,
            )
        )
    return results


@router.get("/samples/{sample_id}/raw")
async def get_sample_raw(sample_id: str) -> dict:
    """Return the raw text of a bundled sample HL7v2 message."""
    filename = f"{sample_id}.hl7"
    file_path = SAMPLE_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found.")
    raw = file_path.read_text(encoding="utf-8")
    return {"raw": raw, "filename": filename}


@router.post("/parse", response_model=HL7ParseResponse)
async def parse_hl7(request: HL7ParseRequest) -> HL7ParseResponse:
    """Parse a raw HL7v2 message and return a structured representation."""
    if not request.raw.strip():
        raise HTTPException(status_code=400, detail="Empty HL7 message.")
    try:
        parsed = hl7_parser.parse_message(request.raw)
        return HL7ParseResponse(**parsed)
    except Exception as exc:
        logger.error("HL7 parse error: %s", exc)
        raise HTTPException(status_code=422, detail=f"Failed to parse HL7 message: {exc}")


@router.post("/transform", response_model=HL7TransformResponse)
async def transform_hl7(request: HL7TransformRequest) -> HL7TransformResponse:
    """Parse an HL7v2 message and transform it into a FHIR R4 transaction Bundle."""
    if not request.raw.strip():
        raise HTTPException(status_code=400, detail="Empty HL7 message.")
    try:
        parsed = hl7_parser.parse_message(request.raw)
        fhir_bundle = hl7_to_fhir_transformer.transform(parsed)
        return HL7TransformResponse(parsed=parsed, fhirBundle=fhir_bundle)
    except Exception as exc:
        logger.error("HL7 transform error: %s", exc)
        raise HTTPException(status_code=422, detail=f"Failed to transform HL7 message: {exc}")


@router.post("/explain", response_model=HL7ExplainResponse)
async def explain_hl7(request: HL7ExplainRequest) -> HL7ExplainResponse:
    """Use AI to produce a plain-English explanation of an HL7v2 message."""
    if not request.raw.strip():
        raise HTTPException(status_code=400, detail="Empty HL7 message.")
    try:
        parsed = hl7_parser.parse_message(request.raw)
        explanation = await ai_service.explain_hl7_message(request.raw, parsed)
        return HL7ExplainResponse(explanation=explanation)
    except Exception as exc:
        logger.error("HL7 explain error: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")
