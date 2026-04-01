"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Terminal,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  RefreshCw,
  FileCode,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { FHIRJsonViewer } from "@/components/FHIRJsonViewer";
import { hl7Api, type HL7SampleMessage, type HL7ParseResult } from "@/lib/api";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1.5 rounded hover:bg-[var(--cs-surface-2)] transition-colors"
      style={{ color: "var(--cs-text-muted)" }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function HL7RawPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
        style={{
          backgroundColor: "var(--cs-nav-bg)",
          borderColor: "var(--cs-nav-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={13} style={{ color: "var(--cs-primary)" }} />
          <span className="text-xs font-semibold text-white">RAW HL7v2</span>
        </div>
        <CopyButton text={value} />
      </div>
      <textarea
        className="flex-1 p-4 resize-none outline-none text-xs font-mono leading-relaxed"
        style={{
          backgroundColor: "#0d1117",
          color: "#e6edf3",
          fontFamily: "var(--font-geist-mono)",
          caretColor: "var(--cs-primary)",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste an HL7v2 message or select a sample above…"
        spellCheck={false}
      />
    </div>
  );
}

function SegmentRow({ name, fields }: { name: string; fields: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(fields).filter(([, v]) => v);

  return (
    <div className="border-b last:border-0" style={{ borderColor: "var(--cs-border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--cs-surface-2)] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-bold font-mono px-2 py-0.5 rounded"
            style={{
              backgroundColor: "var(--cs-primary-muted)",
              color: "var(--cs-primary-dark)",
            }}
          >
            {name}
          </span>
          <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
            {entries.length} fields
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--cs-text-muted)" }}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1">
          {entries.map(([key, val]) => (
            <div key={key} className="flex items-start gap-3 text-xs">
              <span
                className="shrink-0 w-36 font-medium truncate"
                style={{ color: "var(--cs-text-secondary)" }}
              >
                {key.replace(/_/g, " ")}
              </span>
              <span
                className="font-mono break-all"
                style={{ color: "var(--cs-text)" }}
              >
                {val}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ParsedPanel({ parsed }: { parsed: HL7ParseResult | null }) {
  if (!parsed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <FileCode size={32} style={{ color: "var(--cs-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--cs-text-muted)" }}>
          Parsed JSON will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0"
        style={{ borderColor: "var(--cs-border)", backgroundColor: "var(--cs-surface-2)" }}
      >
        <Badge variant="primary" size="sm">{parsed.messageType}</Badge>
        <span className="text-xs" style={{ color: "var(--cs-text-muted)" }}>
          {parsed.timestamp}
        </span>
      </div>
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cs-border)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--cs-text)" }}>
          {parsed.summary}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {parsed.segmentList.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--cs-surface-2)", color: "var(--cs-text-secondary)", border: "1px solid var(--cs-border)" }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {parsed.segmentList.map((name, i) =>
          parsed.segments[name] ? (
            <SegmentRow key={`${name}-${i}`} name={name} fields={parsed.segments[name]} />
          ) : null
        )}
      </div>
    </div>
  );
}

export default function HL7InspectorPage() {
  const [raw, setRaw] = useState("");
  const [selectedSample, setSelectedSample] = useState("");

  const { data: samples } = useQuery({
    queryKey: ["hl7-samples"],
    queryFn: hl7Api.getSamples,
  });

  const parseMutation = useMutation({
    mutationFn: (rawMsg: string) => hl7Api.parse(rawMsg),
  });

  const transformMutation = useMutation({
    mutationFn: (rawMsg: string) => hl7Api.transform(rawMsg),
  });

  const explainMutation = useMutation({
    mutationFn: (rawMsg: string) => hl7Api.explain(rawMsg),
  });

  const handleParse = useCallback(() => {
    if (raw.trim()) parseMutation.mutate(raw);
  }, [raw, parseMutation]);

  const handleTransform = useCallback(() => {
    if (raw.trim()) transformMutation.mutate(raw);
  }, [raw, transformMutation]);

  const handleExplain = useCallback(() => {
    if (raw.trim()) explainMutation.mutate(raw);
  }, [raw, explainMutation]);

  const handleSampleSelect = (type: string) => {
    setSelectedSample(type);
    const sample = samples?.find((s: HL7SampleMessage) => s.type === type);
    if (sample) {
      setRaw(sample.raw.replace(/\\r/g, "\r"));
      parseMutation.reset();
      transformMutation.reset();
      explainMutation.reset();
    }
  };

  const parsed = parseMutation.data ?? transformMutation.data?.parsed ?? null;
  const fhirBundle = transformMutation.data?.fhirBundle ?? null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        title="HL7v2 Inspector"
        subtitle="Parse · Transform · Explain"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleParse}
              disabled={!raw.trim() || parseMutation.isPending}
              className="cs-btn-secondary text-xs flex items-center gap-1.5"
            >
              {parseMutation.isPending && <Spinner size="sm" />}
              Parse
            </button>
            <button
              onClick={handleTransform}
              disabled={!raw.trim() || transformMutation.isPending}
              className="cs-btn-secondary text-xs flex items-center gap-1.5"
            >
              {transformMutation.isPending && <Spinner size="sm" />}
              <FileCode size={12} />
              → FHIR
            </button>
            <button
              onClick={handleExplain}
              disabled={!raw.trim() || explainMutation.isPending}
              className="cs-btn-primary text-xs flex items-center gap-1.5"
            >
              {explainMutation.isPending ? <Spinner size="sm" /> : <Sparkles size={12} />}
              Explain
            </button>
          </div>
        }
      />

      <div className="flex-1 flex flex-col p-6 gap-4 min-h-0 overflow-hidden">
        {/* Sample selector */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-xs font-medium" style={{ color: "var(--cs-text-muted)" }}>
            Load sample:
          </span>
          {samples?.map((s: HL7SampleMessage) => (
            <button
              key={s.type}
              onClick={() => handleSampleSelect(s.type)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: selectedSample === s.type ? "var(--cs-primary)" : "var(--cs-surface)",
                color: selectedSample === s.type ? "#fff" : "var(--cs-text-secondary)",
                border: `1px solid ${selectedSample === s.type ? "transparent" : "var(--cs-border)"}`,
                boxShadow: "var(--cs-shadow-xs)",
              }}
            >
              {s.type}
            </button>
          ))}
        </div>

        {/* Three-panel layout */}
        <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          {/* Panel 1: Raw HL7 */}
          <div
            className="rounded-[var(--cs-radius)] overflow-hidden border"
            style={{ borderColor: "var(--cs-border)", boxShadow: "var(--cs-shadow-sm)" }}
          >
            <HL7RawPanel value={raw} onChange={(v) => {
              setRaw(v);
              parseMutation.reset();
              transformMutation.reset();
              explainMutation.reset();
            }} />
          </div>

          {/* Panel 2: Parsed JSON */}
          <div
            className="cs-card overflow-hidden"
            style={{ padding: 0 }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0"
              style={{ borderColor: "var(--cs-border)", backgroundColor: "var(--cs-surface-2)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cs-text-secondary)" }}>
                Parsed JSON
              </span>
              {parseMutation.isPending && <Spinner size="sm" />}
            </div>
            <div className="h-full overflow-hidden">
              <ParsedPanel parsed={parsed} />
            </div>
          </div>

          {/* Panel 3: FHIR Bundle */}
          <div
            className="cs-card overflow-hidden"
            style={{ padding: 0 }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
              style={{ borderColor: "var(--cs-border)", backgroundColor: "var(--cs-surface-2)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cs-text-secondary)" }}>
                FHIR R4 Bundle
              </span>
              {transformMutation.isPending && <Spinner size="sm" />}
            </div>
            <div className="p-4 overflow-auto h-full">
              {fhirBundle ? (
                <FHIRJsonViewer data={fhirBundle} title="FHIR Bundle" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <FileCode size={32} style={{ color: "var(--cs-text-muted)" }} />
                  <p className="text-sm text-center" style={{ color: "var(--cs-text-muted)" }}>
                    Click "→ FHIR" to transform
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Explanation panel */}
        {(explainMutation.data || explainMutation.isPending) && (
          <div
            className="cs-card shrink-0"
            style={{ borderColor: "color-mix(in srgb, var(--cs-primary) 30%, var(--cs-border))" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: "var(--cs-primary)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--cs-text)" }}>
                AI Explanation
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                style={{ backgroundColor: "var(--cs-primary)" }}
              >
                Claude
              </span>
            </div>
            {explainMutation.isPending ? (
              <div className="flex items-center gap-3">
                <Spinner size="sm" />
                <span className="text-sm" style={{ color: "var(--cs-text-secondary)" }}>
                  Analyzing HL7 message…
                </span>
              </div>
            ) : (
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--cs-text)", lineHeight: "1.7" }}
              >
                {explainMutation.data?.explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
