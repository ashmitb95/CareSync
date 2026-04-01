import { NextRequest } from "next/server";

const HAPI_BASE = "https://hapi.fhir.org/baseR4";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // Seed patient passthrough
  if (id.startsWith("seed-")) {
    const seedPatients = (await import("@/data/seed-patients.json")).default;
    const patient = (seedPatients as unknown[]).find((p: unknown) => (p as { id: string }).id === id);
    if (patient) return Response.json(patient);
  }

  try {
    const res = await fetch(`${HAPI_BASE}/Patient/${id}`, {
      headers: { Accept: "application/fhir+json" },
    });
    if (!res.ok) throw new Error(`HAPI ${res.status}`);
    return Response.json(await res.json());
  } catch {
    return Response.json({ error: "Patient not found" }, { status: 404 });
  }
}
