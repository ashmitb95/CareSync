import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query) return Response.json({ error: "query required" }, { status: 400 });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system:
      "You are a FHIR R4 search query translator. Convert natural language clinical queries to FHIR search URLs. " +
      "Available resource types: Patient, Condition, Observation, MedicationRequest, Encounter, AllergyIntolerance. " +
      "Respond ONLY with valid JSON in this exact format: " +
      '{"fhirUrl": "/ResourceType?param=value&_count=20", "explanation": "one sentence explaining the query strategy"}',
    messages: [{ role: "user", content: query }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  let parsed: { fhirUrl: string; explanation: string } = { fhirUrl: "", explanation: "" };
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = { fhirUrl: "/Patient?_count=20", explanation: "Showing all patients" };
  }

  // Execute the query against HAPI FHIR
  const HAPI_BASE = "https://hapi.fhir.org/baseR4";
  let patients: object[] = [];
  try {
    const fhirRes = await fetch(`${HAPI_BASE}${parsed.fhirUrl}`, {
      headers: { Accept: "application/fhir+json" },
    });
    if (fhirRes.ok) {
      const bundle = await fhirRes.json();
      patients = (bundle.entry ?? [])
        .map((e: { resource: object }) => e.resource)
        .filter((r: { resourceType: string }) => r.resourceType === "Patient");
    }
  } catch {
    // Return empty patients if HAPI is unreachable
  }

  return Response.json({ fhirUrl: parsed.fhirUrl, explanation: parsed.explanation, patients });
}
