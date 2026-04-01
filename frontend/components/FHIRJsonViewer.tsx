"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FHIRJsonViewerProps {
  data: unknown;
  title?: string;
  defaultExpanded?: boolean;
  maxDepth?: number;
}

function JsonNode({
  value,
  depth = 0,
  maxDepth = 6,
}: {
  value: unknown;
  depth?: number;
  maxDepth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (value === null) return <span style={{ color: "var(--cs-text-muted)" }}>null</span>;
  if (value === undefined) return <span style={{ color: "var(--cs-text-muted)" }}>undefined</span>;
  if (typeof value === "boolean")
    return <span style={{ color: "var(--cs-info)" }}>{value.toString()}</span>;
  if (typeof value === "number")
    return <span style={{ color: "var(--cs-success)" }}>{value}</span>;
  if (typeof value === "string")
    return <span style={{ color: "var(--cs-warning)" }}>"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--cs-text-muted)" }}>[]</span>;
    if (depth >= maxDepth) return <span style={{ color: "var(--cs-text-muted)" }}>[…{value.length}]</span>;
    return (
      <span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 hover:opacity-70"
          style={{ color: "var(--cs-text-secondary)" }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-xs">Array({value.length})</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l pl-2" style={{ borderColor: "var(--cs-border)" }}>
            {value.map((item, i) => (
              <div key={i} className="flex items-start gap-1 py-0.5">
                <span className="text-xs shrink-0" style={{ color: "var(--cs-text-muted)" }}>{i}:</span>
                <JsonNode value={item} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span style={{ color: "var(--cs-text-muted)" }}>{"{}"}</span>;
    if (depth >= maxDepth) return <span style={{ color: "var(--cs-text-muted)" }}>{`{…${entries.length}}`}</span>;
    return (
      <span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 hover:opacity-70"
          style={{ color: "var(--cs-text-secondary)" }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-xs">{`{${entries.length} keys}`}</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l pl-2" style={{ borderColor: "var(--cs-border)" }}>
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-start gap-1.5 py-0.5">
                <span className="text-xs font-medium shrink-0" style={{ color: "var(--cs-primary)" }}>
                  {key}:
                </span>
                <JsonNode value={val} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

export function FHIRJsonViewer({ data, title, defaultExpanded = true, maxDepth = 6 }: FHIRJsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [raw, setRaw] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="cs-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--cs-border)", backgroundColor: "var(--cs-surface-2)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cs-text-secondary)" }}>
          {title ?? "FHIR JSON"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRaw(!raw)}
            className={cn(
              "text-xs px-2 py-1 rounded transition-colors",
              raw
                ? "bg-[var(--cs-primary)] text-white"
                : "text-[var(--cs-text-secondary)] hover:bg-[var(--cs-surface-2)]"
            )}
          >
            {raw ? "Tree" : "Raw"}
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-[var(--cs-surface-2)] transition-colors"
            style={{ color: "var(--cs-text-secondary)" }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-auto max-h-96">
        {raw ? (
          <pre
            className="text-xs leading-relaxed font-mono"
            style={{ color: "var(--cs-text)", fontFamily: "var(--font-geist-mono)" }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div className="text-xs leading-relaxed font-mono" style={{ fontFamily: "var(--font-geist-mono)" }}>
            <JsonNode value={data} depth={0} maxDepth={maxDepth} />
          </div>
        )}
      </div>
    </div>
  );
}
