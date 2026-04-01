import json
import logging
from typing import Any
from app.config import get_settings
from app.models.schemas import DrugInteraction

logger = logging.getLogger(__name__)

settings = get_settings()

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2048


def _get_client():
    """Lazily create Anthropic client so missing API key doesn't crash on import."""
    try:
        import anthropic
        return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except ImportError:
        raise RuntimeError("anthropic package is not installed")


def _extract_text(response: Any) -> str:
    """Pull text content out of an Anthropic message response."""
    for block in response.content:
        if block.type == "text":
            return block.text.strip()
    return ""


class AIService:
    """Wraps Claude API calls for clinical intelligence features."""

    async def summarize_patient(self, fhir_bundle: dict[str, Any]) -> str:
        """
        Generate a clinical handoff summary from a FHIR bundle.
        Returns a plain-text summary suitable for a clinical handoff note.
        """
        bundle_text = json.dumps(fhir_bundle, indent=2)[:8000]  # truncate for token safety

        prompt = (
            "You are a clinical documentation specialist. "
            "Given the following FHIR R4 patient bundle, write a concise clinical handoff summary. "
            "Include: patient demographics, active conditions, current medications, recent encounters, "
            "relevant lab results, allergies, and any care gaps or concerns. "
            "Use clinical language appropriate for physician-to-physician handoffs. "
            "Format with clear sections. Do not fabricate clinical information not present in the data.\n\n"
            f"FHIR Bundle:\n{bundle_text}"
        )

        client = _get_client()
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        return _extract_text(response)

    async def natural_language_to_fhir(self, query: str) -> dict[str, Any]:
        """
        Convert a natural language query into a FHIR search URL and explanation.
        Returns {fhir_url: str, explanation: str}.
        """
        base_url = settings.HAPI_FHIR_BASE_URL

        prompt = (
            "You are a FHIR R4 query expert. Convert the following natural language clinical query "
            "into a valid FHIR R4 REST search URL. "
            f"Base URL: {base_url}\n\n"
            "Respond ONLY with a JSON object in this exact format (no markdown, no explanation outside JSON):\n"
            '{"fhir_url": "<full URL with query params>", "explanation": "<1-2 sentences explaining the query>"}\n\n'
            f"Query: {query}"
        )

        client = _get_client()
        response = client.messages.create(
            model=MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        text = _extract_text(response)

        # Strip markdown code fences if present
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if len(lines) > 2 else text

        try:
            data = json.loads(text)
            return {
                "fhir_url": data.get("fhir_url", ""),
                "explanation": data.get("explanation", ""),
            }
        except json.JSONDecodeError:
            logger.warning("AI returned non-JSON for NL query: %s", text[:200])
            return {
                "fhir_url": f"{base_url}/Patient",
                "explanation": text[:500],
            }

    async def explain_hl7_message(self, raw: str, parsed: dict[str, Any]) -> str:
        """
        Produce a plain-English explanation of an HL7v2 message.
        """
        parsed_text = json.dumps(parsed, indent=2)[:4000]

        prompt = (
            "You are a healthcare interoperability expert. "
            "Explain the following HL7v2 message in plain English suitable for a non-technical clinician. "
            "Describe what event occurred, who is involved, and what action (if any) is required. "
            "Be concise (3-5 sentences).\n\n"
            f"Raw HL7v2 message:\n{raw[:2000]}\n\n"
            f"Parsed segments:\n{parsed_text}"
        )

        client = _get_client()
        response = client.messages.create(
            model=MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return _extract_text(response)

    async def check_drug_interactions(
        self, medications: list[dict[str, Any]]
    ) -> list[DrugInteraction]:
        """
        Identify potential drug-drug interactions from a list of MedicationRequest resources.
        Returns a list of DrugInteraction objects.
        """
        if len(medications) < 2:
            return []

        # Extract medication names
        med_names: list[str] = []
        for med in medications:
            name = ""
            # Try medicationCodeableConcept
            cc = med.get("medicationCodeableConcept", {})
            if cc:
                name = cc.get("text") or (
                    cc.get("coding", [{}])[0].get("display", "")
                )
            # Try medicationReference display
            if not name:
                ref = med.get("medicationReference", {})
                name = ref.get("display", "")
            # Fallback: use id
            if not name:
                name = med.get("id", "unknown")
            med_names.append(name)

        if len(med_names) < 2:
            return []

        med_list_text = "\n".join(f"- {m}" for m in med_names)

        prompt = (
            "You are a clinical pharmacist. Review the following list of medications and identify "
            "potential drug-drug interactions. For each interaction, provide the severity and a brief "
            "clinical description.\n\n"
            "Medications:\n"
            f"{med_list_text}\n\n"
            "Respond ONLY with a JSON array (no markdown). Each element must have: "
            '"drug1", "drug2", "severity" (major/moderate/minor), "description". '
            "If no interactions are found, return an empty array []."
        )

        client = _get_client()
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        text = _extract_text(response)

        # Strip markdown code fences
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if len(lines) > 2 else text

        try:
            raw_list = json.loads(text)
            if not isinstance(raw_list, list):
                return []
            return [
                DrugInteraction(
                    drug1=item.get("drug1", ""),
                    drug2=item.get("drug2", ""),
                    severity=item.get("severity", "minor"),
                    description=item.get("description", ""),
                )
                for item in raw_list
                if isinstance(item, dict)
            ]
        except json.JSONDecodeError:
            logger.warning("AI returned non-JSON for drug interactions: %s", text[:200])
            return []


# Singleton
ai_service = AIService()
