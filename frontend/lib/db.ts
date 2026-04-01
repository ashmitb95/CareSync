/**
 * CareSync — Turso persistence layer
 * Uses @libsql/client with the HTTP protocol — no native bindings,
 * works in Next.js API routes and on Vercel Edge-compatible runtimes.
 * All operations are silent no-ops when TURSO_DATABASE_URL is not set.
 */

import { createClient, type Client } from "@libsql/client/http";

let _client: Client | null = null;

function getClient(): Client | null {
  if (!process.env.TURSO_DATABASE_URL) return null;
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export async function initDb(): Promise<void> {
  const db = getClient();
  if (!db) return;
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS hl7_messages (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_message   TEXT    NOT NULL,
      message_type  TEXT    NOT NULL,
      parsed_json   TEXT    NOT NULL,
      fhir_bundle   TEXT,
      created_at    TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS care_gaps (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id     TEXT NOT NULL,
      gap_type       TEXT NOT NULL,
      description    TEXT NOT NULL,
      severity       TEXT DEFAULT 'medium',
      condition_code TEXT,
      last_checked   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      resolved       INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_care_gaps_patient ON care_gaps(patient_id);
    CREATE TABLE IF NOT EXISTS ai_query_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      query_type    TEXT NOT NULL,
      patient_id    TEXT,
      input_summary TEXT,
      created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);
}

export async function logHl7Message(
  raw: string,
  messageType: string,
  parsed: object,
  fhirBundle?: object
): Promise<void> {
  const db = getClient();
  if (!db) return;
  try {
    await db.execute({
      sql: "INSERT INTO hl7_messages (raw_message, message_type, parsed_json, fhir_bundle) VALUES (?, ?, ?, ?)",
      args: [raw, messageType, JSON.stringify(parsed), fhirBundle ? JSON.stringify(fhirBundle) : null],
    });
  } catch {
    // Non-fatal — don't break the API response
  }
}

export async function getHl7History(limit = 20): Promise<object[]> {
  const db = getClient();
  if (!db) return [];
  try {
    const result = await db.execute({
      sql: "SELECT id, message_type, parsed_json, created_at FROM hl7_messages ORDER BY id DESC LIMIT ?",
      args: [limit],
    });
    return result.rows.map((r) => ({
      id: r.id,
      messageType: r.message_type,
      parsed: JSON.parse(r.parsed_json as string),
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export async function logAiQuery(
  queryType: string,
  patientId?: string,
  inputSummary?: string
): Promise<void> {
  const db = getClient();
  if (!db) return;
  try {
    await db.execute({
      sql: "INSERT INTO ai_query_log (query_type, patient_id, input_summary) VALUES (?, ?, ?)",
      args: [queryType, patientId ?? null, inputSummary ?? null],
    });
  } catch {
    // Non-fatal
  }
}
