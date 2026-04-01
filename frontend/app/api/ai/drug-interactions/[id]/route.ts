import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const base = new URL(req.url).origin;

  const medsRes = await fetch(`${base}/api/fhir/patients/${id}/medications`);
  const medications = await medsRes.json();

  if (!medications.length) {
    return Response.json({ interactions: [] });
  }

  const medNames = medications.map((m: { medicationCodeableConcept?: { text?: string } }) =>
    m.medicationCodeableConcept?.text ?? "Unknown"
  );

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system:
      "You are a clinical pharmacist analyzing drug interactions. " +
      "Given a list of active medications, identify clinically significant drug-drug interactions. " +
      "Respond ONLY with valid JSON: an array of interaction objects. " +
      "Each object: {\"drug1\": string, \"drug2\": string, \"severity\": \"minor\"|\"moderate\"|\"major\", \"description\": string}. " +
      "Only report interactions with clinical significance. If none found, return an empty array [].",
    messages: [
      {
        role: "user",
        content: `Analyze these active medications for drug interactions:\n${medNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n")}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  let interactions = [];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) interactions = JSON.parse(jsonMatch[0]);
  } catch {
    interactions = [];
  }

  return Response.json({ interactions });
}
