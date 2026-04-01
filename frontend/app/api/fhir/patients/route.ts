import { NextRequest } from "next/server";
import seedPatients from "@/data/seed-patients.json";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name") ?? "";

  const filtered = name
    ? (seedPatients as unknown as Array<{ name: Array<{ family: string; given: string[] }> }>).filter((p) => {
        const n = p.name?.[0];
        const full = `${n?.given?.join(" ")} ${n?.family}`.toLowerCase();
        return full.includes(name.toLowerCase());
      })
    : seedPatients;

  return Response.json({
    patients: filtered,
    total: filtered.length,
    nextUrl: null,
    _source: "seed",
  });
}
