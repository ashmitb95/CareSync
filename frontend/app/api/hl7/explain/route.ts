import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { raw } = await req.json();
  if (!raw) return Response.json({ error: "raw message required" }, { status: 400 });

  const base = new URL(req.url).origin;
  const parseRes = await fetch(`${base}/api/hl7/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const parsed = await parseRes.json();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system:
      "You are a healthcare integration engineer explaining HL7v2 messages to clinicians and developers. " +
      "Be concise but complete. Explain what the message means clinically, highlight key patient information, " +
      "and explain what each relevant segment means in plain English. Use bullet points for clarity.",
    messages: [
      {
        role: "user",
        content: `Explain this HL7v2 message in plain English:\n\nRaw message:\n${raw}\n\nParsed segments:\n${JSON.stringify(parsed.segments, null, 2)}`,
      },
    ],
  });

  const explanation = message.content[0].type === "text" ? message.content[0].text : "";
  return Response.json({ explanation });
}
