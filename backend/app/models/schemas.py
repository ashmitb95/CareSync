from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime


# ── FHIR ────────────────────────────────────────────────────────────────────

class PatientListResponse(BaseModel):
    patients: list[dict[str, Any]]
    total: int
    nextUrl: Optional[str] = None


class TimelineEvent(BaseModel):
    id: str
    date: Optional[str] = None
    type: str  # e.g. "Condition", "Observation", "Encounter", "MedicationRequest"
    summary: str
    resource: dict[str, Any]


class TimelineResponse(BaseModel):
    events: list[TimelineEvent]


# ── HL7 ─────────────────────────────────────────────────────────────────────

class HL7ParseRequest(BaseModel):
    raw: str = Field(..., description="Raw HL7v2 message text")


class HL7ParseResponse(BaseModel):
    message_type: str
    timestamp: Optional[str] = None
    segments: dict[str, Any]
    segment_list: list[dict[str, Any]]
    summary: str


class HL7TransformRequest(BaseModel):
    raw: str = Field(..., description="Raw HL7v2 message text")


class HL7TransformResponse(BaseModel):
    parsed: dict[str, Any]
    fhirBundle: dict[str, Any]


class HL7ExplainRequest(BaseModel):
    raw: str = Field(..., description="Raw HL7v2 message text")


class HL7ExplainResponse(BaseModel):
    explanation: str


class SampleMessageMeta(BaseModel):
    id: str
    filename: str
    message_type: str
    description: str
    summary: str


# ── AI ──────────────────────────────────────────────────────────────────────

class SummaryResponse(BaseModel):
    summary: str


class NLQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language FHIR query")


class NLQueryResponse(BaseModel):
    fhirUrl: str
    explanation: str
    patients: list[dict[str, Any]] = []


class DrugInteraction(BaseModel):
    drug1: str
    drug2: str
    severity: str  # "major" | "moderate" | "minor"
    description: str


class DrugInteractionResponse(BaseModel):
    interactions: list[DrugInteraction]


# ── Care Gaps ────────────────────────────────────────────────────────────────

class CareGap(BaseModel):
    id: str
    patient_id: str
    gap_type: str
    title: str
    description: str
    severity: str  # "high" | "medium" | "low"
    due_date: Optional[str] = None
    last_performed: Optional[str] = None
    recommendation: str


class CareGapListResponse(BaseModel):
    gaps: list[CareGap]
    total: int


class PopulationGapStats(BaseModel):
    totalPatients: int
    totalGaps: int
    gapsByType: dict[str, int]
    gapsBySeverity: dict[str, int]
    patientsWithMostGaps: list[dict[str, Any]]
