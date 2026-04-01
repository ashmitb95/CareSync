import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.models.schemas import CareGap

logger = logging.getLogger(__name__)

_NOW = lambda: datetime.now(tz=timezone.utc)  # noqa: E731


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse an ISO-8601 date or datetime string."""
    if not date_str:
        return None
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str[:19], fmt[:len(fmt)])
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def _has_condition_code(conditions: list[dict], snomed_code: str) -> bool:
    """Check if any condition has a matching SNOMED code."""
    for cond in conditions:
        for coding in cond.get("code", {}).get("coding", []):
            if coding.get("code") == snomed_code:
                return True
    return False


def _latest_observation_date(observations: list[dict], loinc_code: str) -> Optional[datetime]:
    """Find the most recent observation date matching a LOINC code."""
    latest: Optional[datetime] = None
    for obs in observations:
        for coding in obs.get("code", {}).get("coding", []):
            if coding.get("code") == loinc_code:
                date_str = obs.get("effectiveDateTime") or obs.get("issued")
                dt = _parse_date(date_str)
                if dt and (latest is None or dt > latest):
                    latest = dt
    return latest


def _latest_encounter_date(encounters: list[dict]) -> Optional[datetime]:
    """Find the most recent encounter date."""
    latest: Optional[datetime] = None
    for enc in encounters:
        period = enc.get("period", {})
        date_str = period.get("start") or period.get("end")
        dt = _parse_date(date_str)
        if dt and (latest is None or dt > latest):
            latest = dt
    return latest


class CareGapEngine:
    """
    Clinical rule engine that evaluates care gaps for a single patient
    based on their FHIR data (conditions, observations, encounters, medications).
    """

    # Rule definitions: (gap_type, title, description, recommendation, severity, interval_days)
    RULES = [
        {
            "gap_type": "hba1c_monitoring",
            "title": "HbA1c Monitoring Overdue",
            "description": "Diabetic patients require HbA1c monitoring every 180 days.",
            "recommendation": "Order HbA1c (LOINC 4548-4) lab test within the next 30 days.",
            "severity": "high",
            "condition_snomed": "44054006",   # Diabetes mellitus
            "loinc_code": "4548-4",
            "interval_days": 180,
        },
        {
            "gap_type": "bp_monitoring",
            "title": "Blood Pressure Monitoring Overdue",
            "description": "Hypertensive patients require blood pressure measurement every 90 days.",
            "recommendation": "Schedule blood pressure check (LOINC 85354-9) within 30 days.",
            "severity": "high",
            "condition_snomed": "38341003",   # Hypertensive disorder
            "loinc_code": "85354-9",
            "interval_days": 90,
        },
        {
            "gap_type": "lipid_panel",
            "title": "Lipid Panel Overdue",
            "description": "Patients with coronary artery disease require a lipid panel annually.",
            "recommendation": "Order lipid panel (LOINC 57698-3) within the next 60 days.",
            "severity": "medium",
            "condition_snomed": "53741008",   # Coronary arteriosclerosis
            "loinc_code": "57698-3",
            "interval_days": 365,
        },
    ]

    def evaluate_patient(
        self,
        patient_id: str,
        conditions: list[dict[str, Any]],
        observations: list[dict[str, Any]],
        encounters: list[dict[str, Any]],
        medications: list[dict[str, Any]],
    ) -> list[CareGap]:
        gaps: list[CareGap] = []
        now = _NOW()

        # ── Rule 1-3: condition-based observation monitoring ──────────────────
        for rule in self.RULES:
            if _has_condition_code(conditions, rule["condition_snomed"]):
                last_date = _latest_observation_date(observations, rule["loinc_code"])
                if last_date is None:
                    # Never measured
                    gaps.append(CareGap(
                        id=str(uuid.uuid4()),
                        patient_id=patient_id,
                        gap_type=rule["gap_type"],
                        title=rule["title"],
                        description=rule["description"] + " No prior measurement found.",
                        severity=rule["severity"],
                        due_date=(now + timedelta(days=30)).date().isoformat(),
                        last_performed=None,
                        recommendation=rule["recommendation"],
                    ))
                else:
                    days_since = (now - last_date).days
                    if days_since > rule["interval_days"]:
                        gaps.append(CareGap(
                            id=str(uuid.uuid4()),
                            patient_id=patient_id,
                            gap_type=rule["gap_type"],
                            title=rule["title"],
                            description=(
                                f"{rule['description']} Last performed {days_since} days ago "
                                f"(threshold: {rule['interval_days']} days)."
                            ),
                            severity=rule["severity"],
                            due_date=(now + timedelta(days=14)).date().isoformat(),
                            last_performed=last_date.date().isoformat(),
                            recommendation=rule["recommendation"],
                        ))

        # ── Rule 4: Annual wellness visit ─────────────────────────────────────
        last_enc = _latest_encounter_date(encounters)
        if last_enc is None:
            gaps.append(CareGap(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                gap_type="annual_wellness",
                title="Annual Wellness Visit Overdue",
                description="No encounters found in the system. Patient may need an annual wellness visit.",
                severity="low",
                due_date=(now + timedelta(days=90)).date().isoformat(),
                last_performed=None,
                recommendation="Schedule an annual wellness visit with primary care provider.",
            ))
        else:
            days_since_enc = (now - last_enc).days
            if days_since_enc > 365:
                gaps.append(CareGap(
                    id=str(uuid.uuid4()),
                    patient_id=patient_id,
                    gap_type="annual_wellness",
                    title="Annual Wellness Visit Overdue",
                    description=(
                        f"Last encounter was {days_since_enc} days ago. "
                        "Annual wellness visit recommended."
                    ),
                    severity="low",
                    due_date=(now + timedelta(days=60)).date().isoformat(),
                    last_performed=last_enc.date().isoformat(),
                    recommendation="Schedule an annual wellness visit with primary care provider.",
                ))

        # ── Rule 5: Polypharmacy medication review ────────────────────────────
        active_meds = [
            m for m in medications
            if m.get("status") in ("active", "on-hold", None)
        ]
        if len(active_meds) >= 5:
            # Look for a recent medication review observation
            last_review = _latest_observation_date(observations, "18776-5")  # LOINC for medication management
            if last_review is None:
                gaps.append(CareGap(
                    id=str(uuid.uuid4()),
                    patient_id=patient_id,
                    gap_type="medication_review",
                    title="Medication Review Needed",
                    description=(
                        f"Patient is on {len(active_meds)} active medications. "
                        "A comprehensive medication review is overdue."
                    ),
                    severity="medium",
                    due_date=(now + timedelta(days=30)).date().isoformat(),
                    last_performed=None,
                    recommendation=(
                        "Schedule a comprehensive medication review with clinical pharmacist "
                        "or primary care provider to assess for interactions and appropriateness."
                    ),
                ))
            else:
                days_since_review = (now - last_review).days
                if days_since_review > 180:
                    gaps.append(CareGap(
                        id=str(uuid.uuid4()),
                        patient_id=patient_id,
                        gap_type="medication_review",
                        title="Medication Review Needed",
                        description=(
                            f"Patient is on {len(active_meds)} active medications. "
                            f"Last medication review was {days_since_review} days ago."
                        ),
                        severity="medium",
                        due_date=(now + timedelta(days=30)).date().isoformat(),
                        last_performed=last_review.date().isoformat(),
                        recommendation=(
                            "Schedule a comprehensive medication review with clinical pharmacist "
                            "or primary care provider."
                        ),
                    ))

        return gaps


# Singleton
care_gap_engine = CareGapEngine()
