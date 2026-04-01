# CareSync — Patient Intelligence Platform

## Technical Plan & Implementation Guide

---

## 1. Project Overview

**CareSync** is a full-stack healthcare intelligence platform that demonstrates working knowledge of EMR/EHR concepts, FHIR R4 API integration, HL7v2 message parsing, and AI-powered clinical reasoning — all in one deployable application.

**Target audience**: Portfolio piece for health-tech engineering roles (specifically: RhythmX AI and similar).

**Core thesis**: A single app where every screen maps to a healthcare data standard in action.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14)                    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Patient   │  │ Patient  │  │ Care Gap │  │ HL7v2       │ │
│  │ Roster    │  │ Timeline │  │ Alerts   │  │ Inspector   │ │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│        │            │              │                │        │
│  ┌─────┴────────────┴──────────────┴────────────────┴─────┐ │
│  │              API Client Layer (fetch / SWR)             │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                 │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ /api/fhir/* │  │ /api/hl7/*   │  │ /api/ai/*           │ │
│  │             │  │              │  │                     │ │
│  │ FHIR Proxy  │  │ HL7v2 Parser │  │ LLM Clinical Engine │ │
│  │ + Query     │  │ + Transformer│  │ + NL→FHIR Query     │ │
│  │   Builder   │  │              │  │ + Summarizer        │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                      │            │
│  ┌──────┴────────────────┴──────────────────────┴──────────┐ │
│  │                  Service Layer                           │ │
│  │  FHIRClient │ HL7Parser │ CareGapEngine │ AIService     │ │
│  └──────┬────────────┬──────────────┬───────────┬──────────┘ │
│         │            │              │           │            │
│  ┌──────┴────────────┴──────────────┴───────────┴──────────┐ │
│  │                  Data Layer                              │ │
│  │  PostgreSQL (patient cache + parsed records + HL7 logs)  │ │
│  └─────────────────────────┬───────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
               ┌──────────────────────────┐
               │   External Services       │
               │                          │
               │  • HAPI FHIR R4 Server   │
               │    (hapi.fhir.org/baseR4)│
               │                          │
               │  • Anthropic Claude API   │
               │    (clinical reasoning)   │
               │                          │
               │  • OpenFDA API (optional) │
               │    (drug interactions)    │
               └──────────────────────────┘
```

---

## 3. Tech Stack

| Layer       | Technology                       | Why                                           |
| ----------- | -------------------------------- | --------------------------------------------- |
| Frontend    | Next.js 14 (App Router)          | You already know it; SSR for SEO on portfolio |
| UI          | Tailwind CSS + shadcn/ui         | Fast, consistent, professional                |
| Charts      | Recharts                         | Timeline + analytics visualizations           |
| State       | SWR or TanStack Query            | Cache FHIR responses, background revalidation |
| Backend     | FastAPI (Python)                 | **Mandatory Python per job listing**          |
| FHIR Client | `fhirpy` or `fhir.resources`     | Typed FHIR R4 resource models in Python       |
| HL7 Parser  | `python-hl7`                     | Parse HL7v2 pipe-delimited messages           |
| Database    | PostgreSQL + SQLAlchemy          | Store parsed/cached patient data              |
| AI          | Anthropic Claude API             | Clinical summarization + NL→FHIR translation  |
| Deployment  | Docker Compose (local) / Railway | One-command spin-up for demos                 |

---

## 4. Data Sources (All Free, No Auth)

### 4.1 HAPI FHIR R4 Public Server

- **Base URL**: `https://hapi.fhir.org/baseR4`
- **Auth**: None required
- **Data**: Pre-loaded synthetic patients, conditions, observations, medications, encounters
- **Rate limits**: Generous for dev use; add caching layer regardless

**Key endpoints you’ll use**:

```
GET /Patient?_count=50                          # Patient roster
GET /Patient/{id}/$everything                   # Full patient bundle
GET /Condition?patient={id}                     # Patient conditions
GET /Observation?patient={id}&category=laboratory  # Lab results
GET /MedicationRequest?patient={id}&status=active  # Active meds
GET /Encounter?patient={id}&_sort=-date         # Encounters by date
GET /AllergyIntolerance?patient={id}            # Allergies
```

### 4.2 HL7v2 Sample Messages

No server needed. Bundle sample messages in your repo:

```
# Example ADT^A01 (Patient Admission)
MSH|^~\&|EPIC|MHC|LABADT|DH|20230901080000||ADT^A01|MSG00001|P|2.4
EVN|A01|20230901080000
PID|1||123456789^^^MHC^MR||DOE^JOHN^A||19850115|M|||123 MAIN ST^^COLUMBUS^OH^43215||6145551234
NK1|1|DOE^JANE^B|SPO|123 MAIN ST^^COLUMBUS^OH^43215|6145555678
PV1|1|I|W^389^1^UAMC^^^^3||||12345^SMITH^JOHN^M^MD|67890^JOHNSON^SARAH^L^MD||SUR||||ADM|A0|
```

Include at least 5 message types:

- `ADT^A01` — Patient admission
- `ADT^A03` — Patient discharge
- `ORM^O01` — Order message
- `ORU^R01` — Observation result (lab report)
- `SIU^S12` — Schedule information

### 4.3 OpenFDA Drug API (Optional Enhancement)

- **Base URL**: `https://api.fda.gov/drug/interaction.json`
- **Auth**: None (or free API key for higher rate limits)
- **Use**: Cross-reference active medications for interaction alerts

---

## 5. Database Schema

```sql
-- Cached FHIR resources (avoid hammering HAPI server)
CREATE TABLE fhir_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type   VARCHAR(64) NOT NULL,       -- 'Patient', 'Condition', etc.
    resource_id     VARCHAR(128) NOT NULL,       -- FHIR resource ID
    fhir_json       JSONB NOT NULL,              -- Raw FHIR R4 JSON
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,                 -- TTL for cache invalidation
    UNIQUE(resource_type, resource_id)
);

CREATE INDEX idx_fhir_cache_type ON fhir_cache(resource_type);
CREATE INDEX idx_fhir_cache_expires ON fhir_cache(expires_at);

-- Parsed HL7v2 message log
CREATE TABLE hl7_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_message     TEXT NOT NULL,                -- Original HL7v2 pipe-delimited
    message_type    VARCHAR(16) NOT NULL,         -- 'ADT^A01', 'ORU^R01', etc.
    parsed_json     JSONB NOT NULL,               -- Structured parsed output
    fhir_bundle     JSONB,                        -- Transformed FHIR R4 equivalent
    ai_explanation  TEXT,                          -- LLM plain-English explanation
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Care gap alerts (computed)
CREATE TABLE care_gaps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      VARCHAR(128) NOT NULL,        -- FHIR Patient ID
    gap_type        VARCHAR(64) NOT NULL,         -- 'missing_hba1c', 'overdue_screening'
    description     TEXT NOT NULL,
    severity        VARCHAR(16) DEFAULT 'medium', -- 'low', 'medium', 'high'
    condition_code  VARCHAR(32),                  -- SNOMED/ICD code that triggered it
    last_checked    TIMESTAMPTZ DEFAULT NOW(),
    resolved        BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_care_gaps_patient ON care_gaps(patient_id);

-- AI query log (for the NL→FHIR feature)
CREATE TABLE ai_query_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    natural_query   TEXT NOT NULL,                -- "diabetic patients over 60"
    fhir_query      TEXT NOT NULL,                -- Generated FHIR search URL
    result_count    INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Backend — Module Breakdown

### 6.1 Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app + CORS + lifespan
│   ├── config.py                  # Settings (HAPI URL, DB URL, Claude API key)
│   ├── database.py                # SQLAlchemy engine + session
│   │
│   ├── routers/
│   │   ├── fhir.py                # /api/fhir/* — proxy + query endpoints
│   │   ├── hl7.py                 # /api/hl7/*  — parse + transform endpoints
│   │   ├── ai.py                  # /api/ai/*   — summarize + NL query endpoints
│   │   └── care_gaps.py           # /api/care-gaps/* — gap detection endpoints
│   │
│   ├── services/
│   │   ├── fhir_client.py         # HAPI FHIR HTTP client + caching logic
│   │   ├── hl7_parser.py          # HL7v2 parsing + segment extraction
│   │   ├── hl7_to_fhir.py         # HL7v2 → FHIR R4 resource mapper
│   │   ├── care_gap_engine.py     # Clinical rule engine
│   │   ├── drug_interaction.py    # OpenFDA integration (optional)
│   │   └── ai_service.py          # Claude API: summarize, NL→FHIR, explain
│   │
│   ├── models/
│   │   ├── schemas.py             # Pydantic request/response models
│   │   └── db_models.py           # SQLAlchemy ORM models
│   │
│   └── data/
│       └── sample_hl7/            # Bundled HL7v2 sample messages
│           ├── adt_a01.hl7
│           ├── adt_a03.hl7
│           ├── orm_o01.hl7
│           ├── oru_r01.hl7
│           └── siu_s12.hl7
│
├── requirements.txt
├── Dockerfile
└── alembic/                       # DB migrations
```

### 6.2 Core Service: FHIR Client (`fhir_client.py`)

**Responsibilities**:

- HTTP client wrapping HAPI FHIR R4 base URL
- Cache-first reads: check `fhir_cache` table before hitting HAPI
- Build complex FHIR search URLs from structured params
- Parse FHIR Bundles into individual resources
- Handle pagination (`Bundle.link.next`)

**Key methods**:

```python
class FHIRClient:
    BASE_URL = "https://hapi.fhir.org/baseR4"

    async def get_patient(self, patient_id: str) -> dict
    async def search_patients(self, params: dict) -> list[dict]
    async def get_patient_everything(self, patient_id: str) -> dict  # $everything
    async def get_conditions(self, patient_id: str) -> list[dict]
    async def get_observations(self, patient_id: str, category: str = None) -> list[dict]
    async def get_medications(self, patient_id: str, status: str = "active") -> list[dict]
    async def get_encounters(self, patient_id: str) -> list[dict]
    async def get_allergies(self, patient_id: str) -> list[dict]
    async def execute_raw_query(self, fhir_search_url: str) -> dict  # For NL→FHIR

    # Caching
    async def _cached_get(self, resource_type: str, resource_id: str) -> dict | None
    async def _cache_put(self, resource_type: str, resource_id: str, data: dict) -> None
```

### 6.3 Core Service: HL7 Parser (`hl7_parser.py`)

**Responsibilities**:

- Parse raw HL7v2 pipe-delimited messages into structured dicts
- Extract key segments: MSH, PID, PV1, OBX, ORC, NK1, EVN
- Decode HL7 data types (CX, XPN, XAD, CE, TS)

**Key methods**:

```python
class HL7Parser:
    def parse_message(self, raw: str) -> dict
    # Returns:
    # {
    #   "message_type": "ADT^A01",
    #   "timestamp": "2023-09-01T08:00:00",
    #   "segments": {
    #     "MSH": { "sending_app": "EPIC", "message_type": "ADT^A01", ... },
    #     "PID": { "patient_id": "123456789", "name": "DOE^JOHN^A", "dob": "1985-01-15", ... },
    #     "PV1": { "patient_class": "I", "attending_doctor": "SMITH^JOHN^M", ... }
    #   },
    #   "segment_list": ["MSH", "EVN", "PID", "NK1", "PV1"]
    # }

    def extract_segment(self, parsed: dict, segment_name: str) -> dict | None
    def get_patient_name(self, pid_segment: dict) -> str  # "John A. Doe"
    def get_message_summary(self, parsed: dict) -> str     # One-line human summary
```

### 6.4 Core Service: HL7→FHIR Transformer (`hl7_to_fhir.py`)

**Responsibilities**:

- Map HL7v2 segments to FHIR R4 resources
- Produce a valid FHIR Bundle (type: “transaction”)

**Mapping rules**:

```
HL7v2 Segment  →  FHIR Resource
─────────────────────────────────
PID            →  Patient
PV1            →  Encounter
OBX            →  Observation
ORC + RXE      →  MedicationRequest
DG1            →  Condition
NK1            →  RelatedPerson
AL1            →  AllergyIntolerance
IN1            →  Coverage
SCH            →  Appointment
```

**Key method**:

```python
class HL7ToFHIRTransformer:
    def transform(self, parsed_hl7: dict) -> dict:
        """
        Takes a parsed HL7v2 dict and returns a FHIR R4 Bundle.
        {
          "resourceType": "Bundle",
          "type": "transaction",
          "entry": [
            { "resource": { "resourceType": "Patient", ... } },
            { "resource": { "resourceType": "Encounter", ... } },
            ...
          ]
        }
        """
```

### 6.5 Core Service: Care Gap Engine (`care_gap_engine.py`)

**Responsibilities**:

- Run clinical rules against a patient’s FHIR data
- Flag missing/overdue screenings, labs, follow-ups

**Rules to implement** (start with these — all are standard preventive care gaps):

```python
CARE_GAP_RULES = [
    {
        "id": "hba1c_monitoring",
        "name": "HbA1c Monitoring for Diabetics",
        "description": "Diabetic patients should have HbA1c checked every 3-6 months",
        "condition_codes": ["44054006"],  # SNOMED: Type 2 diabetes
        "required_observation": "4548-4",  # LOINC: HbA1c
        "max_days_since_last": 180,
        "severity": "high"
    },
    {
        "id": "bp_monitoring_hypertension",
        "name": "Blood Pressure Monitoring for Hypertensives",
        "condition_codes": ["38341003"],  # SNOMED: Hypertension
        "required_observation": "85354-9",  # LOINC: Blood pressure panel
        "max_days_since_last": 90,
        "severity": "high"
    },
    {
        "id": "lipid_panel_cardiovascular",
        "name": "Lipid Panel for Cardiovascular Risk",
        "condition_codes": ["53741008"],  # SNOMED: Coronary artery disease
        "required_observation": "57698-3",  # LOINC: Lipid panel
        "max_days_since_last": 365,
        "severity": "medium"
    },
    {
        "id": "annual_wellness_visit",
        "name": "Annual Wellness Visit",
        "description": "All patients should have at least one encounter per year",
        "condition_codes": [],  # Applies to all
        "required_encounter": True,
        "max_days_since_last": 365,
        "severity": "low"
    },
    {
        "id": "medication_review",
        "name": "Medication Review (5+ Active Meds)",
        "description": "Patients on 5+ active medications should have a medication review",
        "min_active_medications": 5,
        "max_days_since_last": 180,
        "severity": "medium"
    }
]
```

**Key method**:

```python
class CareGapEngine:
    async def evaluate_patient(self, patient_id: str) -> list[CareGap]:
        """
        1. Fetch patient conditions via FHIRClient
        2. For each applicable rule, check if required observation/encounter exists within window
        3. Return list of CareGap objects for unmet rules
        """

    async def evaluate_population(self, patient_ids: list[str]) -> dict[str, list[CareGap]]:
        """Batch evaluation for roster view"""
```

### 6.6 Core Service: AI Service (`ai_service.py`)

**Responsibilities**:

- Clinical summarization (patient history → plain English)
- Natural language → FHIR search query translation
- HL7v2 message explanation
- Drug interaction narrative

**Key methods**:

```python
class AIService:
    async def summarize_patient(self, fhir_bundle: dict) -> str:
        """
        System prompt: "You are a clinical informaticist. Given a FHIR Bundle
        containing a patient's records, produce a concise clinical summary
        suitable for a physician handoff. Include: demographics, active conditions,
        current medications, recent labs (with trends), recent encounters,
        and any notable alerts. Use standard medical terminology."
        """

    async def natural_language_to_fhir(self, query: str) -> dict:
        """
        System prompt: "You are a FHIR search query translator. Convert the
        natural language clinical query into a valid FHIR R4 search URL.
        Available resource types: Patient, Condition, Observation,
        MedicationRequest, Encounter, AllergyIntolerance.
        Respond with JSON: { 'fhir_url': '...', 'explanation': '...' }"

        Example:
        Input:  "diabetic patients with no HbA1c in 90 days"
        Output: {
            "fhir_url": "/Condition?code=44054006&_include=Condition:patient",
            "explanation": "First fetching all diabetes conditions, then for each
                           patient, checking Observation for LOINC 4548-4 within 90 days",
            "requires_post_processing": true,
            "post_processing_note": "Need to cross-reference with Observation dates"
        }
        """

    async def explain_hl7_message(self, raw_message: str, parsed: dict) -> str:
        """
        System prompt: "You are a healthcare integration engineer. Explain this
        HL7v2 message in plain English. For each segment, explain what it means
        clinically. Highlight any notable clinical information."
        """

    async def check_drug_interactions(self, medications: list[dict]) -> str:
        """
        System prompt: "You are a clinical pharmacist. Given these active
        medications (from FHIR MedicationRequest resources), identify potential
        drug-drug interactions, contraindications, and dosing concerns.
        Flag severity: minor, moderate, major."
        """
```

---

## 7. API Endpoints

### 7.1 FHIR Proxy + Query (`/api/fhir`)

```
GET  /api/fhir/patients                     # Paginated patient roster
GET  /api/fhir/patients/{id}                # Single patient
GET  /api/fhir/patients/{id}/everything     # Full patient bundle ($everything)
GET  /api/fhir/patients/{id}/conditions     # Patient conditions
GET  /api/fhir/patients/{id}/observations   # Patient observations (labs, vitals)
GET  /api/fhir/patients/{id}/medications    # Active medications
GET  /api/fhir/patients/{id}/encounters     # Encounter history
GET  /api/fhir/patients/{id}/allergies      # Allergy intolerances
GET  /api/fhir/patients/{id}/timeline       # Aggregated timeline (all resources, sorted by date)
POST /api/fhir/query                        # Execute raw FHIR search URL
```

### 7.2 HL7v2 (`/api/hl7`)

```
POST /api/hl7/parse                         # Parse raw HL7v2 → structured JSON
POST /api/hl7/transform                     # Parse + transform to FHIR R4 Bundle
GET  /api/hl7/samples                       # List available sample messages
GET  /api/hl7/samples/{message_type}        # Get a sample message by type
GET  /api/hl7/history                       # Previously parsed messages
```

### 7.3 AI (`/api/ai`)

```
POST /api/ai/summarize/{patient_id}         # Clinical summary for a patient
POST /api/ai/query                          # NL → FHIR search + execute
POST /api/ai/explain-hl7                    # Explain an HL7v2 message in plain English
POST /api/ai/drug-interactions/{patient_id} # Check drug interactions for patient's active meds
```

### 7.4 Care Gaps (`/api/care-gaps`)

```
GET  /api/care-gaps/{patient_id}            # Care gaps for a specific patient
POST /api/care-gaps/evaluate/{patient_id}   # Run evaluation (fresh)
GET  /api/care-gaps/population              # Aggregate gap stats across cached patients
GET  /api/care-gaps/rules                   # List all care gap rules
```

---

## 8. Frontend — Page Breakdown

### 8.1 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                 # Root layout + nav sidebar
│   ├── page.tsx                   # Dashboard / landing → redirects to /patients
│   │
│   ├── patients/
│   │   ├── page.tsx               # Patient Roster (table + search + filters)
│   │   └── [id]/
│   │       ├── page.tsx           # Patient Detail (tab container)
│   │       ├── timeline/          # Timeline tab
│   │       ├── conditions/        # Conditions tab
│   │       ├── medications/       # Medications tab
│   │       ├── labs/              # Lab results tab
│   │       └── care-gaps/         # Patient-specific care gaps
│   │
│   ├── hl7-inspector/
│   │   └── page.tsx               # HL7v2 Message Inspector
│   │
│   ├── ai-query/
│   │   └── page.tsx               # Natural Language → FHIR Query
│   │
│   └── care-gaps/
│       └── page.tsx               # Population-level care gap dashboard
│
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── PatientTable.tsx           # Sortable, filterable patient roster
│   ├── PatientTimeline.tsx        # Vertical timeline (encounters, labs, meds)
│   ├── HL7MessageViewer.tsx       # Raw ↔ Parsed ↔ FHIR three-panel view
│   ├── HL7SegmentHighlighter.tsx  # Syntax highlighting for HL7v2 messages
│   ├── FHIRResourceCard.tsx       # Generic FHIR resource renderer
│   ├── CareGapBadge.tsx           # Severity-colored alert badge
│   ├── CareGapPanel.tsx           # List of gaps for a patient
│   ├── DrugInteractionAlert.tsx   # Medication interaction warnings
│   ├── ClinicalSummaryCard.tsx    # AI-generated summary display
│   ├── NLQueryInput.tsx           # Natural language search input + results
│   └── FHIRJsonViewer.tsx         # Collapsible JSON tree for FHIR resources
│
├── lib/
│   ├── api.ts                     # API client (typed fetch wrappers)
│   └── fhir-helpers.ts            # FHIR display utilities (format names, dates, codes)
│
├── tailwind.config.ts
└── next.config.js
```

### 8.2 Page: Patient Roster (`/patients`)

| Element           | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| Search bar        | Search by name, ID, or condition (debounced, hits `/api/fhir/patients`) |
| Patient table     | Name, DOB, Gender, Active Conditions (badges), # Care Gaps (red badge)  |
| Filters           | Gender, age range, has care gaps (boolean)                              |
| Row click         | Navigate to `/patients/{id}`                                            |
| Pagination        | Cursor-based (FHIR Bundle pagination)                                   |
| AI query shortcut | Small input at top: “Find patients with…” → routes to NL query          |

### 8.3 Page: Patient Detail (`/patients/[id]`)

**Tab: Timeline** (default)

- Vertical timeline component (Recharts or custom)
- Events: encounters (blue), lab results (green), medication changes (orange), condition onset (red)
- Each event expands to show FHIR resource details
- “AI Summary” button at top → calls `/api/ai/summarize/{id}` → renders in a card

**Tab: Conditions**

- Table: Condition name, SNOMED code, clinical status, onset date, verification status
- Each row expandable to show raw FHIR JSON

**Tab: Medications**

- Active medications: name, dosage, prescriber, start date, status
- “Check Interactions” button → calls `/api/ai/drug-interactions/{id}`
- Interaction results rendered as alert cards (color-coded by severity)

**Tab: Labs**

- Table: Lab name, LOINC code, value, unit, reference range, date
- Sparkline trend for repeated labs (e.g., HbA1c over time)
- Abnormal values highlighted in red

**Tab: Care Gaps**

- List of care gap alerts for this patient
- Each gap: description, severity badge, days overdue, triggering condition
- “Refresh” button to re-evaluate

### 8.4 Page: HL7v2 Inspector (`/hl7-inspector`)

**Three-panel layout** (this is the hero screen for HL7/FHIR knowledge):

```
┌──────────────────┬───────────────────┬──────────────────┐
│                  │                   │                  │
│  RAW HL7v2       │  PARSED JSON      │  FHIR R4 BUNDLE  │
│                  │                   │                  │
│  (editable       │  (structured      │  (generated      │
│   textarea with  │   tree view,      │   FHIR resources │
│   syntax         │   segments        │   with resource  │
│   highlighting)  │   highlighted)    │   type badges)   │
│                  │                   │                  │
├──────────────────┴───────────────────┴──────────────────┤
│                                                         │
│  AI EXPLANATION                                         │
│  "This is a patient admission message (ADT^A01).        │
│   John A. Doe, born Jan 15 1985, was admitted to the    │
│   surgical ward under Dr. John Smith on Sept 1, 2023.   │
│   The patient's spouse Jane Doe is listed as next of    │
│   kin..."                                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features**:

- Dropdown to load sample messages (ADT^A01, ORU^R01, etc.)
- Paste your own HL7v2 message
- Real-time parse on input (debounced)
- Click a segment in the parsed panel → highlights corresponding lines in raw + FHIR
- “Transform to FHIR” button → shows the mapped Bundle
- “Explain” button → AI-generated plain-English explanation
- Copy buttons on each panel

### 8.5 Page: AI Query Console (`/ai-query`)

- Large input: “Find patients with uncontrolled diabetes and no recent eye exam”
- On submit:

1. Shows the generated FHIR search URL
1. Shows the AI’s explanation of the query strategy
1. Executes the query against HAPI FHIR
1. Renders results in a patient table

- Query history sidebar (from `ai_query_log` table)

### 8.6 Page: Care Gap Dashboard (`/care-gaps`)

- Population-level stats: total patients evaluated, total gaps found, gaps by type (bar chart)
- Breakdown by severity (donut chart)
- Table: patients with most gaps (sortable)
- Click patient → navigates to patient detail care gaps tab

---

## 9. Implementation Sequence

Build in this order — each phase produces a demoable increment:

### Phase 1: Foundation (Days 1-3)

```
□ Initialize monorepo: /backend (FastAPI) + /frontend (Next.js)
□ Docker Compose: postgres + backend + frontend
□ Backend: FastAPI skeleton with health check
□ Backend: SQLAlchemy models + Alembic migrations
□ Backend: FHIRClient service — basic GET requests to HAPI FHIR
□ Backend: /api/fhir/patients endpoint (list + single)
□ Frontend: Next.js App Router skeleton + layout with sidebar nav
□ Frontend: Patient Roster page — table showing patients from HAPI FHIR
□ Milestone: Can browse real FHIR patients in a table ✓
```

### Phase 2: Patient Detail + FHIR Depth (Days 4-6)

```
□ Backend: /api/fhir/patients/{id}/everything + individual resource endpoints
□ Backend: FHIR cache layer (Postgres) — avoid redundant HAPI calls
□ Backend: /api/fhir/patients/{id}/timeline — aggregate + sort all resources by date
□ Frontend: Patient Detail page with tabs
□ Frontend: Timeline component (vertical, color-coded by resource type)
□ Frontend: Conditions, Medications, Labs tabs — each with tables
□ Frontend: FHIRJsonViewer component — collapsible raw JSON
□ Frontend: Lab sparklines for trending values
□ Milestone: Full patient drill-down with real FHIR data ✓
```

### Phase 3: HL7v2 Inspector (Days 7-9)

```
□ Backend: HL7Parser service — parse raw HL7v2 into structured JSON
□ Backend: HL7ToFHIRTransformer — map segments to FHIR resources
□ Backend: /api/hl7/parse and /api/hl7/transform endpoints
□ Backend: Bundle sample HL7v2 messages in /data/sample_hl7/
□ Backend: /api/hl7/samples endpoint
□ Frontend: HL7 Inspector page — three-panel layout
□ Frontend: HL7SegmentHighlighter — syntax coloring for pipe-delimited messages
□ Frontend: Segment-to-panel linking (click segment → highlight in other panels)
□ Frontend: Sample message dropdown loader
□ Milestone: Paste HL7v2 → see parsed + FHIR + highlighted ✓
```

### Phase 4: AI Layer (Days 10-12)

```
□ Backend: AIService — Claude API integration with clinical system prompts
□ Backend: /api/ai/summarize/{patient_id} — generates clinical summary
□ Backend: /api/ai/explain-hl7 — plain-English HL7 explanation
□ Backend: /api/ai/query — NL→FHIR query translator + executor
□ Backend: /api/ai/drug-interactions/{patient_id}
□ Frontend: "AI Summary" button on Patient Detail → renders summary card
□ Frontend: AI explanation panel on HL7 Inspector
□ Frontend: AI Query Console page — input, generated URL, explanation, results
□ Frontend: Drug interaction alerts on Medications tab
□ Milestone: AI features working across all pages ✓
```

### Phase 5: Care Gap Engine (Days 13-14)

```
□ Backend: CareGapEngine — rule definitions + evaluation logic
□ Backend: /api/care-gaps/* endpoints
□ Frontend: Care gap badges on Patient Roster (red count)
□ Frontend: Care Gaps tab on Patient Detail
□ Frontend: Population Care Gap Dashboard — charts + tables
□ Milestone: Clinical decision support layer complete ✓
```

### Phase 6: Polish + Deploy (Days 15-16)

```
□ Error handling: loading states, error boundaries, empty states
□ Responsive design pass (mobile-friendly)
□ README with screenshots, architecture diagram, setup instructions
□ Docker Compose one-command startup: `docker compose up`
□ Deploy to Railway / Render / Fly.io (optional but recommended)
□ Record a 2-minute demo video / GIF walkthrough
□ Add to ashmitb.dev portfolio
□ Milestone: Portfolio-ready, demoable project ✓
```

---

## 10. Environment Variables

```env
# Backend (.env)
DATABASE_URL=postgresql+asyncpg://caresync:caresync@localhost:5432/caresync
HAPI_FHIR_BASE_URL=https://hapi.fhir.org/baseR4
ANTHROPIC_API_KEY=sk-ant-...
FHIR_CACHE_TTL_SECONDS=3600
OPENFDA_API_KEY=             # Optional

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 11. Docker Compose

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: caresync
      POSTGRES_USER: caresync
      POSTGRES_PASSWORD: caresync
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://caresync:caresync@db:5432/caresync
      HAPI_FHIR_BASE_URL: https://hapi.fhir.org/baseR4
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000

volumes:
  pgdata:
```

---

## 12. Key Libraries (requirements.txt)

```
# Backend
fastapi==0.115.*
uvicorn[standard]==0.32.*
sqlalchemy[asyncio]==2.0.*
asyncpg==0.30.*
alembic==1.14.*
httpx==0.28.*                  # Async HTTP client for HAPI FHIR
python-hl7==0.4.*              # HL7v2 parser
fhir.resources==7.1.*          # FHIR R4 Pydantic models (validation)
anthropic==0.52.*              # Claude API
pydantic==2.10.*
pydantic-settings==2.7.*
python-dotenv==1.0.*
```

```
# Frontend (package.json key deps)
next: 14.*
react: 18.*
tailwindcss: 3.*
@shadcn/ui
swr or @tanstack/react-query
recharts
date-fns
lucide-react
```

---

## 13. What This Demonstrates to an Interviewer

| Standard            | Where It’s Shown                                                                  |
| ------------------- | --------------------------------------------------------------------------------- |
| **FHIR R4**         | Every patient data screen. REST queries, Bundle parsing, resource rendering.      |
| **HL7v2**           | Inspector page. Raw parsing, segment extraction, real message types.              |
| **EMR/EHR**         | Care gap engine, clinical rules, patient timeline — all EHR-native concepts.      |
| **AI + Healthcare** | Clinical summarization, NL→FHIR, drug interactions — applied AI on clinical data. |
| **Python**          | Entire backend is FastAPI/Python — mandatory per job listing.                     |
| **System Design**   | Caching layer, async operations, service separation, typed models.                |

---

## 14. Stretch Goals (If Time Permits)

- **SMART on FHIR auth flow**: Mock OAuth2 flow demonstrating SMART launch context
- **CDS Hooks**: Implement a simple CDS Hooks service (e.g., medication prescribe hook)
- **Bulk Data Export**: FHIR Bulk Data ($export) with ndjson processing pipeline
- **Multi-tenant**: Simulate multiple “clinics” with tenant isolation
- **WebSocket**: Real-time HL7v2 message feed simulation (messages appearing in a live feed)
- **FHIR Subscription**: Implement FHIR R5 Subscription for resource change notifications

---

_Last updated: March 2026_
_Target: RhythmX AI — Full Stack Software Engineer (Backend)_
