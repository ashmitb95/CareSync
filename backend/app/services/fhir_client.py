import httpx
import logging
from typing import Any, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Simple in-process cache: cache_key → response dict
_cache: dict[str, Any] = {}


def _parse_entries(bundle: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract resource objects from a FHIR Bundle's entry array."""
    return [entry["resource"] for entry in bundle.get("entry", []) if "resource" in entry]


def _next_link(bundle: dict[str, Any]) -> Optional[str]:
    """Return the 'next' relation URL from Bundle.link, if present."""
    for link in bundle.get("link", []):
        if link.get("relation") == "next":
            return link.get("url")
    return None


class FHIRClient:
    BASE_URL: str = settings.HAPI_FHIR_BASE_URL

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=30.0,
                headers={"Accept": "application/fhir+json"},
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _get(self, path: str, params: Optional[dict] = None) -> dict[str, Any]:
        cache_key = f"{path}?{params}"
        if cache_key in _cache:
            logger.debug("Cache hit: %s", cache_key)
            return _cache[cache_key]

        client = await self._get_client()
        try:
            resp = await client.get(path, params=params)
            resp.raise_for_status()
            data = resp.json()
            _cache[cache_key] = data
            return data
        except httpx.HTTPStatusError as exc:
            logger.error("FHIR HTTP error %s for %s: %s", exc.response.status_code, path, exc)
            raise
        except httpx.RequestError as exc:
            logger.error("FHIR request error for %s: %s", path, exc)
            raise

    async def search_patients(
        self,
        count: int = 20,
        name: Optional[str] = None,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int, Optional[str]]:
        params: dict[str, Any] = {"_count": count, "_getpagesoffset": offset}
        if name:
            params["name"] = name
        bundle = await self._get("/Patient", params=params)
        resources = _parse_entries(bundle)
        total = bundle.get("total", len(resources))
        next_url = _next_link(bundle)
        return resources, total, next_url

    async def get_patient(self, patient_id: str) -> dict[str, Any]:
        return await self._get(f"/Patient/{patient_id}")

    async def get_conditions(self, patient_id: str) -> list[dict[str, Any]]:
        bundle = await self._get("/Condition", params={"patient": patient_id, "_count": 100})
        return _parse_entries(bundle)

    async def get_observations(
        self,
        patient_id: str,
        code: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"patient": patient_id, "_count": 100, "_sort": "-date"}
        if code:
            params["code"] = code
        bundle = await self._get("/Observation", params=params)
        return _parse_entries(bundle)

    async def get_medications(self, patient_id: str) -> list[dict[str, Any]]:
        bundle = await self._get(
            "/MedicationRequest",
            params={"patient": patient_id, "_count": 100},
        )
        return _parse_entries(bundle)

    async def get_encounters(self, patient_id: str) -> list[dict[str, Any]]:
        bundle = await self._get(
            "/Encounter",
            params={"patient": patient_id, "_count": 100, "_sort": "-date"},
        )
        return _parse_entries(bundle)

    async def get_allergies(self, patient_id: str) -> list[dict[str, Any]]:
        bundle = await self._get(
            "/AllergyIntolerance",
            params={"patient": patient_id, "_count": 100},
        )
        return _parse_entries(bundle)

    async def get_patient_everything(self, patient_id: str) -> dict[str, Any]:
        """Fetch $everything operation for the given patient."""
        return await self._get(f"/Patient/{patient_id}/$everything", params={"_count": 500})


# Singleton
fhir_client = FHIRClient()
