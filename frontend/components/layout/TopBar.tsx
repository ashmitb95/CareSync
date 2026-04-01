"use client";

import { Bell, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/patients?q=${encodeURIComponent(search.trim())}`);
    }
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-6 py-3"
      style={{
        backgroundColor: "var(--cs-surface)",
        borderBottom: "1px solid var(--cs-border)",
        boxShadow: "var(--cs-shadow-xs)",
      }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold leading-tight truncate" style={{ color: "var(--cs-text)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--cs-text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Global search */}
      <form onSubmit={handleSearch} className="hidden md:flex items-center">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--cs-text-muted)" }}
          />
          <input
            className="cs-input pl-9 w-56 text-sm"
            style={{ fontSize: "0.8125rem" }}
            placeholder="Search patients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      {/* Actions slot */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Notification bell */}
      <button
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: "var(--cs-text-secondary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cs-surface-2)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <Bell size={16} strokeWidth={2} />
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--cs-danger)" }}
        />
      </button>

      {/* Avatar */}
      <div
        className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold cursor-pointer select-none"
        style={{ backgroundColor: "var(--cs-primary)" }}
      >
        DR
      </div>
    </header>
  );
}
